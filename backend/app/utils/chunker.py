def chunk_text(text: str, source_name: str, chunk_size: int = 500, overlap: int = 50) -> list:
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(f"[Source: {source_name}]\n{chunk}")
        start = end - overlap

    return [c for c in chunks if c.strip()]
