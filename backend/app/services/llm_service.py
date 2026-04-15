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


def is_rag_query(question: str) -> bool:
    if client is None:
        return True  # Fallback to RAG if API is missing

    prompt = (
        "Classify if the following user input requires searching a technical knowledge base (documents/repositories) "
        "or if it is just a casual greeting/general chat. "
        "Reply with exactly 'YES' if it requires a knowledge base search, or 'NO' if it is just casual chat."
    )
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": question},
            ],
            max_tokens=10,
            temperature=0.0
        )
        content = response.choices[0].message.content.strip().upper()
        return "YES" in content or "NO" not in content  # Default to True if ambiguous
    except Exception:
        return True


def generate_chat_answer(question: str) -> str:
    if client is None:
        return "Hello! I am your intelligent assistant."

    system_prompt = (
        "You are an intelligent AI assistant interacting with a user. "
        "The user is engaging in general conversation. "
        "Reply politely, concisely, and inform them that you can also answer questions about their ingested knowledge base."
    )
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
        )
        return response.choices[0].message.content or "Hello!"
    except Exception:
        return "Hello! I am your intelligent assistant."
