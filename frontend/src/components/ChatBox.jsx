import { useEffect, useMemo, useRef, useState } from 'react'
import { sendChatMessage } from '../services/api'

function Loader({ isDark }) {
  const dotColor = isDark ? 'bg-white/70' : 'bg-black/60'
  return (
    <div className="flex items-center gap-1.5 py-2 px-1">
      <span className={`h-1.5 w-1.5 animate-bounce rounded-full ${dotColor} [animation-delay:-0.3s]`} />
      <span className={`h-1.5 w-1.5 animate-bounce rounded-full ${dotColor} [animation-delay:-0.15s]`} />
      <span className={`h-1.5 w-1.5 animate-bounce rounded-full ${dotColor}`} />
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

export default function ChatBox() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId] = useState(() => `user-${Math.random().toString(36).slice(2, 10)}`)
  const [isDark, setIsDark] = useState(true)

  const chatRef = useRef(null)
  const inputRef = useRef(null)
  const trimmedInput = useMemo(() => input.trim(), [input])

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
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
    }
  }, [input])

  async function handleSend() {
    if (!trimmedInput || loading) return

    const question = trimmedInput
    setInput('')
    setError('')

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question },
    ])

    setLoading(true)
    try {
      const result = await sendChatMessage(question, userId)
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

  const containerStyle = isDark ? {
    backgroundColor: '#000000',
    backgroundImage: `
      radial-gradient(ellipse at 50% -20%, rgba(255, 255, 255, 0.15), transparent 60%),
      radial-gradient(ellipse at 50% 120%, rgba(255, 255, 255, 0.05), transparent 50%)
    `,
    color: '#ffffff'
  } : {
    backgroundColor: '#ffffff',
    backgroundImage: `
      radial-gradient(ellipse at 50% -20%, rgba(0, 0, 0, 0.05), transparent 60%),
      radial-gradient(ellipse at 50% 120%, rgba(0, 0, 0, 0.02), transparent 50%)
    `,
    color: '#000000'
  }

  return (
    <div 
      className="min-h-screen w-full transition-colors duration-500 ease-in-out font-sans overflow-hidden"
      style={containerStyle}
    >
      <div className="mx-auto flex h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-8">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl flex items-center gap-2">
              Knowra AI
            </h1>
            <p className={`mt-1 text-sm font-medium tracking-wide ${isDark ? 'text-white/50' : 'text-black/50'}`}>
              RAG FOR GITHUB REPOS & DOCUMENTS
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-colors ${
              isDark ? 'border-white/10 bg-white/5 text-white/90' : 'border-black/10 bg-black/5 text-black/90'
            }`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              </span>
              System Online
            </div>

            <button 
              onClick={() => setIsDark(!isDark)}
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
          </div>
        </header>

        <main
          ref={chatRef}
          className="flex-1 space-y-6 overflow-y-auto pr-2 scroll-smooth scrollbar-none"
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-700 ${
                isDark ? 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10' : 'bg-black/5 text-black/70 border-black/10 hover:bg-black/10 shadow-black/5'
              }`}>
                 <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">How can I help you today?</h2>
              <p className={`mt-4 max-w-md text-[15px] leading-relaxed ${isDark ? 'text-white/50' : 'text-black/60'}`}>
                Query your indexed GitHub repositories and documents. I utilize retrieval-augmented generation to provide accurate, transparent answers sourced directly from your knowledge base.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div 
              key={`${message.role}-${index}`} 
              className={`flex items-start gap-4 transition-all duration-500 ease-out ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {message.role === 'assistant' ? <AIBoxIcon isDark={isDark} /> : <UserIcon isDark={isDark} />}
              
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-4 text-[15px] leading-relaxed sm:max-w-[75%] ${
                  message.role === 'user'
                    ? (isDark ? 'bg-white text-black font-medium shadow-xl' : 'bg-black text-white font-medium shadow-xl')
                    : (isDark 
                        ? 'bg-white/5 text-white/90 border border-white/10 backdrop-blur-xl shadow-2xl shadow-white/5 font-light' 
                        : 'bg-black/5 text-black/90 border border-black/10 backdrop-blur-xl shadow-2xl shadow-black/5 font-light')
                }`}
              >
                <div className={`prose max-w-none whitespace-pre-wrap font-sans ${isDark ? 'prose-invert' : ''}`}>
                  {message.content}
                </div>

                {message.role === 'assistant' && Array.isArray(message.sources) && message.sources.length > 0 && (
                  <div className={`mt-5 flex flex-wrap gap-2 pt-4 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                    {message.sources.map((source, sourceIndex) => (
                      <a 
                        key={`${index}-source-${sourceIndex}`}
                        href={source.startsWith('http') ? source : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all backdrop-blur-md ${
                          isDark 
                            ? 'border-white/10 bg-black/40 text-white/60 hover:border-white/30 hover:bg-white/10 hover:text-white' 
                            : 'border-black/10 bg-black/5 text-black/60 hover:border-black/20 hover:bg-black/10 hover:text-black'
                        }`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:opacity-100">
                          <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        </svg>
                        {source.length > 50 ? source.substring(0, 50) + '...' : source}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-4 transition-all duration-300">
              <AIBoxIcon isDark={isDark} />
              <div className={`rounded-2xl border px-6 py-4 shadow-2xl backdrop-blur-xl ${
                isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5'
              }`}>
                <Loader isDark={isDark} />
              </div>
            </div>
          )}
        </main>

        <footer className="relative mt-4 shrink-0 pb-4">
          {error && (
            <div className="absolute -top-12 left-0 right-0 flex justify-center transition-all duration-300">
              <div className="rounded-full bg-red-500/10 px-4 py-1.5 text-xs font-medium text-red-500 border border-red-500/20 backdrop-blur-xl shadow-lg">
                {error}
              </div>
            </div>
          )}

          <div className={`group relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all ${
            isDark 
              ? 'border-white/10 bg-white/5 focus-within:border-white/30 focus-within:bg-white/10 hover:border-white/20' 
              : 'border-black/10 bg-black/5 focus-within:border-black/30 focus-within:bg-black/10 hover:border-black/20'
          }`}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your knowledge base..."
              rows={1}
              style={{ maxHeight: '200px' }}
              className={`w-full resize-none border-0 bg-transparent py-4 pl-5 pr-14 text-[15px] leading-relaxed focus:outline-none focus:ring-0 ${
                isDark ? 'text-white placeholder:text-white/40' : 'text-black placeholder:text-black/40'
              }`}
            />

            <button
              onClick={handleSend}
              disabled={!trimmedInput || loading}
              className={`absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-xl transition-all shadow-lg ${
                isDark 
                  ? 'bg-white text-black disabled:bg-white/10 disabled:text-white/30' 
                  : 'bg-black text-white disabled:bg-black/10 disabled:text-black/30'
              } disabled:scale-95 disabled:cursor-not-allowed hover:scale-105 active:scale-95 disabled:hover:scale-95`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="translate-x-[1px]">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className={`mt-4 flex justify-center gap-4 text-[11px] font-medium ${isDark ? 'text-white/30' : 'text-black/40'}`}>
            <span>AI can make mistakes. Verify important information.</span>
            <span className={`w-1 h-1 rounded-full self-center ${isDark ? 'bg-white/20' : 'bg-black/20'}`}></span>
            <span>Powered by your Data</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
