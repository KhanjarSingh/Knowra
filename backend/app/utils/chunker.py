def chunk_text(text: str, source_name: str, chunk_size: int = 1500, overlap: int = 200) -> list:
    if chunk_size <= 0:
        return []
    if overlap >= chunk_size:
        overlap = max(0, chunk_size // 4)

    chunks = []
    start = 0
    text = text.replace('\r', '')
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(f"[Source: {source_name}]\n{chunk}")
        start = end - overlap
    return [c for c in chunks if c.strip()]
