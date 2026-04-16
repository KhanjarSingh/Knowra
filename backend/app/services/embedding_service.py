import math
import os
import re

_model = None
_model_lock = None
_backend = None

EMBEDDING_DIMENSION = 384


def _select_backend() -> str:
    configured = os.getenv("EMBEDDING_BACKEND", "").strip().lower()
    if configured in {"hash", "sentence-transformers"}:
        return configured

    # Render environments are often resource-constrained; default to hash backend there.
    if os.getenv("RENDER"):
        return "hash"
    return "sentence-transformers"


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z0-9_]+", text.lower())


def _hash_embedding(text: str) -> list[float]:
    # Deterministic lightweight embedding fallback (no network/model download).
    vector = [0.0] * EMBEDDING_DIMENSION
    tokens = _tokenize(text)
    if not tokens:
        return vector

    for token in tokens:
        idx = hash(token) % EMBEDDING_DIMENSION
        sign = -1.0 if (hash(token + "_s") % 2) else 1.0
        vector[idx] += sign

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]


def _ensure_sentence_model():
    global _model, _model_lock
    if _model_lock is None:
        import threading

        _model_lock = threading.Lock()
    if _model is None:
        os.environ["OMP_NUM_THREADS"] = "1"
        import torch

        torch.set_num_threads(1)
        torch.set_grad_enabled(False)
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")


def get_embedding(text: str) -> list:
    global _backend
    if _backend is None:
        _backend = _select_backend()

    if _backend == "hash":
        return _hash_embedding(text)

    try:
        import gc

        _ensure_sentence_model()
        with _model_lock:
            res = _model.encode(text, batch_size=1, show_progress_bar=False).tolist()
        gc.collect()
        return res
    except Exception:
        _backend = "hash"
        return _hash_embedding(text)


def get_embeddings(texts: list) -> list:
    global _backend
    if _backend is None:
        _backend = _select_backend()

    if _backend == "hash":
        return [_hash_embedding(text) for text in texts]

    try:
        import gc

        _ensure_sentence_model()
        with _model_lock:
            res = _model.encode(texts, batch_size=2, show_progress_bar=False).tolist()
        gc.collect()
        return res
    except Exception:
        _backend = "hash"
        return [_hash_embedding(text) for text in texts]
