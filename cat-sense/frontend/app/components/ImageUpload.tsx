'use client'
import { useState, useRef, useEffect } from 'react'
import { uploadImage, translateTexts } from '../api'
import { useT } from '../i18n/TranslationContext'
import ImageInspectionOverlay, { BBoxIssue } from './ImageInspectionOverlay'

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
  issues: BBoxIssue[]
}

interface Props {
  sessionId: string
  onResult: (r: { description: string; detected_issues: string[]; severity: string }) => void
}

async function _translateResult(raw: RichVisionResult, targetLang: string): Promise<RichVisionResult> {
  const texts: string[] = [
    raw.inspection_summary,
    ...raw.errors_found.flatMap(e => [e.description, e.location, e.recommended_action]),
    ...raw.positive_observations,
    ...(raw.follow_up_notes ? [raw.follow_up_notes] : []),
  ]
  if (texts.length === 0) return raw

  const data = await translateTexts(texts, targetLang)
  const tr: string[] = data.translations
  let idx = 0

  const inspSummary = tr[idx++]
  const errors = raw.errors_found.map(e => ({
    ...e,
    description: tr[idx++],
    location: tr[idx++],
    recommended_action: tr[idx++],
  }))
  const posObs = raw.positive_observations.map(() => tr[idx++])
  const followUp = raw.follow_up_notes ? tr[idx++] : ''

  return {
    ...raw,
    inspection_summary: inspSummary,
    description: inspSummary,
    errors_found: errors,
    positive_observations: posObs,
    follow_up_notes: followUp,
  }
}

const CONDITION_COLOR: Record<string, { ring: string; badge: string }> = {
  Good:     { ring: '#22c55e', badge: 'bg-green-950 text-green-400 border-green-900' },
  Fair:     { ring: '#FFCD11', badge: 'bg-yellow-950 text-yellow-400 border-yellow-900' },
  Poor:     { ring: '#f97316', badge: 'bg-orange-950 text-orange-400 border-orange-900' },
  Critical: { ring: '#ef4444', badge: 'bg-red-950 text-red-400 border-red-900' },
}
const CONDITION_BORDER: Record<string, string> = {
  Good: 'border-green-500', Fair: 'border-cat', Poor: 'border-orange-400', Critical: 'border-red-500',
}

const SEVERITY_BADGE: Record<string, string> = {
  Low:      'bg-green-950 text-green-400 border-green-900',
  Medium:   'bg-yellow-950 text-yellow-400 border-yellow-900',
  High:     'bg-orange-950 text-orange-400 border-orange-900',
  Critical: 'bg-red-950 text-red-400 border-red-900',
}
const SEVERITY_BORDER: Record<string, string> = {
  Low: 'border-green-500', Medium: 'border-cat', High: 'border-orange-400', Critical: 'border-red-500',
}

const PRIORITY_BADGE: Record<string, string> = {
  Routine:   'bg-green-950 text-green-400 border-green-900',
  Urgent:    'bg-orange-950 text-orange-400 border-orange-900',
  Emergency: 'bg-red-950 text-red-400 border-red-900',
}

const URGENCY_DOT: Record<string, string> = {
  'Monitor':                   'bg-green-500',
  'Schedule Repair':           'bg-yellow-400',
  'Immediate Action Required': 'bg-red-500',
}

function ScoreRing({ score, condition }: { score: number; condition: string }) {
  const pct = score / 10
  const r = 22
  const circ = 2 * Math.PI * r
  const filled = pct * circ
  const color = CONDITION_COLOR[condition]?.ring ?? '#FFCD11'
  return (
    <svg width="60" height="60" viewBox="0 0 56 56" className="flex-shrink-0">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#1A1A1A" strokeWidth="5" />
      <circle
        cx="28" cy="28" r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="square"
        transform="rotate(-90 28 28)"
        style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
      />
      <text x="28" y="32" textAnchor="middle" fill={color} fontSize="11" fontWeight="900" fontFamily="'Barlow Condensed', sans-serif">{score}/10</text>
    </svg>
  )
}

export default function ImageUpload({ sessionId, onResult }: Props) {
  const { t, lang } = useT()
  const [rawResult, setRawResult] = useState<RichVisionResult | null>(null)
  const [result, setResult] = useState<RichVisionResult | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!rawResult) return
    if (lang === 'en') { setResult(rawResult); return }
    setResult(rawResult)
    _translateResult(rawResult, lang).then(setResult).catch(console.error)
  }, [lang, rawResult])

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    setResult(null)
    setRawResult(null)
    try {
      const data = await uploadImage(file, sessionId) as RichVisionResult
      onResult({ description: data.description, detected_issues: data.detected_issues, severity: data.severity })
      setRawResult(data)
    } catch {
      const fallback: RichVisionResult = {
        description: 'Upload failed — check backend.',
        detected_issues: [], severity: 'Minor', overall_condition: 'Fair', overall_score: 5,
        errors_found: [], positive_observations: [], inspection_summary: 'Upload failed — check backend.',
        estimated_repair_priority: 'Routine', follow_up_recommended: false, follow_up_notes: '',
        rekognition_labels: [], damage_indicators: [], issues: [],
      }
      setRawResult(fallback)
    } finally {
      setLoading(false)
    }
  }

  const condKey = rawResult?.overall_condition ?? 'Fair'
  const prioKey = rawResult?.estimated_repair_priority ?? 'Routine'
  const cc = CONDITION_COLOR[condKey] ?? CONDITION_COLOR.Fair
  const condBorder = CONDITION_BORDER[condKey] ?? CONDITION_BORDER.Fair
  const prioBadge = PRIORITY_BADGE[prioKey] ?? PRIORITY_BADGE.Routine

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="border-b border-[#1A1A1A] pb-3 mb-4">
        <h2 className="font-condensed font-black text-white text-2xl uppercase leading-none">{t('tabVision')}</h2>
        <p className="text-[#444] text-sm mt-1">AI-powered visual inspection &amp; damage assessment</p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-150 ${
          drag
            ? 'border-cat bg-cat/8 shadow-[0_0_40px_rgba(255,205,17,0.2),inset_0_0_40px_rgba(255,205,17,0.05)]'
            : 'border-cat/25 bg-cat-black hover:border-cat/60 hover:bg-cat/5 hover:shadow-[0_0_24px_rgba(255,205,17,0.12)]'
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {preview ? (
          <img src={preview} alt="preview" className="mx-auto max-h-48 object-contain opacity-80" />
        ) : (
          <>
            <div className="text-4xl mb-3">📷</div>
            <p className="text-sm font-condensed font-bold text-[#555] uppercase tracking-widest">{t('dropImage')}</p>
            <p className="text-xs text-[#333] mt-1 font-condensed uppercase tracking-wide">{t('dropImageHint')}</p>
          </>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4">
          <span className="w-2 h-2 bg-cat animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-cat animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-cat animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="text-cat text-sm ml-2 font-condensed font-black uppercase tracking-widest">{t('analyzingVision')}</span>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-3 animate-fade-slide-in">
          {/* Bounding box overlay */}
          {preview && (
            <ImageInspectionOverlay
              imageUrl={preview}
              issues={(rawResult?.issues ?? []) as BBoxIssue[]}
            />
          )}

          {/* Summary card */}
          <div className={`bg-cat-black border-l-4 ${condBorder} p-4`}>
            <div className="flex items-center gap-4">
              <ScoreRing score={rawResult!.overall_score} condition={condKey} />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 border text-[11px] font-condensed font-bold uppercase ${cc.badge}`}>
                    {rawResult!.overall_condition}
                  </span>
                  <span className={`px-2.5 py-1 border text-[11px] font-condensed font-bold uppercase ${prioBadge}`}>
                    {rawResult!.estimated_repair_priority} Priority
                  </span>
                  {rawResult!.damage_indicators.length > 0 && (
                    <span className="px-2 py-0.5 bg-orange-950 border border-orange-900 text-orange-400 text-[10px] font-condensed font-bold uppercase">
                      {rawResult!.damage_indicators.length} AWS Signal{rawResult!.damage_indicators.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#888] leading-snug">{result.inspection_summary}</p>
              </div>
            </div>
          </div>

          {/* Errors found */}
          {result.errors_found.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] text-cat font-condensed font-black uppercase tracking-widest px-1">
                {result.errors_found.length} Issue{result.errors_found.length !== 1 ? 's' : ''} Found
              </p>
              {result.errors_found.map((err, i) => {
                const rawErr = rawResult!.errors_found[i]
                const sevBorder = SEVERITY_BORDER[rawErr?.severity] ?? SEVERITY_BORDER.Low
                const sevBadge = SEVERITY_BADGE[rawErr?.severity] ?? SEVERITY_BADGE.Low
                const dot = URGENCY_DOT[rawErr?.urgency] ?? 'bg-[#444]'
                return (
                  <div key={err.error_id} className={`bg-cat-black border-l-4 ${sevBorder} p-3.5 space-y-2`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-[#444] font-bold">{err.error_id}</span>
                      <span className={`px-2 py-0.5 border text-[10px] font-condensed font-bold uppercase ${sevBadge}`}>
                        {rawErr?.severity}
                      </span>
                      <span className="text-[10px] text-[#555] bg-[#111] border border-[#2A2A2A] px-2 py-0.5 font-condensed uppercase">
                        {rawErr?.category}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-[#555] ml-auto font-condensed uppercase">
                        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                        {rawErr?.urgency}
                      </span>
                    </div>
                    <p className="text-xs text-[#CCC] leading-relaxed">{err.description}</p>
                    <p className="text-[11px] text-[#555] font-condensed uppercase">📍 {err.location}</p>
                    <p className="text-[11px] text-cat/70 leading-snug font-condensed">→ {err.recommended_action}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Positive observations */}
          {result.positive_observations.length > 0 && (
            <div className="bg-cat-black border-l-4 border-green-500 p-3.5 space-y-1.5">
              <p className="text-[9px] text-green-400 font-condensed font-black uppercase tracking-widest">{t('positiveObservations')}</p>
              {result.positive_observations.map((obs, i) => (
                <p key={i} className="text-xs text-[#999] flex gap-2">
                  <span className="text-green-500 flex-shrink-0 font-condensed font-black">✓</span>{obs}
                </p>
              ))}
            </div>
          )}

          {/* Follow-up */}
          {result.follow_up_recommended && result.follow_up_notes && (
            <div className="bg-cat-black border-l-4 border-orange-400 p-3.5">
              <p className="text-[9px] text-orange-400 font-condensed font-black uppercase tracking-widest mb-2">{t('followUpRecommended')}</p>
              <p className="text-xs text-[#999] leading-relaxed">{result.follow_up_notes}</p>
            </div>
          )}

          {/* AWS labels */}
          {rawResult!.rekognition_labels.length > 0 && (
            <div className="bg-cat-black border border-[#2A2A2A] p-3.5">
              <p className="text-[9px] text-[#444] font-condensed font-black uppercase tracking-widest mb-2.5">{t('awsLabels')}</p>
              <div className="flex flex-wrap gap-1">
                {rawResult!.rekognition_labels.slice(0, 12).map((lbl, i) => (
                  <span
                    key={i}
                    className={`px-2 py-0.5 text-[10px] border font-condensed font-bold uppercase ${
                      rawResult!.damage_indicators.some(d => d.name === lbl.name)
                        ? 'bg-orange-950 border-orange-900 text-orange-400'
                        : 'bg-[#111] border-[#2A2A2A] text-[#444]'
                    }`}
                  >
                    {lbl.name} <span className="opacity-50 font-normal">{lbl.confidence}%</span>
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
