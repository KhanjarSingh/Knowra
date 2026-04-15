from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")
q = model.encode(["what is knowra repo all about?"])
c1 = model.encode(["[Source: backend/README.md]\nKnowra is a RAG based assistant."])
c2 = model.encode(["[Source: backend/main.py]\nfrom fastapi import FastAPI"])

dist1 = np.linalg.norm(q - c1)**2
dist2 = np.linalg.norm(q - c2)**2
print(f"Dist 1 (Relevant): {dist1}")
print(f"Dist 2 (Irrelevant): {dist2}")
