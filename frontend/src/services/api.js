const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function parseResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data?.detail || data?.message || fallbackMessage
    throw new Error(message)
  }
  return data
}

export async function sendChatMessage(query) {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const data = await parseResponse(response, 'Chat request failed')
  return {
    answer: data?.data?.answer || 'No answer received',
    sources: Array.isArray(data?.data?.sources) ? data.data.sources : [],
  }
}

export async function uploadDocument(file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${BASE_URL}/ingest/upload`, { method: 'POST', body: formData })
  return parseResponse(response, 'Upload failed')
}

export async function ingestGitHub(repoUrl) {
  const response = await fetch(`${BASE_URL}/ingest/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: repoUrl }),
  })
  return parseResponse(response, 'Repository ingest failed')
}

export async function getIngestJob(jobId) {
  const response = await fetch(`${BASE_URL}/ingest/jobs/${jobId}`)
  return parseResponse(response, 'Failed to fetch ingest job status')
}

export async function waitForIngestJob(jobId, { timeoutMs = 180000, pollEveryMs = 2000, onProgress } = {}) {
  const startedAt = Date.now()
  let lastState = null
  let consecutivePollErrors = 0

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const payload = await getIngestJob(jobId)
      const job = payload?.data
      if (!job) throw new Error('Invalid ingest job payload')
      lastState = job
      consecutivePollErrors = 0
      if (typeof onProgress === 'function') {
        onProgress(job)
      }

      if (job.status === 'completed') return job
      if (job.status === 'failed') {
        throw new Error(job.error || 'Ingestion failed')
      }
    } catch (error) {
      const message = error?.message || 'Failed to fetch'
      if (message.includes('Job not found')) {
        throw new Error('Ingestion job was lost after a server restart. Please upload again.')
      }

      consecutivePollErrors += 1
      if (typeof onProgress === 'function') {
        onProgress({ progress_message: `Reconnecting to server... (${consecutivePollErrors})` })
      }

      if (consecutivePollErrors >= 8) {
        throw new Error('Connection interrupted while tracking ingestion. Please retry in a moment.')
      }

      const backoffMs = Math.min(6000, pollEveryMs * consecutivePollErrors)
      await new Promise(resolve => setTimeout(resolve, backoffMs))
      continue
    }

    await new Promise(resolve => setTimeout(resolve, pollEveryMs))
  }

  if (lastState?.status === 'running' || lastState?.status === 'queued') {
    throw new Error('Ingestion is still running. Please try again shortly.')
  }
  throw new Error('Ingestion status check timed out')
}

export async function resetIndex() {
  const response = await fetch(`${BASE_URL}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  return parseResponse(response, 'Reset failed')
}
