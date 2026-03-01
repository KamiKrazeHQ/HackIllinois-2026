'use client'
import { useState, useRef } from 'react'
import { uploadImage } from '../api'

interface ErrorFound {
  error_id: string
  category: string
  severity: string
  description: string
  location: string
  recommended_action: string
  urgency: string
}

interface RichVisionResult {
  description: string
  detected_issues: string[]
  severity: string
  overall_condition: string
  overall_score: number
  errors_found: ErrorFound[]
  positive_observations: string[]
  inspection_summary: string
  estimated_repair_priority: string
  follow_up_recommended: boolean
  follow_up_notes: string
  rekognition_labels: { name: string; confidence: number }[]
  damage_indicators: { name: string; confidence: number }[]
}

interface Props {
  sessionId: string
  onResult: (r: { description: string; detected_issues: string[]; severity: string }) => void
}

const CONDITION_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Good:     { bg: 'bg-green-900/60',  text: 'text-green-300',  border: 'border-green-700' },
  Fair:     { bg: 'bg-yellow-900/60', text: 'text-yellow-300', border: 'border-yellow-700' },
  Poor:     { bg: 'bg-red-900/60',    text: 'text-red-300',    border: 'border-red-700' },
  Critical: { bg: 'bg-red-950/80',    text: 'text-red-400',    border: 'border-red-600' },
}

const SEVERITY_STYLE: Record<string, { bg: string; text: string }> = {
  Low:      { bg: 'bg-green-900/50',  text: 'text-green-300' },
  Medium:   { bg: 'bg-yellow-900/50', text: 'text-yellow-300' },
  High:     { bg: 'bg-orange-900/50', text: 'text-orange-300' },
  Critical: { bg: 'bg-red-900/60',    text: 'text-red-300' },
}

const PRIORITY_STYLE: Record<string, { bg: string; text: string }> = {
  Routine:   { bg: 'bg-green-900/50',  text: 'text-green-300' },
  Urgent:    { bg: 'bg-orange-900/50', text: 'text-orange-300' },
  Emergency: { bg: 'bg-red-900/60',    text: 'text-red-300' },
}

const URGENCY_DOT: Record<string, string> = {
  'Monitor':                    'bg-green-500',
  'Schedule Repair':            'bg-yellow-400',
  'Immediate Action Required':  'bg-red-500',
}

function ScoreRing({ score }: { score: number }) {
  const pct = score / 10
  const r = 20
  const circ = 2 * Math.PI * r
  const filled = pct * circ
  const color = score >= 7 ? '#4ade80' : score >= 4 ? '#FFC200' : '#f87171'
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#374151" strokeWidth="4" />
      <circle
        cx="26" cy="26" r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" fill={color} fontSize="11" fontWeight="bold">{score}/10</text>
    </svg>
  )
}

export default function ImageUpload({ sessionId, onResult }: Props) {
  const [result, setResult] = useState<RichVisionResult | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    setResult(null)
    try {
      const data = await uploadImage(file, sessionId) as RichVisionResult
      setResult(data)
      onResult({ description: data.description, detected_issues: data.detected_issues, severity: data.severity })
    } catch {
      const fallback: RichVisionResult = {
        description: 'Upload failed — check backend.',
        detected_issues: [],
        severity: 'Minor',
        overall_condition: 'Fair',
        overall_score: 5,
        errors_found: [],
        positive_observations: [],
        inspection_summary: 'Upload failed — check backend.',
        estimated_repair_priority: 'Routine',
        follow_up_recommended: false,
        follow_up_notes: '',
        rekognition_labels: [],
        damage_indicators: [],
      }
      setResult(fallback)
    } finally {
      setLoading(false)
    }
  }

  const condStyle = result ? (CONDITION_STYLE[result.overall_condition] ?? CONDITION_STYLE.Fair) : null
  const prioStyle = result ? (PRIORITY_STYLE[result.estimated_repair_priority] ?? PRIORITY_STYLE.Routine) : null

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
          drag ? 'border-[#FFC200] bg-yellow-950/20' : 'border-gray-700 hover:border-gray-500'
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {preview ? (
          <img src={preview} alt="preview" className="mx-auto max-h-44 rounded-xl object-contain" />
        ) : (
          <>
            <div className="text-4xl mb-2">📷</div>
            <p className="text-gray-400 text-sm">Drop an image or click to upload</p>
            <p className="text-gray-600 text-xs mt-1">JPG · PNG · WebP · max 10 MB</p>
          </>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="w-2 h-2 rounded-full bg-[#FFC200] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#FFC200] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#FFC200] animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="text-[#FFC200] text-sm ml-1">Analyzing with Rekognition + Claude…</span>
        </div>
      )}

      {result && !loading && condStyle && prioStyle && (
        <div className="space-y-3">

          {/* Summary bar */}
          <div className="bg-gray-900 border border-gray-700/50 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <ScoreRing score={result.overall_score} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${condStyle.bg} ${condStyle.text} ${condStyle.border}`}>
                      {result.overall_condition}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${prioStyle.bg} ${prioStyle.text}`}>
                      {result.estimated_repair_priority} Priority
                    </span>
                    {result.damage_indicators.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-900/40 text-orange-300 text-[11px]">
                        {result.damage_indicators.length} AWS damage signal{result.damage_indicators.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-snug">{result.inspection_summary}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Errors found */}
          {result.errors_found.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium px-1">
                {result.errors_found.length} Issue{result.errors_found.length !== 1 ? 's' : ''} Found
              </p>
              {result.errors_found.map(err => {
                const sevStyle = SEVERITY_STYLE[err.severity] ?? SEVERITY_STYLE.Low
                const dot = URGENCY_DOT[err.urgency] ?? 'bg-gray-500'
                return (
                  <div key={err.error_id} className="bg-gray-900 border border-gray-700/40 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-gray-500">{err.error_id}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${sevStyle.bg} ${sevStyle.text}`}>
                        {err.severity}
                      </span>
                      <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{err.category}</span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 ml-auto">
                        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{err.urgency}
                      </span>
                    </div>
                    <p className="text-xs text-gray-200">{err.description}</p>
                    <div className="flex gap-3 text-[11px]">
                      <span className="text-gray-500">📍 {err.location}</span>
                    </div>
                    <p className="text-[11px] text-[#FFC200]/80">→ {err.recommended_action}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Positive observations */}
          {result.positive_observations.length > 0 && (
            <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-3 space-y-1">
              <p className="text-[10px] text-green-400 uppercase tracking-wider font-medium">Positive Observations</p>
              {result.positive_observations.map((obs, i) => (
                <p key={i} className="text-xs text-gray-300 flex gap-1.5">
                  <span className="text-green-500">✓</span>{obs}
                </p>
              ))}
            </div>
          )}

          {/* Follow-up */}
          {result.follow_up_recommended && result.follow_up_notes && (
            <div className="bg-orange-900/20 border border-orange-800/40 rounded-xl p-3">
              <p className="text-[10px] text-orange-400 uppercase tracking-wider font-medium mb-1">Follow-up Recommended</p>
              <p className="text-xs text-gray-300">{result.follow_up_notes}</p>
            </div>
          )}

          {/* AWS Rekognition labels */}
          {result.rekognition_labels.length > 0 && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-2">AWS Rekognition Labels</p>
              <div className="flex flex-wrap gap-1">
                {result.rekognition_labels.slice(0, 12).map((lbl, i) => (
                  <span
                    key={i}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      result.damage_indicators.some(d => d.name === lbl.name)
                        ? 'bg-orange-900/50 text-orange-300 border border-orange-700/50'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {lbl.name} <span className="opacity-60">{lbl.confidence}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
