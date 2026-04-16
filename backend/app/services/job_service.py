from __future__ import annotations

import json
import os
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from typing import Any, Callable

from config import FAISS_INDEX_PATH


@dataclass
class JobRecord:
    job_id: str
    job_type: str
    target: str
    status: str
    created_at: float
    started_at: float | None = None
    finished_at: float | None = None
    chunks_added: int = 0
    error: str | None = None
    progress_current: int = 0
    progress_total: int = 0
    progress_message: str | None = None
    updated_at: float | None = None


_jobs: dict[str, JobRecord] = {}
_lock = threading.Lock()
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="knowra-ingest")
_job_context = threading.local()
JOB_TIMEOUT_SECONDS = 20 * 60
_jobs_file = os.path.join(os.path.abspath(FAISS_INDEX_PATH), "jobs.json")


def _persist_jobs_locked() -> None:
    os.makedirs(os.path.dirname(_jobs_file), exist_ok=True)
    payload = [asdict(job) for job in _jobs.values()]
    with open(_jobs_file, "w", encoding="utf-8") as outfile:
        json.dump(payload, outfile)


def _load_jobs() -> None:
    if not os.path.exists(_jobs_file):
        return
    try:
        with open(_jobs_file, "r", encoding="utf-8") as infile:
            payload = json.load(infile)
        now = time.time()
        with _lock:
            for raw in payload:
                job = JobRecord(**raw)
                if job.status in {"queued", "running"}:
                    # Process restarted while the job was in memory only.
                    job.status = "failed"
                    job.error = "Job interrupted by server restart. Please retry ingestion."
                    job.finished_at = now
                    job.updated_at = now
                    job.progress_message = "Job interrupted by restart"
                _jobs[job.job_id] = job
            _persist_jobs_locked()
    except Exception:
        # If the file is corrupt, skip loading instead of crashing startup.
        return


def _run_job(
    job_id: str,
    task: Callable[..., int],
    args: tuple[Any, ...],
    cleanup: Callable[[], None] | None = None,
) -> None:
    with _lock:
        job = _jobs[job_id]
        job.status = "running"
        job.started_at = time.time()
        job.updated_at = job.started_at
        job.progress_message = "Job started"
        _persist_jobs_locked()
    _job_context.job_id = job_id

    try:
        chunks_added = task(*args)
        with _lock:
            job = _jobs[job_id]
            job.status = "completed"
            job.chunks_added = int(chunks_added or 0)
            job.finished_at = time.time()
            job.progress_current = job.progress_current or job.chunks_added
            job.progress_total = job.progress_total or job.chunks_added
            job.progress_message = "Job completed"
            job.updated_at = job.finished_at
            _persist_jobs_locked()
    except Exception as exc:
        with _lock:
            job = _jobs[job_id]
            job.status = "failed"
            job.error = str(exc)
            job.finished_at = time.time()
            job.progress_message = "Job failed"
            job.updated_at = job.finished_at
            _persist_jobs_locked()
    finally:
        _job_context.job_id = None
        if cleanup is not None:
            try:
                cleanup()
            except Exception:
                pass


def submit_job(
    job_type: str,
    target: str,
    task: Callable[..., int],
    *args: Any,
    cleanup: Callable[[], None] | None = None,
) -> JobRecord:
    job_id = uuid.uuid4().hex
    job = JobRecord(
        job_id=job_id,
        job_type=job_type,
        target=target,
        status="queued",
        created_at=time.time(),
    )

    with _lock:
        _jobs[job_id] = job
        _persist_jobs_locked()

    _executor.submit(_run_job, job_id, task, args, cleanup)
    return job


def get_job(job_id: str) -> JobRecord | None:
    with _lock:
        job = _jobs.get(job_id)
        if job is None:
            return None

        now = time.time()
        reference_time = job.updated_at or job.started_at or job.created_at
        if job.status == "running" and now - reference_time > JOB_TIMEOUT_SECONDS:
            job.status = "failed"
            job.error = "Job timed out while processing. Please retry with a smaller file."
            job.finished_at = now
            job.updated_at = now
            job.progress_message = "Job timed out"
            _persist_jobs_locked()

        return job


def list_jobs(limit: int = 25) -> list[JobRecord]:
    with _lock:
        records = sorted(_jobs.values(), key=lambda item: item.created_at, reverse=True)
    return records[: max(1, min(limit, 100))]


def job_to_dict(job: JobRecord) -> dict[str, Any]:
    return asdict(job)


def get_current_job_id() -> str | None:
    return getattr(_job_context, "job_id", None)


def update_job(
    job_id: str,
    *,
    progress_current: int | None = None,
    progress_total: int | None = None,
    progress_message: str | None = None,
    chunks_added: int | None = None,
) -> None:
    with _lock:
        job = _jobs.get(job_id)
        if job is None:
            return
        if progress_current is not None:
            job.progress_current = max(0, int(progress_current))
        if progress_total is not None:
            job.progress_total = max(0, int(progress_total))
        if progress_message is not None:
            job.progress_message = progress_message
        if chunks_added is not None:
            job.chunks_added = max(0, int(chunks_added))
        job.updated_at = time.time()
        _persist_jobs_locked()


def update_current_job(
    *,
    progress_current: int | None = None,
    progress_total: int | None = None,
    progress_message: str | None = None,
    chunks_added: int | None = None,
) -> None:
    job_id = get_current_job_id()
    if job_id is None:
        return
    update_job(
        job_id,
        progress_current=progress_current,
        progress_total=progress_total,
        progress_message=progress_message,
        chunks_added=chunks_added,
    )


def shutdown_workers() -> None:
    _executor.shutdown(wait=False, cancel_futures=True)


_load_jobs()
