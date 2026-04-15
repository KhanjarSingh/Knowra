const API_URL = 'http://localhost:8000/chat'

export async function sendChatMessage(query, userId = 'web-user') {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      user_id: userId,
    }),
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const message = data?.detail || data?.message || 'Request failed'
    throw new Error(message)
  }

  if (data?.data?.answer) {
    return {
      answer: data.data.answer,
      sources: Array.isArray(data.data.sources) ? data.data.sources : [],
    }
  }

  return {
    answer: data?.answer || 'No answer received',
    sources: Array.isArray(data?.sources) ? data.sources : [],
  }
}
