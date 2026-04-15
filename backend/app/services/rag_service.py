from services.embedding_service import get_embedding
from db.vector_store import search
from services.llm_service import generate_answer, is_rag_query, generate_chat_answer


def query_rag(question: str, top_k: int = 5) -> dict:
    if not is_rag_query(question):
        return {
            "answer": generate_chat_answer(question),
            "sources": [],
            "context_count": 0,
        }

    query_embedding = get_embedding(question)
    relevant_chunks = search(query_embedding, top_k)

    if not relevant_chunks:
        return {
            "answer": "No relevant context found. Please ingest a document or GitHub repo first.",
            "sources": [],
            "context_count": 0,
        }

    context = "\n\n".join(relevant_chunks)
    answer = generate_answer(context, question)

    return {
        "answer": answer,
        "sources": relevant_chunks,
        "context_count": len(relevant_chunks),
    }
