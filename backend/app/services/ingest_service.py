import os
import PyPDF2
from db.vector_store import add_chunks
from utils.chunker import chunk_text

def read_pdf(file_path: str) -> str:
    text = ""
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def read_text_file(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

def ingest_file(file_path: str) -> int:
    ext = os.path.splitext(file_path)[-1].lower()

    if ext == ".pdf":
        text = read_pdf(file_path)
    elif ext in [".txt", ".md", ".py", ".js", ".ts", ".html", ".css", ".json"]:
        text = read_text_file(file_path)
    else:
        text = read_text_file(file_path)

    if not text.strip():
        return 0

    chunks = chunk_text(text)
    add_chunks(chunks)
    return len(chunks)
