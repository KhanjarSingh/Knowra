from pydantic import BaseModel


class ChatData(BaseModel):
    answer: str
    sources: list[str]
    context_count: int


class ChatResponse(BaseModel):
    success: bool
    message: str
    data: ChatData


class IngestData(BaseModel):
    chunks_added: int
    is_background: bool = False
    job_id: str | None = None
    job_status: str | None = None


class IngestResponse(BaseModel):
    success: bool
    message: str
    data: IngestData


class StatusData(BaseModel):
    chunks_in_index: int


class StatusResponse(BaseModel):
    success: bool
    message: str
    data: StatusData


class ResetResponse(BaseModel):
    success: bool
    message: str


class JobData(BaseModel):
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


class JobResponse(BaseModel):
    success: bool
    message: str
    data: JobData
