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
    res = generate_answer(context, question)
    answer = res["answer"]
    used_filenames = res["used_sources"]
    if not used_filenames:
        final_sources = relevant_chunks
    else:
        final_sources = []
        for chunk in relevant_chunks:
            for fname in used_filenames:
                if f"[Source: {fname}]" in chunk:
                    if chunk not in final_sources:
                        final_sources.append(chunk)
        if not final_sources:
            final_sources = relevant_chunks
    return {
        "answer": answer,
        "sources": final_sources,
        "context_count": len(final_sources),
    }