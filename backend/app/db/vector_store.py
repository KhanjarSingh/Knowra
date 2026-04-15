import faiss
import numpy as np
import json
import os
from services.embedding_service import get_embeddings
from config import FAISS_INDEX_PATH
dimension = 384
index = faiss.IndexFlatL2(dimension)
chunks = []
base_dir = os.path.abspath(FAISS_INDEX_PATH)
index_file = os.path.join(base_dir, "index.bin")
chunks_file = os.path.join(base_dir, "chunks.json")
def load():
    global index, chunks
    if os.path.exists(index_file) and os.path.exists(chunks_file):
        index = faiss.read_index(index_file)
        with open(chunks_file, "r") as f:
            chunks = json.load(f)
        print(f"Loaded {len(chunks)} chunks from {base_dir}")
    else:
        print("No existing index found, starting fresh")
def save():
    os.makedirs(base_dir, exist_ok=True)
    faiss.write_index(index, index_file)
    with open(chunks_file, "w") as f:
        json.dump(chunks, f)
def add_chunks(texts: list):
    if not texts:
        return
    embeddings = get_embeddings(texts)
    vectors = np.array(embeddings).astype("float32")
    index.add(vectors)
    chunks.extend(texts)
    save()
def search(query_embedding: list, top_k: int = 5) -> list:
    if index.ntotal == 0:
        return []
    vector = np.array([query_embedding]).astype("float32")
    k = min(top_k, index.ntotal)
    distances, indices = index.search(vector, k)
    results = []
    DISTANCE_THRESHOLD = 1.7 
    for i, idx in enumerate(indices[0]):
        if idx != -1 and idx < len(chunks):
            if distances[0][i] <= DISTANCE_THRESHOLD:
                results.append(chunks[idx])
    return results
def get_chunk_count() -> int:
    return index.ntotal
def reset():
    global index, chunks
    index = faiss.IndexFlatL2(dimension)
    chunks = []
    if os.path.exists(index_file):
        os.remove(index_file)
    if os.path.exists(chunks_file):
        os.remove(chunks_file)