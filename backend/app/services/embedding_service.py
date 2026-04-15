_model = None
def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model
def get_embedding(text: str) -> list:
    return get_model().encode(text).tolist()
def get_embeddings(texts: list) -> list:
    return get_model().encode(texts).tolist()