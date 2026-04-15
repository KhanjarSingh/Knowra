from groq import Groq
from config import GROQ_API_KEY


client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def _fallback_answer(context: str, question: str) -> str:
    if not context.strip():
        return "I don't know based on the provided context."
    return "I could not reach the LLM right now. Here is the most relevant context I found:\n\n" + context[:1200]


def generate_answer(context: str, question: str) -> str:
    if client is None:
        return _fallback_answer(context, question)

    system_prompt = (
        "You are an intelligent knowledge base assistant. Answer questions strictly based ONLY on the provided context. "
        "If the user engages in casual conversation or greets you, reply politely and remind them of your purpose to search the knowledge base. "
        "If the user asks a question and the answer cannot be confidently deduced from the context, clearly state that you do not have that information in your knowledge base."
    )

    user_message = f"Context:\n{context}\n\nQuestion:\n{question}"

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )
        return response.choices[0].message.content or "I don't know based on the provided context."
    except Exception:
        return _fallback_answer(context, question)
