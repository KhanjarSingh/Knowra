import json
import os
import threading

import numpy as np

from config import FAISS_INDEX_PATH
from services.embedding_service import get_embeddings

dimension = 384
index = None
chunks = []
_loaded = False
_lock = threading.Lock()

base_dir = os.path.abspath(FAISS_INDEX_PATH)
index_file = os.path.join(base_dir, "index.bin")
chunks_file = os.path.join(base_dir, "chunks.json")


def load() -> None:
    global index, chunks, _loaded
    if _loaded:
        return

    import faiss

    if os.path.exists(index_file) and os.path.exists(chunks_file):
        index = faiss.read_index(index_file)
        with open(chunks_file, "r", encoding="utf-8") as infile:
            chunks = json.load(infile)
        print(f"Loaded {len(chunks)} chunks")
    else:
        index = faiss.IndexFlatL2(dimension)
    _loaded = True


def save() -> None:
    import faiss

    os.makedirs(base_dir, exist_ok=True)
    faiss.write_index(index, index_file)
    with open(chunks_file, "w", encoding="utf-8") as outfile:
        json.dump(chunks, outfile)


def add_chunks(texts: list[str]) -> None:
    if not texts:
        return

    with _lock:
        load()
        embeddings = get_embeddings(texts)
        vectors = np.array(embeddings, dtype="float32")
        index.add(vectors)
        chunks.extend(texts)
        save()


def search(query_embedding: list[float], top_k: int = 5) -> list[str]:
    with _lock:
        load()
        if index is None or index.ntotal == 0:
            return []

        vector = np.array([query_embedding], dtype="float32")
        k = min(top_k, index.ntotal)
        distances, indices = index.search(vector, k)

        results = []
        for idx in indices[0]:
            if idx != -1 and idx < len(chunks):
                results.append(chunks[idx])
        return results


def get_chunk_count() -> int:
    with _lock:
        load()
        return index.ntotal if index else 0


def reset() -> None:
    global index, chunks, _loaded
    import faiss

    with _lock:
        index = faiss.IndexFlatL2(dimension)
        chunks = []
        _loaded = True
        if os.path.exists(index_file):
            os.remove(index_file)
        if os.path.exists(chunks_file):
            os.remove(chunks_file)
