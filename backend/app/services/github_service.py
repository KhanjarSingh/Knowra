import requests
from fastapi import HTTPException
from db.vector_store import add_chunks
from utils.chunker import chunk_text
from config import GITHUB_TOKEN
SUPPORTED_EXTENSIONS = {".py", ".js", ".ts", ".md", ".txt", ".html", ".css", ".json", ".go", ".java", ".rs", ".cpp", ".c"}
def get_headers():
    headers = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    return headers
def parse_repo_url(repo_url: str):
    parts = repo_url.rstrip("/").split("/")
    owner = parts[-2]
    repo = parts[-1].replace(".git", "")
    return owner, repo
def get_repo_files(owner: str, repo: str, path: str = "") -> list:
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    response = requests.get(url, headers=get_headers(), timeout=15)
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Repo not found: {owner}/{repo}")
    if response.status_code == 403:
        raise HTTPException(status_code=403, detail="GitHub API rate limit hit. Set GITHUB_TOKEN in .env to increase limits.")
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"GitHub API error: {response.status_code} {response.text[:200]}")
    items = response.json()
    files = []
    EXCLUDED_DIRS = {"faiss_store", "node_modules", "dist", "build", "venv", ".git", ".next", "out", "coverage", ".idea", "__pycache__"}
    EXCLUDED_FILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "Pipfile.lock", ".DS_Store"}
    for item in items:
        if item["type"] == "file":
            if item["name"] in EXCLUDED_FILES:
                continue
            ext = "." + item["name"].rsplit(".", 1)[-1] if "." in item["name"] else ""
            if ext in SUPPORTED_EXTENSIONS:
                files.append(item)
        elif item["type"] == "dir":
            if item["name"] in EXCLUDED_DIRS:
                continue
            try:
                files.extend(get_repo_files(owner, repo, item["path"]))
            except HTTPException:
                pass
    return files
def fetch_file_content(download_url: str) -> str:
    response = requests.get(download_url, headers=get_headers(), timeout=15)
    if response.status_code == 200:
        return response.text
    return ""
def ingest_repo(repo_url: str) -> int:
    owner, repo = parse_repo_url(repo_url)
    files = get_repo_files(owner, repo)
    if not files:
        raise HTTPException(status_code=422, detail="No supported files found in repo.")
    total_chunks = 0
    for file in files:
        content = fetch_file_content(file["download_url"])
        if not content.strip():
            continue
        file_chunks = chunk_text(content, file["path"])
        add_chunks(file_chunks)
        total_chunks += len(file_chunks)
    return total_chunks