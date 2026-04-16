import os
import PyPDF2
from db.vector_store import add_chunks
from services.job_service import update_current_job
from utils.chunker import chunk_text


MAX_INGEST_CHARS = 1_500_000


def read_pdf(file_path: str) -> str:
    text = ""
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        total_pages = len(reader.pages)
        update_current_job(progress_current=0, progress_total=total_pages, progress_message="Reading PDF pages")
        for page_index, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            links = []
            if "/Annots" in page:
                try:
                    for annot in page["/Annots"]:
                        obj = annot.get_object()
                        if obj.get("/Subtype") == "/Link" and "/A" in obj:
                            action = obj["/A"]
                            if "/URI" in action:
                                links.append(f"[Hyperlink Reference: {action['/URI']}]")
                except Exception:
                    pass
            if links:
                page_text += f"\n\nPage {page_index + 1} Links:\n" + "\n".join(links)
            text += page_text + "\n"
            if (page_index + 1) % 3 == 0 or page_index + 1 == total_pages:
                update_current_job(
                    progress_current=page_index + 1,
                    progress_total=total_pages,
                    progress_message=f"Read {page_index + 1}/{total_pages} pages",
                )
    return text
def read_text_file(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()
def ingest_file(file_path: str) -> int:
    update_current_job(progress_message="Preparing file ingestion")
    ext = os.path.splitext(file_path)[-1].lower()
    if ext == ".pdf":
        text = read_pdf(file_path)
    elif ext in [".txt", ".md", ".py", ".js", ".ts", ".html", ".css", ".json"]:
        text = read_text_file(file_path)
    else:
        text = read_text_file(file_path)
    if len(text) > MAX_INGEST_CHARS:
        text = text[:MAX_INGEST_CHARS]
    if not text.strip():
        return 0
    update_current_job(progress_message="Chunking content")
    chunks = chunk_text(text, os.path.basename(file_path))
    total = len(chunks)
    if total == 0:
        return 0

    update_current_job(progress_current=0, progress_total=total, progress_message="Indexing chunks")
    batch_size = 24
    processed = 0
    for start in range(0, total, batch_size):
        batch = chunks[start : start + batch_size]
        add_chunks(batch)
        processed += len(batch)
        update_current_job(
            progress_current=processed,
            progress_total=total,
            chunks_added=processed,
            progress_message=f"Indexed {processed}/{total} chunks",
        )
    return total
