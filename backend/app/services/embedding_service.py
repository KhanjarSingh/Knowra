_model = None
def get_model():
    global _model
    if _model is None:
        import os
        os.environ["OMP_NUM_THREADS"] = "1"
        import torch
        torch.set_num_threads(1)
        torch.set_grad_enabled(False)
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
    return _model
def get_embedding(text: str) -> list:
    return get_model().encode(text, batch_size=1, show_progress_bar=False).tolist()
def get_embeddings(texts: list) -> list:
    return get_model().encode(texts, batch_size=2, show_progress_bar=False).tolist()