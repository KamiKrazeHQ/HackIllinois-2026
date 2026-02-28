'use client'
import { useState, useRef } from 'react'
import { uploadImage } from '../api'

interface VisionResult {
  description: string
  detected_issues: string[]
  severity: string
}
interface Props {
  sessionId: string
  onResult: (r: VisionResult) => void
}

const SEV_COLOR: Record<string, string> = {
  Minor: 'text-green-400',
  Moderate: 'text-yellow-400',
  Severe: 'text-red-400',
}

export default function ImageUpload({ sessionId, onResult }: Props) {
  const [result, setResult] = useState<VisionResult | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    setResult(null)
    try {
      const data = await uploadImage(file, sessionId)
      setResult(data)
      onResult(data)
    } catch {
      setResult({ description: 'Upload failed — check backend.', detected_issues: [], severity: 'Minor' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
          drag ? 'border-[#FFC200] bg-yellow-950/30' : 'border-gray-700 hover:border-gray-500'
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {preview ? (
          <img src={preview} alt="preview" className="mx-auto max-h-48 rounded-xl object-contain" />
        ) : (
          <>
            <div className="text-4xl mb-2">📷</div>
            <p className="text-gray-400 text-sm">Drop an image or click to upload</p>
            <p className="text-gray-600 text-xs mt-1">Max 5 MB · JPG PNG WebP</p>
          </>
        )}
      </div>

      {loading && <p className="text-center text-[#FFC200] text-sm animate-pulse">Analyzing with Gemini Vision…</p>}

      {result && !loading && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 uppercase tracking-wider">Vision Analysis</span>
            <span className={`text-sm font-semibold ${SEV_COLOR[result.severity] ?? 'text-gray-400'}`}>
              {result.severity}
            </span>
          </div>
          <p className="text-sm text-gray-200">{result.description}</p>
          {result.detected_issues.length > 0 && (
            <ul className="text-xs text-gray-400 space-y-0.5">
              {result.detected_issues.map((issue, i) => (
                <li key={i} className="flex gap-1.5"><span className="text-[#FFC200]">›</span>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
