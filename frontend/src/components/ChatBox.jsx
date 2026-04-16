import { useEffect, useMemo, useRef, useState } from 'react'
import { sendChatMessage, uploadDocument, ingestGitHub, resetIndex, waitForIngestJob } from '../services/api'
function Loader({ isDark, label }) {
  const dotColor = isDark ? 'bg-white/70' : 'bg-black/60'
  return (
    <div className="flex flex-col items-start gap-2 py-2 px-1">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 animate-bounce rounded-full ${dotColor} [animation-delay:-0.3s]`} />
        <span className={`h-1.5 w-1.5 animate-bounce rounded-full ${dotColor} [animation-delay:-0.15s]`} />
        <span className={`h-1.5 w-1.5 animate-bounce rounded-full ${dotColor}`} />
      </div>
      {label && (
        <span className={`text-[11px] ${isDark ? 'text-white/60' : 'text-black/60'}`}>
          {label}
        </span>
      )}
    </div>
  )
}
function AIBoxIcon({ isDark }) {
  const bgColors = isDark 
    ? 'bg-white/10 text-white shadow-white/5 border-white/10' 
    : 'bg-black/5 text-black shadow-black/5 border-black/10'
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-lg border backdrop-blur-md ${bgColors}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    </div>
  )
}
function UserIcon({ isDark }) {
  const bgColors = isDark 
    ? 'bg-white text-black border-white' 
    : 'bg-black text-white border-black'
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-md border ${bgColors}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  )
}
function renderText(text, isDark, isUser) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, idx) => {
    const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g)
    return (
      <span key={idx} className="block min-h-[1.2rem]">
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={i} className={`font-semibold ${isUser ? (isDark ? 'text-black' : 'text-white') : (isDark ? 'text-white/95' : 'text-black/95')}`}>
                {part.slice(2, -2)}
              </strong>
            )
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={i} className={`px-1.5 py-0.5 rounded-md font-mono text-[13px] ${isUser ? (isDark ? 'bg-black/10' : 'bg-white/20') : (isDark ? 'bg-white/10 text-white/90' : 'bg-black/10 text-black/90')}`}>
                {part.slice(1, -1)}
              </code>
            )
          }
          return part
        })}
      </span>
    )
  })
}
export default function ChatBox() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState('')
  const [isDark, setIsDark] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [ingestMode, setIngestMode] = useState(null) 
  const chatRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const autoTrimmedInput = useMemo(() => input.trim(), [input])
  useEffect(() => {
    if (!chatRef.current) return
    chatRef.current.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, loading])
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`
    }
  }, [input, ingestMode])
  async function handleSend() {
    if (!autoTrimmedInput || loading) return
    const submission = autoTrimmedInput
    setInput('')
    setError('')
    if (ingestMode === 'github') {
      setIngestMode(null)
      if (!submission.startsWith('http')) {
        setError('Invalid URL format for GitHub.')
        setTimeout(() => setError(''), 3000)
        return
      }
      setMessages(prev => [...prev, { role: 'user', content: `Processing GitHub Repository:\n${submission}`, type: 'ingest' }])
      setLoadingStatus('Indexing repository...')
      setLoading(true)
      try {
        const res = await ingestGitHub(submission)
        const jobId = res?.data?.job_id
        const isBackground = Boolean(res?.data?.is_background)
        const chunksAdded = Number(res?.data?.chunks_added || 0)

        if (!isBackground) {
          setMessages(prev => [...prev, { role: 'assistant', content: `Repository indexing complete. Added ${chunksAdded} chunks to your knowledge base.`, sources: [] }])
        } else if (!jobId) {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Repository ingestion started, but no job id was returned.', sources: [] }])
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Repository queued. I am indexing it now and will confirm once it is ready.', sources: [] }])
          const job = await waitForIngestJob(jobId, {
            onProgress: (progressJob) => {
              const label = progressJob?.progress_message
              if (label) setLoadingStatus(label)
            },
          })
          setMessages(prev => [...prev, { role: 'assistant', content: `Repository indexing complete. Added ${job.chunks_added} chunks to your knowledge base.`, sources: [] }])
        }
      } catch (err) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Failed to ingest repository: ${err.message}`, sources: [] }])
      } finally {
        setLoadingStatus('')
        setLoading(false)
      }
      return
    }
    setMessages((prev) => [...prev, { role: 'user', content: submission }])
    setLoading(true)
    try {
      const result = await sendChatMessage(submission)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
        },
      ])
    } catch (err) {
      setError(err.message || 'Could not reach server')
      setTimeout(() => setError(''), 3000)
    } finally {
      setLoading(false)
    }
  }
  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }
  async function handleFileUpload(e) {
    setShowMenu(false)
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    setMessages(prev => [...prev, { role: 'user', content: `Uploading document: ${file.name}`, type: 'ingest' }])
    setLoadingStatus('Uploading and preparing document...')
    setLoading(true)
    try {
      const res = await uploadDocument(file)
      const jobId = res?.data?.job_id
      const isBackground = Boolean(res?.data?.is_background)
      const chunksAdded = Number(res?.data?.chunks_added || 0)

      if (!isBackground) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Document ready. Added ${chunksAdded} chunks from ${file.name}.`, sources: [] }])
      } else if (!jobId) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Upload received for ${file.name}, but tracking is unavailable right now.`, sources: [] }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Upload received for ${file.name}. I am processing it now.`, sources: [] }])
        const job = await waitForIngestJob(jobId, {
          onProgress: (progressJob) => {
            const label = progressJob?.progress_message
            if (label) setLoadingStatus(label)
          },
        })
        setMessages(prev => [...prev, { role: 'assistant', content: `Document ready. Added ${job.chunks_added} chunks from ${file.name}.`, sources: [] }])
      }
    } catch (err) {
       setMessages(prev => [...prev, { role: 'assistant', content: `Failed to ingest document: ${err.message}`, sources: [] }])
    } finally {
      setLoadingStatus('')
      setLoading(false)
    }
  }
  async function handleReset() {
    if (!window.confirm("Are you sure you want to clear the entire knowledge base? This action cannot be undone.")) return
    setLoading(true)
    try {
      await resetIndex()
      setMessages([])
      setError('')
      alert("Knowledge base and chat history cleared successfully.")
    } catch (err) {
      setError(`Failed to reset: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }
  const containerStyle = isDark ? {
    backgroundColor: '#0a0a0a',
    backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    color: '#ffffff'
  } : {
    backgroundColor: '#ffffff',
    backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    color: '#000000'
  }
  return (
    <div 
      className="min-h-screen w-full transition-colors duration-500 ease-in-out font-sans overflow-hidden flex flex-col items-center"
      style={containerStyle}
      onClick={() => setShowMenu(false)}
    >
      <div className="flex h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-8 relative z-10">
        <header className="mb-6 flex items-center justify-between shrink-0 bg-transparent rounded-2xl py-2">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-3">
              <img src="/Knowra.png" alt="Knowra Logo" className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl shadow-lg border border-white/10" />
              Knowra AI
            </h1>
            <p className={`mt-1 text-xs font-semibold tracking-wide uppercase ${isDark ? 'text-white/50' : 'text-black/50'}`}>
              RAG FOR GITHUB REPOS & DOCUMENTS
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] sm:text-xs font-semibold backdrop-blur-md transition-colors ${
              isDark ? 'border-white/10 bg-white/5 text-white/90' : 'border-black/10 bg-black/5 text-black/90'
            }`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              </span>
              <span className="hidden xs:inline">System Online</span>
              <span className="inline xs:hidden">Online</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowHelp(true); }}
              title="How it works"
              className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${
                isDark ? 'border-white/10 bg-white/5 text-emerald-400 hover:bg-white/10' : 'border-black/10 bg-black/5 text-emerald-600 hover:bg-black/10'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsDark(!isDark); }}
              className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${
                isDark ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10' : 'border-black/10 bg-black/5 text-black/80 hover:bg-black/10'
              }`}
            >
              {isDark ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleReset(); }}
              title="Reset Knowledge Base"
              className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${
                isDark ? 'border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20' : 'border-red-500/20 bg-red-500/5 text-red-600 hover:bg-red-500/10'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        </header>
        <main
          ref={chatRef}
          className="flex-1 space-y-6 overflow-y-auto pr-2 scroll-smooth pb-4 scrollbar-none"
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border shadow-2xl backdrop-blur-xl transition-all duration-700 ${
                isDark ? 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10' : 'bg-white text-black border-black/10 hover:bg-gray-50 shadow-black/5'
              }`}>
                 <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight px-4 text-center">How can I help you today?</h2>
              <p className={`mt-4 max-w-md px-6 text-[13px] sm:text-[15px] leading-relaxed ${isDark ? 'text-white/60' : 'text-black/60'} text-center`}>
                Start chatting to search your knowledge base. Use the + button below to ingest new GitHub repositories or upload local documents.
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <div 
              key={`${message.role}-${index}`} 
              className={`flex items-start gap-4 transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-2 ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {message.role === 'assistant' ? <AIBoxIcon isDark={isDark} /> : <UserIcon isDark={isDark} />}
              <div
                className={`max-w-[88%] rounded-2xl sm:rounded-3xl px-4 py-3 sm:px-5 sm:py-4 text-[14px] sm:text-[15px] leading-relaxed sm:max-w-[75%] ${
                  message.role === 'user'
                    ? (isDark ? 'bg-white text-black font-medium shadow-xl' : 'bg-black text-white font-medium shadow-xl')
                    : (isDark 
                        ? 'bg-black/40 text-white/90 border border-white/5 backdrop-blur-3xl shadow-xl shadow-black/50 font-light' 
                        : 'bg-white text-black/90 border border-black/5 backdrop-blur-3xl shadow-xl shadow-black/5 font-light')
                }`}
              >
                <div className={`font-sans ${isDark && message.role !== 'user' ? 'text-white' : ''} ${(message.role === 'user' && isDark) ? 'text-black' : ''}`}>
                  {renderText(message.content, isDark, message.role === 'user')}
                </div>
                {message.role === 'assistant' && Array.isArray(message.sources) && message.sources.length > 0 && (
                  <div className="mt-8 border-t border-white/5 pt-5">
                    <div className="mb-4 flex items-center gap-2">
                      <div className={`h-4 w-1 rounded-full ${isDark ? 'bg-emerald-500' : 'bg-emerald-600'}`}></div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                        Verified Sources
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {Array.from(new Set(message.sources.map(s => {
                        const match = s.match(/^\[Source: (.*?)\]/)
                        return match ? match[1] : s
                      }))).map((uniqueSourceTitle, sourceIndex) => {
                        const isUrl = uniqueSourceTitle.startsWith('http')
                        const truncatedTitle = uniqueSourceTitle.length > 30 ? uniqueSourceTitle.substring(0, 30) + '...' : uniqueSourceTitle
                        const previewChunk = message.sources.find(s => s.includes(`[Source: ${uniqueSourceTitle}]`)) || 'No preview available'

                        if (isUrl) {
                          return (
                            <a 
                              key={`${index}-source-${sourceIndex}`}
                              href={uniqueSourceTitle}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`group flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-medium transition-all backdrop-blur-md ${
                                isDark 
                                  ? 'border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:bg-white/10 hover:text-white' 
                                  : 'border-black/5 bg-black/5 text-black/60 hover:border-black/20 hover:bg-black/10 hover:text-black'
                              }`}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100">
                                <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              </svg>
                              {truncatedTitle}
                            </a>
                          )
                        }
                        return (
                          <div 
                            key={`${index}-source-${sourceIndex}`}
                            className={`group relative flex cursor-help items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-medium transition-all backdrop-blur-md ${
                              isDark 
                                ? 'border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white' 
                                : 'border-black/5 bg-black/5 text-black/60 hover:border-black/20 hover:text-black'
                            }`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                              <polyline points="10 9 9 9 8 9" />
                            </svg>
                            {truncatedTitle}
                            <div className={`absolute bottom-full left-1/2 mb-2 w-72 -translate-x-1/2 scale-95 opacity-0 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 z-50 rounded-2xl border p-3.5 shadow-2xl backdrop-blur-3xl flex flex-col ${
                              isDark ? 'bg-zinc-900/95 border-white/10 text-white/80' : 'bg-white/95 border-black/10 text-black/80'
                            }`}>
                              <div className={`mb-2 font-mono text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                Data Preview
                              </div>
                              <div className="max-h-40 overflow-y-auto text-[10px] leading-relaxed font-mono scrollbar-thin scrollbar-thumb-white/10 pr-1 text-left whitespace-pre-wrap">
                                {previewChunk}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-4 transition-all duration-300">
              <AIBoxIcon isDark={isDark} />
              <div className={`rounded-3xl border px-6 py-4 shadow-2xl backdrop-blur-2xl ${
                isDark ? 'border-white/5 bg-black/40' : 'border-black/5 bg-white'
              }`}>
                <Loader isDark={isDark} label={loadingStatus} />
              </div>
            </div>
          )}
        </main>
        <footer className="relative mt-2 shrink-0 pb-2">
          {}
          {showMenu && (
             <div 
               className={`absolute bottom-full left-1 mb-3 w-48 rounded-2xl border shadow-2xl p-1.5 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-20 ${
                 isDark ? 'bg-zinc-900/90 border-white/10' : 'bg-white/90 border-black/10'
               }`}
             >
                <button 
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); setShowMenu(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isDark ? 'text-white/80 hover:bg-white/10' : 'text-black/80 hover:bg-black/5'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload Document
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIngestMode('github'); setShowMenu(false); setInput(''); inputRef.current?.focus(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isDark ? 'text-white/80 hover:bg-white/10' : 'text-black/80 hover:bg-black/5'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                  </svg>
                  Add GitHub Repo
                </button>
             </div>
          )}
          {}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".txt,.pdf,.md,.json,.csv"
          />
          {error && (
            <div className="absolute -top-12 left-0 right-0 flex justify-center animate-in fade-in slide-in-from-bottom-2">
              <div className="rounded-full bg-red-500/10 px-4 py-1.5 text-xs font-medium text-red-500 border border-red-500/20 backdrop-blur-xl shadow-lg">
                {error}
              </div>
            </div>
          )}
          <div className={`group relative overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-3xl transition-all flex items-end ${
            isDark 
              ? 'border-white/10 bg-black/60 focus-within:border-white/30 focus-within:bg-black/80' 
              : 'border-black/10 bg-white/60 focus-within:border-black/30 focus-within:bg-white/80'
          } ${ingestMode ? (isDark ? 'ring-2 ring-emerald-500/50' : 'ring-2 ring-emerald-600/50') : 'hover:border-zinc-500/50'}`}>
            {}
            <div className="absolute left-3 bottom-3 z-10 flex items-center gap-2">
              {ingestMode ? (
                <button
                  onClick={() => setIngestMode(null)}
                  title="Cancel Ingestion"
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
                    isDark ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10'
                  }`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              ) : (
                <div className="relative flex items-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                    title="Add Knowledge Source"
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
                      showMenu 
                        ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                        : (isDark ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
                    } ${messages.length === 0 && !input ? 'animate-pulse ring-2 ring-emerald-500/30' : ''}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${showMenu ? 'rotate-45' : ''}`}>
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                  {messages.length === 0 && !input && !showMenu && (
                    <div className="absolute bottom-full left-0 mb-4 animate-bounce pointer-events-none">
                      <div className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider shadow-2xl backdrop-blur-xl border ${
                        isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}>
                        Add Context
                        <div className={`absolute top-full left-4 -mt-1 h-2 w-2 rotate-45 border-b border-r ${
                          isDark ? 'bg-zinc-900 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                        }`}></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={ingestMode === 'github' ? "Paste GitHub URL..." : "Ask Knowra AI anything..."}
              rows={1}
              style={{ maxHeight: '200px' }}
              className={`w-full resize-none border-0 bg-transparent py-4 pl-12 sm:pl-16 pr-12 sm:pr-28 text-[14px] sm:text-[15px] leading-relaxed focus:outline-none focus:ring-0 ${
                isDark ? 'text-white placeholder:text-white/40' : 'text-black placeholder:text-black/40'
              } ${ingestMode ? 'font-mono text-xs sm:text-sm' : ''}`}
            />
            <button
              onClick={handleSend}
              disabled={!autoTrimmedInput || loading}
              className={`absolute bottom-3 right-3 flex h-10 px-4 items-center justify-center rounded-2xl transition-all shadow-lg overflow-hidden ${
                ingestMode === 'github'
                  ? (isDark ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-emerald-600 text-white hover:bg-emerald-700')
                  : (isDark 
                      ? 'bg-white text-black disabled:bg-white/10 disabled:text-white/30 hover:bg-zinc-100' 
                      : 'bg-black text-white disabled:bg-black/10 disabled:text-black/30 hover:bg-zinc-900')
              } disabled:scale-95 disabled:cursor-not-allowed hover:scale-105 active:scale-95 disabled:hover:scale-95`}
            >
              <div className="flex items-center gap-2">
                {ingestMode === 'github' ? (
                  <>
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight">Ingest Repo</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </>
                ) : (
                  <>
                    {autoTrimmedInput && <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight animate-in fade-in slide-in-from-right-2">Send</span>}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="translate-x-[1px]">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </div>
            </button>
          </div>
          <div className={`mt-3 flex justify-center gap-4 text-xs font-semibold ${isDark ? 'text-white/30' : 'text-black/40'}`}>
            <span>AI can make mistakes. Verify important information.</span>
            <span className={`w-1 h-1 rounded-full self-center ${isDark ? 'bg-white/20' : 'bg-black/20'}`}></span>
            <span>Powered by your Data</span>
          </div>
        </footer>
      </div>
      {showHelp && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setShowHelp(false)}
        >
          <div 
            className={`relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border p-6 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300 ${
              isDark ? 'bg-zinc-900/90 border-white/10 text-white' : 'bg-white/90 border-black/10 text-black'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowHelp(false)}
              className="absolute right-6 top-6 p-2 rounded-xl hover:bg-white/5 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg border ${
                isDark ? 'bg-white/5 border-white/10 text-emerald-400' : 'bg-black/5 border-black/10 text-emerald-600'
              }`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">How Knowra Works</h2>
                <p className={`text-sm opacity-60`}>Your AI-powered context engine</p>
              </div>
            </div>

            <div className="grid gap-8">
              <section>
                <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-500 mb-4">Getting Started</h3>
                <div className="grid gap-4">
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                       <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500 text-[10px]">1</span>
                       Adding Knowledge
                    </h4>
                    <p className="text-xs opacity-60 leading-relaxed mb-3">Click the <span className="font-bold">+</span> button in the chat bar to open the ingestion menu.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase opacity-40 italic">For Documents</span>
                        <p className="text-[11px] opacity-70">Select <span className="font-medium text-emerald-500">Upload Document</span> for PDF, TXT, or Markdown files.</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase opacity-40 italic">For Codebases</span>
                        <p className="text-[11px] opacity-70">Select <span className="font-medium text-emerald-500">Add GitHub Repo</span> and paste the full repository URL.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-500 mb-4">Core Concepts</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <h4 className="font-bold text-sm mb-1">RAG Engine</h4>
                    <p className="text-xs opacity-60 leading-relaxed">Retrieval-Augmented Generation ensures answers are grounded in your actual documents, not generic AI knowledge.</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <h4 className="font-bold text-sm mb-1">Vector Storage</h4>
                    <p className="text-xs opacity-60 leading-relaxed">Data is split into "chunks" and converted into high-dimensional vectors for lightning-fast semantic retrieval.</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-500 mb-4">Features</h3>
                <ul className="grid gap-4">
                  <li className="flex items-start gap-4">
                    <div className={`mt-1 h-5 w-5 shrink-0 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5 text-white/80' : 'bg-black/5 text-black/80'}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">GitHub Ingestion</h4>
                      <p className="text-[11px] sm:text-xs opacity-60 leading-relaxed">Paste a repo URL. We clone it, scan all code files, and index them in the background so you can chat with your entire codebase.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className={`mt-1 h-5 w-5 shrink-0 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5 text-white/80' : 'bg-black/5 text-black/80'}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Advanced PDF Processing</h4>
                      <p className="text-[11px] sm:text-xs opacity-60 leading-relaxed">Beyond text—we extract metadata and even internal URI links to provide deep citations for scientific papers and professional reports.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className={`mt-1 h-5 w-5 shrink-0 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5 text-white/80' : 'bg-black/5 text-black/80'}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Verified Sources</h4>
                      <p className="text-[11px] sm:text-xs opacity-60 leading-relaxed">Every AI response includes a badge showig where the info came from. Hover to see a raw data preview of that source.</p>
                    </div>
                  </li>
                </ul>
              </section>

              <div className={`rounded-2xl p-4 text-center border ${isDark ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className="text-[11px] font-medium opacity-80">Knowra handles large datasets in the background. If you ingest a heavy repo, check back in a few moments!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
