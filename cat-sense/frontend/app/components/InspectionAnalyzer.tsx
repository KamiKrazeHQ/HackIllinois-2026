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
  const borderColor = isUrgent ? 'border-red-500' : 'border-orange-400'
  const badgeCls = isUrgent
    ? 'bg-red-950 text-red-400 border border-red-900'
    : 'bg-orange-950 text-orange-400 border border-orange-900'
  const accentText = isUrgent ? 'text-red-400' : 'text-orange-400'
  const Icon = isUrgent ? AlertTriangle : Eye

  return (
    <div className={`bg-cat-black border-l-4 ${borderColor} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left gap-3 hover:bg-cat/5 hover:shadow-[inset_4px_0_16px_rgba(255,205,17,0.06)] transition-all duration-150"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${accentText}`} />
          <div className="min-w-0">
            <p className="text-xs font-condensed font-bold text-[#DDD] truncate uppercase">{fault.fault}</p>
            <p className="text-[10px] text-[#444] font-condensed uppercase tracking-wide truncate">{fault.component}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[9px] font-condensed font-black px-2 py-0.5 uppercase tracking-widest ${badgeCls}`}>{fault.severity}</span>
          {open ? <ChevronUp className="h-3 w-3 text-[#444]" /> : <ChevronDown className="h-3 w-3 text-[#444]" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[#1A1A1A] pt-3 space-y-3">
          <p className="text-xs text-[#999] leading-relaxed">{fault.description}</p>

          {fault.parts && fault.parts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] text-cat font-condensed font-black uppercase tracking-widest">{t('recommendedParts')}</p>
              {fault.parts.map(part => (
                <a
                  key={part.part_number}
                  href={part.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between border border-cat/20 bg-cat/5 px-3 py-2.5 text-xs hover:bg-cat/10 hover:border-cat/40 transition-all group"
                >
                  <div>
                    <p className="font-condensed font-bold text-cat uppercase group-hover:underline">{part.name}</p>
                    <p className="text-[10px] text-[#444] font-mono">#{part.part_number}</p>
                  </div>
                  <ShoppingCart className="h-3.5 w-3.5 text-cat/40 group-hover:text-cat transition-colors" />
                </a>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {fault.parts && fault.parts.length > 0 && (
              <a
                href={fault.parts[0].link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-cat px-4 py-2 text-xs font-condensed font-black text-black uppercase tracking-widest hover:bg-yellow-300 hover:shadow-[0_0_24px_rgba(255,205,17,0.6)] active:scale-[0.97] transition-all duration-150"
              >
                <ShoppingCart className="h-3 w-3" />
                {t('buyPart')}
              </a>
            )}
            <a
              href="https://www.google.com/maps/search/Caterpillar+Dealer+near+me"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-cat/30 px-4 py-2 text-xs font-condensed font-black text-cat uppercase tracking-widest hover:bg-cat/10 hover:border-cat/50 transition-all"
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
      {/* Section header */}
      <div className="border-b border-[#1A1A1A] pb-3 mb-4">
        <h2 className="font-condensed font-black text-white text-2xl uppercase leading-none">{t('tabInspect')}</h2>
        <p className="text-[#444] text-sm mt-1">Upload inspection reports for automated fault analysis</p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-150 ${
          drag
            ? 'border-cat bg-cat/8 shadow-[0_0_40px_rgba(255,205,17,0.2),inset_0_0_40px_rgba(255,205,17,0.05)]'
            : 'border-cat/25 bg-cat-black hover:border-cat/60 hover:bg-cat/5 hover:shadow-[0_0_24px_rgba(255,205,17,0.12)]'
        }`}
      >
        <input ref={inputRef} type="file" accept=".pdf,image/*" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-cat" />
            <p className="text-sm font-condensed uppercase tracking-widest text-[#555]">
              ANALYZING <span className="text-cat font-black">{filename}</span>
            </p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-cat mx-auto mb-3" />
            <p className="text-sm font-condensed font-bold text-[#555] uppercase tracking-widest">{t('dropInspection')}</p>
            <p className="text-xs text-[#333] mt-1 font-condensed uppercase tracking-wide">{t('dropInspectionHint')}</p>
          </>
        )}
      </div>

      {error && (
        <div className="border-l-2 border-red-500 pl-4 py-3 bg-red-950/30">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-3 animate-fade-slide-in">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-cat-black border-l-4 border-cat p-4 text-center">
              <FileText className="h-4 w-4 text-cat mx-auto mb-2" />
              <p className="font-condensed font-black text-3xl text-white leading-none">{result.total_faults}</p>
              <p className="text-[9px] text-[#444] font-condensed font-bold uppercase tracking-widest mt-1">{t('totalFaults')}</p>
            </div>
            <div className="bg-cat-black border-l-4 border-red-500 p-4 text-center">
              <AlertTriangle className="h-4 w-4 text-red-400 mx-auto mb-2" />
              <p className="font-condensed font-black text-3xl text-red-400 leading-none">{result.urgent_count}</p>
              <p className="text-[9px] text-[#444] font-condensed font-bold uppercase tracking-widest mt-1">{t('urgent')}</p>
            </div>
            <div className="bg-cat-black border-l-4 border-orange-400 p-4 text-center">
              <Eye className="h-4 w-4 text-orange-400 mx-auto mb-2" />
              <p className="font-condensed font-black text-3xl text-orange-400 leading-none">{result.monitor_count}</p>
              <p className="text-[9px] text-[#444] font-condensed font-bold uppercase tracking-widest mt-1">{t('monitor')}</p>
            </div>
          </div>

          {result.total_faults === 0 ? (
            <div className="bg-cat-black border-l-4 border-green-500 px-6 py-8 text-center">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-3" />
              <p className="font-condensed font-black text-green-300 text-xl uppercase">{t('noFaultsDetected')}</p>
              <p className="text-xs text-[#444] font-condensed uppercase tracking-wider mt-1">{t('goodCondition')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentFaults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] text-red-500 font-condensed font-black uppercase tracking-widest px-1">{t('urgentAction')}</p>
                  {urgentFaults.map((fault, i) => <FaultCard key={i} fault={fault} />)}
                </div>
              )}
              {monitorFaults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] text-orange-400 font-condensed font-black uppercase tracking-widest px-1">{t('keepObservation')}</p>
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
