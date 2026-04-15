const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const API_URL = `${BASE_URL}/chat`
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
export async function uploadDocument(file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${BASE_URL}/ingest/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.detail || data?.message || 'Upload failed')
  return data
}
export async function ingestGitHub(repoUrl) {
  const response = await fetch(`${BASE_URL}/ingest/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: repoUrl }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.detail || data?.message || 'Ingest failed')
  return data
}
export async function resetIndex() {
  const response = await fetch(`${BASE_URL}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.detail || data?.message || 'Reset failed')
  return data
}