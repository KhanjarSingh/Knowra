from db.vector_store import search
from services.embedding_service import get_embedding
from services.llm_service import generate_answer, generate_chat_answer, is_casual_chat


def query_rag(question: str, top_k: int = 5) -> dict:
    if is_casual_chat(question):
        return {
            "answer": generate_chat_answer(question),
            "sources": [],
            "context_count": 0,
        }

    query_embedding = get_embedding(question)
    relevant_chunks = search(query_embedding, top_k)

    if not relevant_chunks:
        return {
            "answer": "I could not find relevant context yet. Please ingest a document or GitHub repository first.",
            "sources": [],
            "context_count": 0,
        }

    context = "\n\n".join(relevant_chunks)
    result = generate_answer(context, question)
    answer = result["answer"]
    used_filenames = result["used_sources"]

    if not used_filenames:
        final_sources = relevant_chunks
    else:
        final_sources = []
        for chunk in relevant_chunks:
            for filename in used_filenames:
                if f"[Source: {filename}]" in chunk and chunk not in final_sources:
                    final_sources.append(chunk)
        if not final_sources:
            final_sources = relevant_chunks

    return {
        "answer": answer,
        "sources": final_sources,
        "context_count": len(final_sources),
    }
