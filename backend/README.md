# Knowra RAG API

The backend for Knowra AI. A high-performance FastAPI server utilizing FAISS for vector search and Groq for blazing-fast LLM responses.

## Features
- **FastAPI Core**: Async endpoints for chat and ingestion.
- **FAISS Vector Store**: Optimized for local CPU performance.
- **Lazy Imports**: Designed for 512MB RAM environments (e.g., Render Free Tier).
- **Deep PDF Scan**: Extracts URI hyperlinks from document annotations.

## Environment Variables
- `GROQ_API_KEY`: Required for LLM generation.
- `GITHUB_TOKEN`: Recommended to avoid rate limits.

## API Endpoints
- `POST /chat`: Query the knowledge base.
- `POST /ingest/file`: Ingest local PDF/Text.
- `POST /ingest/github`: Ingest a GitHub repo URL.
- `POST /reset`: Clear the vector data.
