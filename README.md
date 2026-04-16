# Knowra AI
### RAG for GitHub Repositories & Documents

Knowra is a production-ready Retrieval-Augmented Generation (RAG) system designed to turn your GitHub repositories and local documents into an interactive, AI-powered knowledge base. Built for speed, precision, and a premium user experience.

---

## Key Features

- **GitHub Repository Ingestion**: Automatically clone, chunk, and index entire codebases with a single URL.
- **Queued Background Ingestion Jobs**: Uploads and GitHub indexing now run in managed worker jobs with status polling, improving deployment stability on Render.
- **Deep-Scan PDF Ingestion**: Beyond text extraction—Knowra scans PDF annotations to extract hidden URI hyperlinks (GitHub/Portfolio links) for high-fidelity source citation.
- **Verified Sources System**: Every answer is backed by verified citations. Hover over source badges to see monospaced code/text previews of the actual data used.
- **Extreme Lazy Loading**: Optimized for cloud deployment (e.g., Render/Vercel). The backend starts instantly, deferring heavy ML library imports until the first request.
- **Minimalist Aesthetic**: A dark-mode, glassmorphism-inspired UI with fluid Framer Motion animations.
- **Admin Reset Controls**: Wipe the vector index and start fresh with a dedicated UI control.

---

## Tech Stack

### Backend (FastAPI)
- **Engine**: FastAPI (Python 3.10+)
- **Vector Store**: FAISS (Facebook AI Similarity Search)
- **LLM**: Groq (Llama-3-70B/8B)
- **Embeddings**: Sentence-Transformers (all-MiniLM-L6-v2)
- **Processing**: PyPDF2 with URI extraction logic.

### Frontend (React)
- **Framework**: Vite + React 19
- **Styling**: Tailwind CSS 4.0
- **Animations**: Framer Motion
- **Icons**: Lucide React

---

## Project Structure

```bash
Knowra/
├── backend/            # FastAPI RAG API
│   ├── app/
│   │   ├── api/        # REST Endpoints
│   │   ├── db/         # FAISS Vector Store Logic
│   │   ├── services/   # RAG & Embedding Logic
│   │   └── utils/      # Chunker & PDF Extractors
│   └── requirements.txt
└── frontend/           # React + Vite Application
    ├── src/
    │   ├── components/ # Glassmorphism UI Components
    │   ├── services/   # API Connection logic
    │   └── assets/     # High-fidelity visual assets
```

---

## Local Setup

### Backend
1. Navigate to `backend/`.
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file:
   ```env
   GROQ_API_KEY=your_key_here
   GITHUB_TOKEN=your_token_here (optional, but recommended for private repos)
   ```
5. Run the server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Frontend
1. Navigate to `frontend/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## How to Use

Knowra makes it incredibly easy to build your knowledge base. Here's how to get started:

### 1. Chatting with AI
Simply type your question in the message box. Knowra will search its indexed data and provide answers with **Verified Source Badges**.

### 2. Adding Local Documents (PDF, TXT, MD)
- Click the **+ (Add)** button in the input bar.
- Select **"Upload Document"**.
- Choose your file. Knowra will automatically chunk and index it.
- *Tip: Knowra can even extract hidden links from within PDFs!*

### 3. Ingesting GitHub Repositories
- Click the **+ (Add)** button and select **"Add GitHub Repo"**.
- Paste the full GitHub repository URL (e.g. `https://github.com/user/repo`).
- Click **"Ingest Repo"**. Knowra will clone the code, analyze it, and add it to your context.

### 4. Managing Knowledge
- **Reset**: Use the trash icon in the header to wipe the index if you want to start fresh.
- **Sources**: Hover over source badges in AI responses to see a snippet of the original data used to generate the answer.

---

## Deployment

### Backend (Render)
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**: Add `GROQ_API_KEY` and `GITHUB_TOKEN`.

### Ingestion Job Status
- `POST /ingest/upload` or `POST /ingest/github` returns a `job_id`
- Poll `GET /ingest/jobs/{job_id}` until status is `completed` or `failed`

### Frontend (Vercel)
- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Environment Variables**: Add `VITE_API_BASE_URL` (points to your Render URL).

---

## License
Knowra is open-source. Build something great!
