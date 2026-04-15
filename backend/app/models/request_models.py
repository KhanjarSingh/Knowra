from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(5, ge=1, le=20)


class IngestFileRequest(BaseModel):
    file_path: str = Field(..., min_length=1)


class IngestGitHubRequest(BaseModel):
    repo_url: str = Field(..., min_length=1)
