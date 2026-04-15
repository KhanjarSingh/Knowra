import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from models.request_models import ChatRequest, IngestFileRequest, IngestGitHubRequest
from models.response_models import (
    ChatResponse,
    ChatData,
    IngestResponse,
    IngestData,
    StatusResponse,
    StatusData,
    ResetResponse,
)
from services.rag_service import query_rag
from services.ingest_service import ingest_file
from services.github_service import ingest_repo
from db.vector_store import get_chunk_count, reset

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    result = query_rag(request.query, request.top_k)
    return ChatResponse(
        success=True,
        message="Chat response generated",
        data=ChatData(
            answer=result["answer"],
            sources=result["sources"],
            context_count=result["context_count"],
        ),
    )


@router.post("/ingest/file", response_model=IngestResponse)
def ingest_from_path(request: IngestFileRequest):
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    count = ingest_file(request.file_path)
    return IngestResponse(
        success=True,
        message="File ingested successfully",
        data=IngestData(chunks_added=count),
    )


@router.post("/ingest/upload", response_model=IngestResponse)
async def ingest_upload(file: UploadFile = File(...)):
    tmp_path = f"/tmp/{file.filename}"
    try:
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        count = ingest_file(tmp_path)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    return IngestResponse(
        success=True,
        message="Uploaded file ingested successfully",
        data=IngestData(chunks_added=count),
    )


@router.post("/ingest/github", response_model=IngestResponse)
def ingest_github(request: IngestGitHubRequest):
    count = ingest_repo(request.repo_url)
    return IngestResponse(
        success=True,
        message="GitHub repository ingested successfully",
        data=IngestData(chunks_added=count),
    )


@router.get("/status", response_model=StatusResponse)
def status():
    return StatusResponse(
        success=True,
        message="Index status fetched",
        data=StatusData(chunks_in_index=get_chunk_count()),
    )


@router.post("/reset", response_model=ResetResponse)
def reset_index():
    reset()
    return ResetResponse(success=True, message="Index cleared")
