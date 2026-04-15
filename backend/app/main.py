import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.routes import router
from db.vector_store import load

app = FastAPI(title="Knowra RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def startup_event():
    print("Knowra RAG AI starting up... (Lazy loading enabled)")


@app.get("/health")
def health():
    return {"status": "ok"}