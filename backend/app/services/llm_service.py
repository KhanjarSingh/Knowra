from groq import Groq
from config import GROQ_API_KEY
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
def _fallback_answer(context: str, question: str) -> str:
    if not context.strip():
        return "I don't know based on the provided context."
    return "I could not reach the LLM right now. Here is the most relevant context I found:\n\n" + context[:1200]
def generate_answer(context: str, question: str) -> dict:
    if client is None:
        return {"answer": _fallback_answer(context, question), "used_sources": []}
    system_prompt = (
        "You are Knowra AI, an intelligent knowledge base assistant. Answer questions strictly based ONLY on the provided context. "
        "The context consists of multiple chunks, each starting with '[Source: filename]'. "
        "IDENTITY: You are Knowra AI, a RAG personality. Always use **bold text** for key terms and bullet points for lists to make your answers professional and easy to read. "
        "SOURCE CLEANING (CRITICAL): Only list a file in 'SOURCES_USED' if it actually provided factual information for your answer. "
        "DO NOT include files just because they happen to contain a keyword (like 'GitHub') if they didn't help answer the question. "
        "Format the end of your response exactly like this: SOURCES_USED: file1, file2 "
        "If you don't use any information from the context, introduce yourself as Knowra AI and do not include the SOURCES_USED line."
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
        full_content = response.choices[0].message.content or "I don't know based on the provided context."
        clean_answer = full_content
        used_sources = []
        if "SOURCES_USED:" in full_content:
            parts = full_content.split("SOURCES_USED:")
            clean_answer = parts[0].strip()
            source_str = parts[1].strip()
            used_sources = [s.strip().strip("[]'\"") for s in source_str.split(",")]
        return {
            "answer": clean_answer,
            "used_sources": used_sources
        }
    except Exception:
        return {"answer": _fallback_answer(context, question), "used_sources": []}
def is_rag_query(question: str) -> bool:
    if client is None:
        return True  
    prompt = (
        "Classify if the following user input is purely casual small-talk/greeting (e.g., 'hi', 'how are you', 'what is your name', 'thanks') "
        "OR if it is a request for information, details, summarization, or analysis (e.g., 'who is X', 'explain Y', 'give me details about Z'). "
        "REPLY EXACTLY 'YES' if it is a request for information/details (meaning we MUST search the database). "
        "REPLY EXACTLY 'NO' if it is strictly casual small-talk or asking for your identity."
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
        return "YES" in content or "NO" not in content  
    except Exception:
        return True
def generate_chat_answer(question: str) -> str:
    if client is None:
        return "Hello! I am Knowra AI."
    system_prompt = (
        "You are Knowra AI, an intelligent RAG (Retrieval-Augmented Generation) assistant. "
        "Your primary function is to search and retrieve data from the user's ingested GitHub repositories and documents. "
        "The user is engaging in general conversation right now (e.g. asking for your name or greeting you). "
        "Reply politely, concisely, and remind them that they can ask you about their ingested knowledge base."
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