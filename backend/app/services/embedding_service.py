_model = None
_model_lock = None
def get_model():
    global _model, _model_lock
    if _model_lock is None:
        import threading
        _model_lock = threading.Lock()
    if _model is None:
        import os
        os.environ["OMP_NUM_THREADS"] = "1"
        import torch
        torch.set_num_threads(1)
        torch.set_grad_enabled(False)
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
    return _model, _model_lock
def get_embedding(text: str) -> list:
    import gc
    model, lock = get_model()
    with lock:
        res = model.encode(text, batch_size=1, show_progress_bar=False).tolist()
    gc.collect()
    return res
def get_embeddings(texts: list) -> list:
    import gc
    model, lock = get_model()
    with lock:
        res = model.encode(texts, batch_size=2, show_progress_bar=False).tolist()
    gc.collect()
    return res