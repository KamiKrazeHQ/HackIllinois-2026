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

const SEV_COLOR: Record<string, string> = {
  Minor: 'text-green-400',
  Moderate: 'text-yellow-400',
  Severe: 'text-red-400',
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

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex-1 border border-gray-700 rounded-xl py-3 text-sm text-gray-300 hover:border-gray-500 transition-colors"
        >
          {t('uploadAudioFile')}
        </button>
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
            recording
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-[#FFC200] text-gray-900 hover:bg-yellow-300'
          }`}
        >
          {recording ? t('stopRecording') : t('recordAudio')}
        </button>
        <input ref={inputRef} type="file" accept=".wav,.mp3,.m4a,.ogg" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      {filename && <p className="text-xs text-gray-500 text-center truncate">{filename}</p>}
      {loading && <p className="text-center text-[#FFC200] text-sm animate-pulse">{t('runningFFT')}</p>}

      {result && !loading && (
        <div className="space-y-3">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500 uppercase tracking-wider">{t('fftAnalysis')}</span>
              <span className={`text-sm font-semibold ${SEV_COLOR[result.severity] ?? 'text-gray-400'}`}>
                {result.severity}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">{t('dominantFrequency')}</p>
                <p className="text-white font-mono text-lg">{result.dominant_frequency_hz.toFixed(1)} Hz</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('anomalyType')}</p>
                <p className="text-white capitalize">{result.anomaly_type}</p>
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
