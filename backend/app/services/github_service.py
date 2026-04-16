from urllib.parse import urlparse

import requests
from fastapi import HTTPException

from config import GITHUB_TOKEN
from db.vector_store import add_chunks
from utils.chunker import chunk_text

SUPPORTED_EXTENSIONS = {
    ".py",
    ".js",
    ".ts",
    ".md",
    ".txt",
    ".html",
    ".css",
    ".json",
    ".go",
    ".java",
    ".rs",
    ".cpp",
    ".c",
    ".tsx",
    ".jsx",
}
EXCLUDED_DIRS = {
    "faiss_store",
    "node_modules",
    "dist",
    "build",
    "venv",
    ".git",
    ".next",
    "out",
    "coverage",
    ".idea",
    "__pycache__",
    ".venv",
}
EXCLUDED_FILES = {
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "poetry.lock",
    "Pipfile.lock",
    ".DS_Store",
}
MAX_FILES = 400


def get_headers() -> dict[str, str]:
    headers = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    return headers


def parse_repo_url(repo_url: str) -> tuple[str, str]:
    parsed = urlparse(repo_url.strip())
    if parsed.netloc not in {"github.com", "www.github.com"}:
        raise HTTPException(status_code=422, detail="Only github.com repository URLs are supported.")

    path_parts = [part for part in parsed.path.split("/") if part]
    if len(path_parts) < 2:
        raise HTTPException(status_code=422, detail="Invalid GitHub repository URL format.")

    owner = path_parts[0]
    repo = path_parts[1].replace(".git", "")
    return owner, repo


def _repo_contents(owner: str, repo: str, path: str = "") -> list[dict]:
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    response = requests.get(url, headers=get_headers(), timeout=20)

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Repo not found: {owner}/{repo}")
    if response.status_code == 403:
        raise HTTPException(
            status_code=403,
            detail="GitHub API rate limit reached. Configure GITHUB_TOKEN to increase limits.",
        )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"GitHub API error: {response.status_code}")

    payload = response.json()
    if isinstance(payload, dict):
        return [payload]
    return payload


def get_repo_files(owner: str, repo: str, path: str = "", found: int = 0) -> list[dict]:
    items = _repo_contents(owner, repo, path)
    files: list[dict] = []

    for item in items:
        if found + len(files) >= MAX_FILES:
            return files

        item_type = item.get("type")
        name = item.get("name", "")
        item_path = item.get("path", "")

        if item_type == "file":
            if name in EXCLUDED_FILES:
                continue
            ext = "." + name.rsplit(".", 1)[-1] if "." in name else ""
            if ext in SUPPORTED_EXTENSIONS:
                files.append(item)
            continue

        if item_type == "dir" and name not in EXCLUDED_DIRS:
            try:
                nested = get_repo_files(owner, repo, item_path, found + len(files))
                files.extend(nested)
            except HTTPException:
                continue

    return files


def fetch_file_content(download_url: str) -> str:
    response = requests.get(download_url, headers=get_headers(), timeout=20)
    if response.status_code == 200:
        return response.text
    return ""


def ingest_repo(repo_url: str) -> int:
    owner, repo = parse_repo_url(repo_url)
    files = get_repo_files(owner, repo)
    if not files:
        raise HTTPException(status_code=422, detail="No supported files found in the repository.")

    total_chunks = 0
    chunk_buffer: list[str] = []
    chunk_flush_threshold = 120

    for file in files:
        content = fetch_file_content(file["download_url"])
        if not content.strip():
            continue

        file_chunks = chunk_text(content, file["path"])
        if not file_chunks:
            continue

        chunk_buffer.extend(file_chunks)
        total_chunks += len(file_chunks)

        if len(chunk_buffer) >= chunk_flush_threshold:
            add_chunks(chunk_buffer)
            chunk_buffer.clear()

    if chunk_buffer:
        add_chunks(chunk_buffer)

    return total_chunks
