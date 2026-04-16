import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.routes import router
from services.job_service import shutdown_workers

app = FastAPI(title="Knowra RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def startup_event() -> None:
    print("Knowra RAG API is ready. Lazy loading is enabled.")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    shutdown_workers()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
