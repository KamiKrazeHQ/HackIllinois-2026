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
    <div className="flex gap-3 items-end mb-5">
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="bg-cat w-8 h-8 rounded-full flex items-center justify-center shadow-[0_0_16px_rgba(255,205,17,0.6)] animate-cat-pulse">
          <span className="font-condensed font-black text-black text-[9px] leading-none">CAT</span>
        </div>
        <span className="text-[7px] text-cat/40 font-condensed uppercase tracking-wide">AI</span>
      </div>
      <div className="bg-[#111827] border border-white/5 rounded-xl px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div className="flex gap-1.5 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 bg-cat rounded-full"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`, boxShadow: '0 0 6px rgba(255,205,17,0.8)' }}
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

  // Re-translate all messages when language changes
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
    <div className="flex flex-col h-full relative" style={{ background: 'radial-gradient(ellipse at top left, #1e293b 0%, #090D14 60%)' }}>
      {/* Ambient glow blob */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[#FFD700] opacity-[0.055] blur-3xl" />
      </div>

      <audio ref={audioRef} hidden />

      {/* Messages area */}
      <div className={`flex-1 overflow-y-auto px-6 pt-6 pb-2 scroll-smooth relative transition-all duration-500 ${loading ? 'animate-border-pulse' : ''}`}>
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

        {/* Suggestion chips */}
        {showSuggestions && !loading && messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-4 pl-10">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-cat/60 font-condensed font-bold uppercase tracking-wide hover:border-cat/50 hover:text-cat hover:bg-cat/8 hover:shadow-[0_0_16px_rgba(255,205,17,0.2)] active:scale-[0.97] -translate-y-0 hover:-translate-y-[2px] transition-all duration-150"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Error banner */}
        {errorText && !loading && (
          <div className="mb-4 pl-10 animate-fade-slide-in">
            <div className="bg-red-950/30 border-l-2 border-red-500 px-4 py-3 flex items-start gap-3">
              <span className="text-red-500 text-base mt-0.5 flex-shrink-0">⚠</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-400">{errorText}</p>
                {failedMessage && (
                  <button
                    onClick={() => send(failedMessage)}
                    className="mt-1.5 text-xs text-red-500 hover:text-red-300 underline underline-offset-2 transition-colors font-condensed font-bold uppercase"
                  >
                    Retry: &ldquo;{failedMessage.length > 40 ? failedMessage.slice(0, 40) + '…' : failedMessage}&rdquo;
                  </button>
                )}
              </div>
              <button
                onClick={() => { setErrorText(null); setFailedMessage(null) }}
                className="text-red-900 hover:text-red-600 text-xl leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Inline widget panel */}
        {activeWidget && !loading && (
          <div className="mb-4 pl-10">
            <div className="bg-cat-black border-l-4 border-cat overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2A2A2A]">
                <span className="text-xs font-condensed font-black text-cat uppercase tracking-widest">{WIDGET_LABEL[activeWidget]}</span>
                <button
                  onClick={() => setActiveWidget(null)}
                  className="text-[#444] hover:text-[#888] text-xl leading-none transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="p-4">
                {activeWidget === 'image'   && <ImageUpload sessionId={sessionId} onResult={handleVisionResult} />}
                {activeWidget === 'audio'   && <AudioRecorder sessionId={sessionId} onResult={handleAudioResult} />}
                {activeWidget === 'sensors' && <SensorInput sessionId={sessionId} onResult={handleRiskResult} />}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Floating input bar */}
      <div
        className="flex-shrink-0 relative px-4 py-4"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: 'rgba(9,13,20,0.92)',
          boxShadow: 'inset 0 1px 0 rgba(255,205,17,0.25), inset 0 4px 32px rgba(255,205,17,0.06), 0 -8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Gradient fade line above input */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cat/60 to-transparent" />
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            className="flex-1 bg-[#0f1624] border-2 border-cat/40 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-cat/30 outline-none focus:border-cat focus:bg-[#111d2e] transition-all duration-150"
            onFocus={e => {
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,205,17,0.18), 0 0 32px rgba(255,205,17,0.12)'
            }}
            onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
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
            className="h-11 px-6 bg-cat text-cat-black font-condensed font-black uppercase tracking-widest text-sm flex-shrink-0 disabled:opacity-20 rounded-xl border-2 border-cat hover:bg-yellow-300 hover:border-yellow-300 hover:-translate-y-[2px] hover:shadow-[0_0_36px_rgba(255,205,17,0.8),0_4px_16px_rgba(255,205,17,0.3)] active:scale-[0.96] active:translate-y-0 transition-all duration-100"
            aria-label="Send"
          >
            SEND
          </button>
        </div>
        <p className="text-[10px] text-cat/20 text-center mt-2 font-condensed uppercase tracking-widest">{t('chatFooter')}</p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
