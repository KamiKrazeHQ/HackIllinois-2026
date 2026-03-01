'use client'
import { useState, useRef } from 'react'
import { Upload, FileText, Loader2, AlertTriangle, Eye, CheckCircle, ChevronDown, ChevronUp, ShoppingCart, MapPin } from 'lucide-react'
import { uploadInspectionReport } from '../api'
import { useT } from '../i18n/TranslationContext'

interface Part {
  name: string
  part_number: string
  link: string
}

interface Fault {
  fault: string
  description: string
  severity: 'Urgent' | 'Monitor'
  component: string
  parts: Part[]
}

interface InspectionResult {
  filename: string
  total_faults: number
  urgent_count: number
  monitor_count: number
  faults: Fault[]
}

function FaultCard({ fault }: { fault: Fault }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const isUrgent = fault.severity === 'Urgent'
  const borderColor = isUrgent ? '#dc2626' : '#f97316'
  const badgeClass = isUrgent
    ? 'bg-red-900/40 text-red-300 border border-red-500/40'
    : 'bg-orange-900/40 text-orange-300 border border-orange-500/40'
  const Icon = isUrgent ? AlertTriangle : Eye

  return (
    <div className="rounded-xl bg-gray-900 overflow-hidden" style={{ borderLeft: `4px solid ${borderColor}` }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left gap-3 hover:bg-[#FFC200]/5 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="h-4 w-4 shrink-0" style={{ color: borderColor }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-100 truncate">{fault.fault}</p>
            <p className="text-[11px] text-gray-500 truncate">{fault.component}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
            {fault.severity}
          </span>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-gray-500" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-800/60 pt-3 space-y-3">
          <p className="text-xs text-gray-300 leading-relaxed">{fault.description}</p>

          {fault.parts && fault.parts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-[#FFC200]/60 uppercase tracking-widest font-medium">{t('recommendedParts')}</p>
              {fault.parts.map(part => (
                <a
                  key={part.part_number}
                  href={part.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-[#FFC200]/20 bg-[#FFC200]/5 px-3 py-2 text-xs hover:bg-[#FFC200]/10 hover:border-[#FFC200]/40 transition-colors group"
                >
                  <div>
                    <p className="font-semibold text-[#FFC200] group-hover:underline">{part.name}</p>
                    <p className="text-[10px] text-gray-500">Part #{part.part_number}</p>
                  </div>
                  <ShoppingCart className="h-3.5 w-3.5 text-[#FFC200]/50 group-hover:text-[#FFC200]" />
                </a>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap pt-1">
            {fault.parts && fault.parts.length > 0 && (
              <a
                href={fault.parts[0].link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-[#FFC200] px-3 py-1.5 text-xs font-bold text-gray-900 hover:bg-yellow-300 transition-colors"
              >
                <ShoppingCart className="h-3 w-3" />
                {t('buyPart')}
              </a>
            )}
            <a
              href="https://www.google.com/maps/search/Caterpillar+Dealer+near+me"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-[#FFC200]/30 px-3 py-1.5 text-xs font-bold text-[#FFC200] hover:bg-[#FFC200]/10 transition-colors"
            >
              <MapPin className="h-3 w-3" />
              {t('locateService')}
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InspectionAnalyzer() {
  const { t } = useT()
  const [result, setResult] = useState<InspectionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [filename, setFilename] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setFilename(file.name)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await uploadInspectionReport(file) as InspectionResult
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  const urgentFaults = result?.faults.filter(f => f.severity === 'Urgent') ?? []
  const monitorFaults = result?.faults.filter(f => f.severity === 'Monitor') ?? []

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
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#FFC200]" />
            <p className="text-sm text-gray-400">
              Analyzing <span className="text-[#FFC200] font-semibold">{filename}</span>…
            </p>
            <p className="text-xs text-gray-600">Gemini AI is reading your inspection document</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-[#FFC200] mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-200">{t('dropInspection')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('dropInspectionHint')}</p>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {result && !loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-3 text-center">
              <FileText className="h-4 w-4 text-[#FFC200] mx-auto mb-1" />
              <p className="text-lg font-extrabold text-white">{result.total_faults}</p>
              <p className="text-[10px] text-gray-500">{t('totalFaults')}</p>
            </div>
            <div className="bg-gray-900 border border-red-500/20 rounded-xl p-3 text-center">
              <AlertTriangle className="h-4 w-4 text-red-400 mx-auto mb-1" />
              <p className="text-lg font-extrabold text-red-400">{result.urgent_count}</p>
              <p className="text-[10px] text-gray-500">{t('urgent')}</p>
            </div>
            <div className="bg-gray-900 border border-orange-500/20 rounded-xl p-3 text-center">
              <Eye className="h-4 w-4 text-orange-400 mx-auto mb-1" />
              <p className="text-lg font-extrabold text-orange-400">{result.monitor_count}</p>
              <p className="text-[10px] text-gray-500">{t('monitor')}</p>
            </div>
          </div>

          {result.total_faults === 0 ? (
            <div className="rounded-xl border border-green-700/30 bg-green-900/20 px-6 py-8 text-center">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="font-bold text-green-300">{t('noFaultsDetected')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('goodCondition')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentFaults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-red-400 uppercase tracking-widest font-medium px-1">
                    {t('urgentAction')}
                  </p>
                  {urgentFaults.map((fault, i) => <FaultCard key={i} fault={fault} />)}
                </div>
              )}
              {monitorFaults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-orange-400 uppercase tracking-widest font-medium px-1">
                    {t('keepObservation')}
                  </p>
                  {monitorFaults.map((fault, i) => <FaultCard key={i} fault={fault} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
