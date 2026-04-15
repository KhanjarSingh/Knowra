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
