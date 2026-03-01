'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { fetchChat, ApiError, translateTexts } from '../api'
import { useT } from '../i18n/TranslationContext'
import MessageBubble from './MessageBubble'
import ImageUpload from './ImageUpload'
import AudioRecorder from './AudioRecorder'
import SensorInput from './SensorInput'

interface Diagnosis {
  diagnosis_summary: string
  probable_causes: string[]
  severity: string
  failure_probability: string
  estimated_cost: string
  recommended_action: string
}
interface VisionResult { description: string; detected_issues: string[]; severity: string }
interface AudioResult { dominant_frequency_hz: number; anomaly_detected: boolean; anomaly_type: string; severity: string }
interface RiskResult { failure_probability_14_days: number; estimated_downtime_cost_usd: number; recommended_action_window: string; risk_level: string }

interface DisplayDiagnosis {
  probable_causes?: string[]
  recommended_action?: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  displayContent?: string
  diagnosis?: Diagnosis
  displayDiagnosis?: DisplayDiagnosis
  timestamp: string
}
interface Props {
  sessionId: string
  onDiagnosis: (d: Diagnosis) => void
  onVision?: (r: VisionResult) => void
  onAudio?: (r: AudioResult) => void
  onRisk?: (r: RiskResult) => void
}

type WidgetType = 'image' | 'audio' | 'sensors' | null

function detectWidget(text: string): WidgetType {
  if (/upload.*(photo|image|picture)|share.*image|send.*photo|photo.*equipment|attach.*image/i.test(text)) return 'image'
  if (/record.*(audio|sound)|upload.*audio|audio.*sample|sound.*sample|microphone/i.test(text)) return 'audio'
  if (/temperature|pressure|sensor.*read|thermal|operating temp|enter.*reading/i.test(text)) return 'sensors'
  return null
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

export default function ChatWindow({ sessionId, onDiagnosis, onVision, onAudio, onRisk }: Props) {
  const { t, lang } = useT()

  const SUGGESTIONS = [
    t('chatSuggestion0'),
    t('chatSuggestion1'),
    t('chatSuggestion2'),
    t('chatSuggestion3'),
  ]

  const WIDGET_LABEL: Record<NonNullable<WidgetType>, string> = {
    image: t('widgetImage'),
    audio: t('widgetAudio'),
    sensors: t('widgetSensors'),
  }
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
  const [activeWidget, setActiveWidget] = useState<WidgetType>(null)
  const [failedMessage, setFailedMessage] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const messagesRef = useRef<Message[]>(messages)

  useEffect(() => { messagesRef.current = messages }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, activeWidget])

  useEffect(() => {
    const current = messagesRef.current
    if (lang === 'en') {
      if (current.some(m => m.displayContent || m.displayDiagnosis)) {
        setMessages(prev => prev.map(m => ({ ...m, displayContent: undefined, displayDiagnosis: undefined })))
      }
      return
    }
    type Seg = { msgIdx: number; field: 'reply' | 'cause' | 'action'; causeIdx?: number }
    const texts: string[] = []
    const segs: Seg[] = []
    current.forEach((m, msgIdx) => {
      if (m.role !== 'assistant') return
      texts.push(m.content)
      segs.push({ msgIdx, field: 'reply' })
      m.diagnosis?.probable_causes?.forEach((c, causeIdx) => {
        texts.push(c)
        segs.push({ msgIdx, field: 'cause', causeIdx })
      })
      if (m.diagnosis?.recommended_action) {
        texts.push(m.diagnosis.recommended_action)
        segs.push({ msgIdx, field: 'action' })
      }
    })
    if (texts.length === 0) return
    translateTexts(texts, lang)
      .then((data: { translations: string[] }) => {
        const displayContents: Record<number, string> = {}
        const displayDiagnoses: Record<number, DisplayDiagnosis> = {}
        segs.forEach(({ msgIdx, field, causeIdx }, i) => {
          const translated = data.translations[i]
          if (field === 'reply') {
            displayContents[msgIdx] = translated
          } else if (field === 'cause' && causeIdx !== undefined) {
            if (!displayDiagnoses[msgIdx]) displayDiagnoses[msgIdx] = { probable_causes: [] }
            displayDiagnoses[msgIdx].probable_causes![causeIdx] = translated
          } else if (field === 'action') {
            if (!displayDiagnoses[msgIdx]) displayDiagnoses[msgIdx] = {}
            displayDiagnoses[msgIdx].recommended_action = translated
          }
        })
        setMessages(prev => prev.map((m, idx) => ({
          ...m,
          displayContent: displayContents[idx] ?? m.displayContent,
          displayDiagnosis: displayDiagnoses[idx] ?? m.displayDiagnosis,
        })))
      })
      .catch(console.error)
  }, [lang])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    setShowSuggestions(false)
    setActiveWidget(null)
    setFailedMessage(null)
    setErrorText(null)
    setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: now() }])
    setLoading(true)
    try {
      const data = await fetchChat(trimmed, sessionId)
      const diagnosis: Diagnosis = data.diagnosis ?? {}
      const reply: string = data.reply ?? ''
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: reply, diagnosis, timestamp: now() },
      ])
      if (lang !== 'en') {
        const causes = diagnosis?.probable_causes ?? []
        const action = diagnosis?.recommended_action ?? ''
        const batch = [reply, ...causes, ...(action ? [action] : [])]
        translateTexts(batch, lang)
          .then((res: { translations: string[] }) => {
            const translatedReply = res.translations[0]
            let tIdx = 1
            const translatedCauses = causes.map(() => res.translations[tIdx++])
            const translatedAction = action ? res.translations[tIdx] : undefined
            setMessages(prev => {
              const updated = [...prev]
              const last = updated.length - 1
              if (updated[last]?.content === reply && updated[last].role === 'assistant') {
                updated[last] = {
                  ...updated[last],
                  displayContent: translatedReply,
                  displayDiagnosis: {
                    probable_causes: translatedCauses.length ? translatedCauses : undefined,
                    recommended_action: translatedAction,
                  },
                }
              }
              return updated
            })
          })
          .catch(console.error)
      }
      if (data.diagnosis?.severity) onDiagnosis(data.diagnosis)
      if (data.audio_url && audioRef.current) {
        audioRef.current.src = `http://localhost:8000${data.audio_url}`
        audioRef.current.play().catch(() => {})
      }
      setActiveWidget(detectWidget(reply))
    } catch (err) {
      const isNetwork = err instanceof TypeError
      const isApi = err instanceof ApiError
      setErrorText(
        isNetwork
          ? t('chatErrNetwork')
          : isApi && err.status >= 500
          ? `Server error (${err.status}). Try again in a moment.`
          : isApi
          ? `Request failed: ${err.message}`
          : t('chatErrGeneric')
      )
      setFailedMessage(trimmed)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [loading, sessionId, onDiagnosis, lang])

  function handleVisionResult(r: VisionResult) {
    onVision?.(r)
    setActiveWidget(null)
    send(`Vision analysis complete. Severity: ${r.severity}. Issues detected: ${r.detected_issues.join(', ') || 'none'}. Description: ${r.description}`)
  }

  function handleAudioResult(r: AudioResult) {
    onAudio?.(r)
    setActiveWidget(null)
    send(`Audio analysis complete. Dominant frequency: ${r.dominant_frequency_hz.toFixed(1)} Hz. Anomaly: ${r.anomaly_type}. Severity: ${r.severity}.`)
  }

  function handleRiskResult(r: RiskResult) {
    onRisk?.(r)
    setActiveWidget(null)
    send(`Sensor data submitted. Failure probability: ${r.failure_probability_14_days.toFixed(0)}% over 14 days. Risk level: ${r.risk_level}. Estimated downtime cost: $${r.estimated_downtime_cost_usd.toLocaleString()}.`)
  }

  return (
    <div className="flex flex-col h-full">
      <audio ref={audioRef} hidden />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 scroll-smooth">
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            role={m.role}
            content={m.displayContent ?? m.content}
            diagnosis={m.diagnosis}
            displayDiagnosis={m.displayDiagnosis}
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

        {/* Error banner with retry */}
        {errorText && !loading && (
          <div className="mb-4 pl-9 animate-fade-slide-in">
            <div className="bg-red-950/50 border border-red-800/60 rounded-2xl px-4 py-3 flex items-start gap-3">
              <span className="text-red-400 text-base mt-0.5 flex-shrink-0">⚠</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-300">{errorText}</p>
                {failedMessage && (
                  <button
                    onClick={() => send(failedMessage)}
                    className="mt-2 text-xs text-red-400 hover:text-red-200 underline underline-offset-2 transition-colors"
                  >
                    Retry: "{failedMessage.length > 40 ? failedMessage.slice(0, 40) + '…' : failedMessage}"
                  </button>
                )}
              </div>
              <button
                onClick={() => { setErrorText(null); setFailedMessage(null) }}
                className="text-red-700 hover:text-red-400 text-lg leading-none flex-shrink-0"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Inline widget — rendered after last AI message */}
        {activeWidget && !loading && (
          <div className="mb-4 pl-9">
            <div className="bg-gray-900 border border-[#FFC200]/30 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
                <span className="text-xs font-semibold text-[#FFC200]">{WIDGET_LABEL[activeWidget]}</span>
                <button
                  onClick={() => setActiveWidget(null)}
                  className="text-gray-600 hover:text-gray-400 text-lg leading-none"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
              <div className="p-4">
                {activeWidget === 'image' && (
                  <ImageUpload sessionId={sessionId} onResult={handleVisionResult} />
                )}
                {activeWidget === 'audio' && (
                  <AudioRecorder sessionId={sessionId} onResult={handleAudioResult} />
                )}
                {activeWidget === 'sensors' && (
                  <SensorInput sessionId={sessionId} onResult={handleRiskResult} />
                )}
              </div>
            </div>
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
            placeholder={t('chatPlaceholder')}
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
        <p className="text-[10px] text-gray-700 text-center mt-1.5">{t('chatFooter')}</p>
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
