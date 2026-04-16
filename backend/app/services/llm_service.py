import re

from groq import Groq

from config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
_CASUAL_PATTERNS = (
    r"^\s*h+i+\s*[!.?]*\s*$",
    r"^\s*he+y+\s*[!.?]*\s*$",
    r"^\s*hello+\s*[!.?]*\s*$",
    r"^\s*(yo|sup)\s*[!.?]*\s*$",
    r"^\s*(thanks|thank you)\s*[!.?]*\s*$",
    r"^\s*(how are you|who are you|what is your name)\s*[?.!]*\s*$",
)


def _fallback_answer(context: str, question: str) -> str:
    if not context.strip():
        return "I do not have enough context yet. Please ingest a document or GitHub repository first."
    return "I could not reach the language model right now. Here is the most relevant context:\n\n" + context[:1200]


def generate_answer(context: str, question: str) -> dict:
    if client is None:
        return {"answer": _fallback_answer(context, question), "used_sources": []}

    system_prompt = (
        "You are Knowra AI, a retrieval-grounded assistant. "
        "Answer only from the provided context. "
        "If the context is insufficient, say what is missing instead of guessing. "
        "At the end, add exactly one line in this format: SOURCES_USED: source1, source2. "
        "List only sources you truly used."
    )
    user_message = f"Context:\n{context}\n\nQuestion:\n{question}"

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
        )
        full_content = response.choices[0].message.content or "I do not know based on the retrieved context."
        clean_answer = full_content.strip()
        used_sources = []

        if "SOURCES_USED:" in full_content:
            answer_part, _, sources_part = full_content.partition("SOURCES_USED:")
            clean_answer = answer_part.strip() or "I do not know based on the retrieved context."
            used_sources = [
                source.strip().strip("[]'\"")
                for source in sources_part.split(",")
                if source.strip()
            ]

        return {"answer": clean_answer, "used_sources": used_sources}
    except Exception:
        return {"answer": _fallback_answer(context, question), "used_sources": []}


def is_casual_chat(question: str) -> bool:
    lowered = " ".join(question.lower().strip().split())
    for pattern in _CASUAL_PATTERNS:
        if re.search(pattern, lowered):
            return True
    if lowered in {"hi", "hii", "hiii", "hello", "hey", "who are you", "what are you"}:
        return True
    return False


def generate_chat_answer(question: str) -> str:
    if client is None:
        return "Hello, I am Knowra AI. Ask me about the documents or repositories you ingest."

    system_prompt = (
        "You are Knowra AI. The user is making small talk. "
        "Reply briefly and warmly, then guide them to ask about their ingested docs or repos."
    )
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
            temperature=0.5,
            max_tokens=120,
        )
        return response.choices[0].message.content or "Hello. I am ready to answer questions from your ingested data."
    except Exception:
        return "Hello. I am ready to answer questions from your ingested data."
