import os
import shutil
import tempfile

from fastapi import APIRouter, File, HTTPException, UploadFile

from db.vector_store import get_chunk_count, reset
from models.request_models import ChatRequest, IngestFileRequest, IngestGitHubRequest
from models.response_models import (
    ChatData,
    ChatResponse,
    IngestData,
    IngestResponse,
    JobData,
    JobResponse,
    ResetResponse,
    StatusData,
    StatusResponse,
)
from services.github_service import ingest_repo
from services.ingest_service import ingest_file
from services.job_service import get_job, job_to_dict
from services.rag_service import query_rag

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
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
def ingest_from_path(request: IngestFileRequest) -> IngestResponse:
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    count = ingest_file(request.file_path, source_name=os.path.basename(request.file_path))
    return IngestResponse(
        success=True,
        message="File ingested successfully",
        data=IngestData(chunks_added=count),
    )


@router.post("/ingest/upload", response_model=IngestResponse)
def ingest_upload(file: UploadFile = File(...)) -> IngestResponse:
    ext = os.path.splitext(file.filename)[-1].lower() if file.filename else ".pdf"
    fd, tmp_path = tempfile.mkstemp(suffix=ext)
    os.close(fd)

    try:
        with open(tmp_path, "wb") as output:
            shutil.copyfileobj(file.file, output)
    except Exception as exc:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=f"Failed to receive upload: {exc}") from exc
    finally:
        file.file.close()

    try:
        source_name = file.filename or os.path.basename(tmp_path)
        chunks_added = ingest_file(tmp_path, source_name=source_name)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to ingest uploaded file: {exc}") from exc
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    return IngestResponse(
        success=True,
        message="File ingested successfully.",
        data=IngestData(
            chunks_added=chunks_added,
            is_background=False,
            job_id=None,
            job_status="completed",
        ),
    )


@router.post("/ingest/github", response_model=IngestResponse)
def ingest_github(request: IngestGitHubRequest) -> IngestResponse:
    try:
        chunks_added = ingest_repo(request.repo_url)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to ingest repository: {exc}") from exc

    return IngestResponse(
        success=True,
        message="GitHub repository ingested successfully.",
        data=IngestData(
            chunks_added=chunks_added,
            is_background=False,
            job_id=None,
            job_status="completed",
        ),
    )


@router.get("/ingest/jobs/{job_id}", response_model=JobResponse)
def get_ingest_job(job_id: str) -> JobResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse(
        success=True,
        message="Job status fetched",
        data=JobData(**job_to_dict(job)),
    )


@router.get("/status", response_model=StatusResponse)
def status() -> StatusResponse:
    return StatusResponse(
        success=True,
        message="Index status fetched",
        data=StatusData(chunks_in_index=get_chunk_count()),
    )


@router.post("/reset", response_model=ResetResponse)
def reset_index() -> ResetResponse:
    reset()
    return ResetResponse(success=True, message="Index cleared")
