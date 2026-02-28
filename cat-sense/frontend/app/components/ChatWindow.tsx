'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { fetchChat } from '../api'
import MessageBubble from './MessageBubble'

interface Diagnosis {
  diagnosis_summary: string
  probable_causes: string[]
  severity: string
  failure_probability: string
  estimated_cost: string
  recommended_action: string
}
interface Message {
  role: 'user' | 'assistant'
  content: string
  diagnosis?: Diagnosis
  timestamp: string
}
interface Props {
  sessionId: string
  onDiagnosis: (d: Diagnosis) => void
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 items-end mb-4">
      <div className="w-7 h-7 rounded-lg bg-[#FFC200] flex items-center justify-center text-gray-900 font-bold text-[10px] flex-shrink-0">
        CAT
      </div>
      <div className="bg-gray-800 border border-gray-700/50 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-500"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  'What are the most likely failure modes?',
  'How urgent is the maintenance needed?',
  'Estimate repair cost breakdown.',
  'What caused this fault pattern?',
]

export default function ChatWindow({ sessionId, onDiagnosis }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'CAT Sense online. Upload sensor data from the Vision, Audio, or Sensors tabs — then ask me anything about your equipment.',
      timestamp: now(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    setShowSuggestions(false)
    setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: now() }])
    setLoading(true)
    try {
      const data = await fetchChat(trimmed, sessionId)
      const diagnosis: Diagnosis = data.diagnosis ?? {}
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.reply, diagnosis, timestamp: now() },
      ])
      if (data.diagnosis?.severity) onDiagnosis(data.diagnosis)
      if (data.audio_url && audioRef.current) {
        audioRef.current.src = `http://localhost:8000${data.audio_url}`
        audioRef.current.play().catch(() => {})
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Could not reach the backend. Make sure the server is running on port 8000.', timestamp: now() },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [loading, sessionId, onDiagnosis])

  return (
    <div className="flex flex-col h-full">
      <audio ref={audioRef} hidden />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 scroll-smooth">
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            role={m.role}
            content={m.content}
            diagnosis={m.diagnosis}
            timestamp={m.timestamp}
            isLast={i === messages.length - 1}
          />
        ))}

        {loading && <TypingIndicator />}

        {/* Suggestion chips — shown only at start */}
        {showSuggestions && !loading && messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-4 pl-9">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 hover:border-[#FFC200] hover:text-[#FFC200] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-gray-800 px-3 py-3">
        <div className="flex gap-2 items-center bg-gray-800 rounded-2xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#FFC200]/40 transition-all">
          <input
            ref={inputRef}
            className="flex-1 bg-transparent py-1.5 text-sm text-gray-100 placeholder-gray-500 outline-none"
            placeholder="Ask about your equipment…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            disabled={loading}
            maxLength={1000}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-xl bg-[#FFC200] text-gray-900 flex items-center justify-center flex-shrink-0 disabled:opacity-30 hover:bg-yellow-300 transition-colors"
            aria-label="Send"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-700 text-center mt-1.5">Enter to send · Responses powered by Gemini</p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
