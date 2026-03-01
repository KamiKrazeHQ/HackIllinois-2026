import { useRef, useState } from 'react'
import { Upload, FileText, Loader2, AlertTriangle, Eye, CheckCircle } from 'lucide-react'
import DropdownItem from './DropdownItem'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export default function InspectionDashboard() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [filename, setFilename] = useState('')
  const fileRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setResults(null)
    setFilename(file.name)
    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE}/upload-inspection`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.detail || 'Analysis failed.')
      }
      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const urgentFaults = results?.faults?.filter((f) => f.severity === 'Urgent') || []
  const monitorFaults = results?.faults?.filter((f) => f.severity === 'Monitor') || []

  return (
    <div className="min-h-screen bg-[#111827] text-white px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#FFD700] mb-2">
            CAT Inspection Analyzer
          </h1>
          <p className="text-white/50 text-sm">
            Upload an inspection report - Gemini AI extracts faults and links genuine CAT parts.
          </p>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`mb-8 cursor-pointer rounded-2xl border-2 border-dashed px-8 py-12 text-center transition-all duration-200
            ${
              dragOver
                ? 'border-[#FFD700] bg-[#FFD700]/10'
                : 'border-[#FFD700]/30 bg-[#0b1220] hover:border-[#FFD700]/70 hover:bg-[#FFD700]/5'
            }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-[#FFD700]" />
              <p className="text-white/60 text-sm">
                Analyzing <span className="text-[#FFD700] font-semibold">{filename}</span>...
              </p>
              <p className="text-white/30 text-xs">Gemini is reading your inspection document</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-[#FFD700]" />
              <p className="font-bold text-white">Drop your inspection PDF here</p>
              <p className="text-white/40 text-sm">or click to browse - PDF, JPG, PNG supported</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {results && (
          <div>
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-[#0b1220] border border-[#FFD700]/20 p-4 text-center">
                <FileText className="h-5 w-5 text-[#FFD700] mx-auto mb-1" />
                <p className="text-2xl font-extrabold text-white">{results.total_faults}</p>
                <p className="text-xs text-white/40">Total Faults</p>
              </div>
              <div className="rounded-xl bg-[#0b1220] border border-red-500/30 p-4 text-center">
                <AlertTriangle className="h-5 w-5 text-red-400 mx-auto mb-1" />
                <p className="text-2xl font-extrabold text-red-400">{results.urgent_count}</p>
                <p className="text-xs text-white/40">Urgent</p>
              </div>
              <div className="rounded-xl bg-[#0b1220] border border-orange-500/30 p-4 text-center">
                <Eye className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                <p className="text-2xl font-extrabold text-orange-400">{results.monitor_count}</p>
                <p className="text-xs text-white/40">Monitor</p>
              </div>
            </div>

            {results.total_faults === 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-8 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                <p className="font-bold text-emerald-300 text-lg">No faults detected</p>
                <p className="text-sm text-white/40 mt-1">This machine appears to be in good condition.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {urgentFaults.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">
                      Urgent - Immediate Action Required
                    </p>
                    <div className="flex flex-col gap-3">
                      {urgentFaults.map((fault, i) => (
                        <DropdownItem key={i} fault={fault} />
                      ))}
                    </div>
                  </div>
                )}
                {monitorFaults.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-3">
                      Monitor - Keep Under Observation
                    </p>
                    <div className="flex flex-col gap-3">
                      {monitorFaults.map((fault, i) => (
                        <DropdownItem key={i} fault={fault} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
