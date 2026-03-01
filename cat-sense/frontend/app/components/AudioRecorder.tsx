'use client'
import { useState, useRef } from 'react'
import { uploadAudio } from '../api'
import { useT } from '../i18n/TranslationContext'
import VibrationGraph from './VibrationGraph'

interface AudioResult {
  dominant_frequency_hz: number
  anomaly_detected: boolean
  anomaly_type: string
  severity: string
}
interface Props {
  sessionId: string
  onResult: (r: AudioResult) => void
}

const SEV_BORDER: Record<string, string> = {
  Minor:    'border-green-500',
  Moderate: 'border-cat',
  Severe:   'border-red-500',
}
const SEV_BADGE: Record<string, string> = {
  Minor:    'bg-green-950 text-green-400 border-green-900',
  Moderate: 'bg-yellow-950 text-yellow-400 border-yellow-900',
  Severe:   'bg-red-950 text-red-400 border-red-900',
}

export default function AudioRecorder({ sessionId, onResult }: Props) {
  const { t } = useT()
  const [result, setResult] = useState<AudioResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [filename, setFilename] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setFilename(file.name)
    setLoading(true)
    setResult(null)
    try {
      const data = await uploadAudio(file, sessionId)
      setResult(data)
      onResult(data)
    } catch {
      setResult({ dominant_frequency_hz: 0, anomaly_detected: false, anomaly_type: 'error', severity: 'Minor' })
    } finally {
      setLoading(false)
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
        handleFile(new File([blob], 'recording.wav', { type: 'audio/wav' }))
        stream.getTracks().forEach(tr => tr.stop())
      }
      mediaRef.current = mr
      mr.start()
      setRecording(true)
    } catch {
      alert('Microphone access denied.')
    }
  }

  function stopRecording() {
    mediaRef.current?.stop()
    setRecording(false)
  }

  const border = result ? (SEV_BORDER[result.severity] ?? SEV_BORDER.Moderate) : ''
  const badge = result ? (SEV_BADGE[result.severity] ?? SEV_BADGE.Moderate) : ''

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="border-b border-[#1A1A1A] pb-3 mb-4">
        <h2 className="font-condensed font-black text-white text-2xl uppercase leading-none">{t('tabAudio')}</h2>
        <p className="text-[#444] text-sm mt-1">FFT frequency analysis &amp; anomaly detection</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex-1 bg-cat-black border border-cat/20 py-3 text-xs font-condensed font-bold text-cat/40 uppercase tracking-widest hover:border-cat/60 hover:text-cat hover:bg-cat/5 hover:shadow-[0_0_16px_rgba(255,205,17,0.15)] active:scale-[0.97] transition-all duration-150"
        >
          {t('uploadAudioFile')}
        </button>
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`flex-1 py-3 text-sm font-condensed font-black uppercase tracking-widest transition-all duration-150 active:scale-[0.97] ${
            recording
              ? 'bg-red-600 text-white hover:bg-red-500 hover:shadow-[0_0_24px_rgba(239,68,68,0.5)]'
              : 'bg-cat text-black hover:bg-yellow-300 hover:shadow-[0_0_32px_rgba(255,205,17,0.6)]'
          }`}
        >
          {recording ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-white animate-pulse" />
              {t('stopRecording')}
            </span>
          ) : t('recordAudio')}
        </button>
        <input ref={inputRef} type="file" accept=".wav,.mp3,.m4a,.ogg" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      {filename && <p className="text-[11px] text-[#444] text-center font-condensed uppercase tracking-wider truncate">{filename}</p>}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4">
          <span className="w-2 h-2 bg-cat animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-cat animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-cat animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="text-cat text-sm ml-2 font-condensed font-black uppercase tracking-widest">{t('runningFFT')}</span>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-3 animate-fade-slide-in">
          <div className={`bg-cat-black border-l-4 ${border} p-4 space-y-4`}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-cat font-condensed font-black uppercase tracking-widest">{t('fftAnalysis')}</span>
              <span className={`text-xs font-condensed font-bold px-2.5 py-1 border ${badge}`}>
                {result.severity}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111] border border-[#2A2A2A] p-4">
                <p className="text-[9px] text-[#444] font-condensed font-bold uppercase tracking-widest mb-2">{t('dominantFrequency')}</p>
                <p className="text-white font-mono font-black text-3xl leading-none">
                  {result.dominant_frequency_hz.toFixed(1)}
                  <span className="text-sm text-[#444] font-normal ml-1">Hz</span>
                </p>
              </div>
              <div className="bg-[#111] border border-[#2A2A2A] p-4">
                <p className="text-[9px] text-[#444] font-condensed font-bold uppercase tracking-widest mb-2">{t('anomalyType')}</p>
                <p className="text-white font-condensed font-bold text-lg uppercase capitalize">{result.anomaly_type}</p>
              </div>
            </div>
          </div>
          <VibrationGraph
            frequencyHz={result.dominant_frequency_hz}
            anomalyType={result.anomaly_type}
            severity={result.severity}
          />
        </div>
      )}
    </div>
  )
}
