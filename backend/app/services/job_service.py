from __future__ import annotations

import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, asdict
from typing import Any, Callable


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


_jobs: dict[str, JobRecord] = {}
_lock = threading.Lock()
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="knowra-ingest")


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

    try:
        chunks_added = task(*args)
        with _lock:
            job = _jobs[job_id]
            job.status = "completed"
            job.chunks_added = int(chunks_added or 0)
            job.finished_at = time.time()
    except Exception as exc:
        with _lock:
            job = _jobs[job_id]
            job.status = "failed"
            job.error = str(exc)
            job.finished_at = time.time()
    finally:
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

    _executor.submit(_run_job, job_id, task, args, cleanup)
    return job


def get_job(job_id: str) -> JobRecord | None:
    with _lock:
        return _jobs.get(job_id)


def list_jobs(limit: int = 25) -> list[JobRecord]:
    with _lock:
        records = sorted(_jobs.values(), key=lambda item: item.created_at, reverse=True)
    return records[: max(1, min(limit, 100))]


def job_to_dict(job: JobRecord) -> dict[str, Any]:
    return asdict(job)


def shutdown_workers() -> None:
    _executor.shutdown(wait=False, cancel_futures=True)
