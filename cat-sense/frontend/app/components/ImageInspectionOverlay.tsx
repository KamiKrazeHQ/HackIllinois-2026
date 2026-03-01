'use client'
import { useRef, useState } from 'react'

interface BBox { x: number; y: number; width: number; height: number }

export interface BBoxIssue {
  label: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  description: string
  bbox: BBox
}

interface Props {
  imageUrl: string
  issues: BBoxIssue[]
}

const SEV = {
  LOW:    { border: '#22c55e', bg: 'rgba(34,197,94,0.08)',  text: '#22c55e', tag: 'Minor',     pulse: false },
  MEDIUM: { border: '#facc15', bg: 'rgba(250,204,21,0.08)', text: '#facc15', tag: 'Monitor',   pulse: false },
  HIGH:   { border: '#ef4444', bg: 'rgba(239,68,68,0.10)',  text: '#ef4444', tag: 'High Risk', pulse: true  },
}

export default function ImageInspectionOverlay({ imageUrl, issues }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const [tooltip, setTooltip] = useState<number | null>(null)

  function onLoad() {
    const img = imgRef.current
    if (img) setDims({ w: img.naturalWidth, h: img.naturalHeight })
  }

  const validIssues = issues.filter(
    iss => iss.bbox && iss.bbox.width > 0 && iss.bbox.height > 0,
  )

  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      <img
        ref={imgRef}
        src={imageUrl}
        alt="inspection"
        className="w-full h-auto block"
        onLoad={onLoad}
        draggable={false}
      />

      {/* Overlay boxes — only rendered once natural dims are known */}
      {dims && validIssues.map((issue, i) => {
        const s = SEV[issue.severity] ?? SEV.MEDIUM
        const left   = (issue.bbox.x / dims.w) * 100
        const top    = (issue.bbox.y / dims.h) * 100
        const width  = (issue.bbox.width  / dims.w) * 100
        const height = (issue.bbox.height / dims.h) * 100

        return (
          <div
            key={i}
            className="absolute cursor-pointer animate-fade-in"
            style={{
              left:   `${left}%`,
              top:    `${top}%`,
              width:  `${width}%`,
              height: `${height}%`,
              border: `2px solid ${s.border}`,
              background: s.bg,
              boxShadow: `0 0 10px ${s.border}50`,
              animation: s.pulse
                ? 'highPulse 1.5s ease-in-out infinite'
                : undefined,
            }}
            onMouseEnter={() => setTooltip(i)}
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Label badge pinned to top-left of box */}
            <div
              className="absolute -top-5 left-0 px-1.5 py-0.5 text-[9px] font-condensed font-black uppercase tracking-wide whitespace-nowrap leading-none"
              style={{
                background: s.border,
                color: issue.severity === 'MEDIUM' ? '#000' : '#fff',
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {s.tag} · {issue.label}
            </div>

            {/* Hover tooltip */}
            {tooltip === i && (
              <div
                className="absolute z-50 top-full left-0 mt-1 text-[11px] leading-snug p-2 animate-fade-in pointer-events-none"
                style={{
                  background: '#0f1624',
                  border: `1px solid ${s.border}`,
                  color: '#ccc',
                  maxWidth: '220px',
                  minWidth: '120px',
                  boxShadow: `0 4px 20px rgba(0,0,0,0.6)`,
                }}
              >
                {issue.description}
              </div>
            )}
          </div>
        )
      })}

      {/* Severity legend — shown when there are issues */}
      {dims && validIssues.length > 0 && (
        <div className="absolute bottom-2 right-2 flex gap-1.5 animate-fade-in">
          {(['LOW', 'MEDIUM', 'HIGH'] as const)
            .filter(sv => validIssues.some(iss => iss.severity === sv))
            .map(sv => (
              <div
                key={sv}
                className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-condensed font-black uppercase tracking-widest"
                style={{
                  background: 'rgba(9,13,20,0.85)',
                  border: `1px solid ${SEV[sv].border}`,
                  color: SEV[sv].border,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: SEV[sv].border }}
                />
                {SEV[sv].tag}
              </div>
            ))}
        </div>
      )}

      <style>{`
        @keyframes highPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(239,68,68,0.4); }
          50%       { box-shadow: 0 0 22px rgba(239,68,68,0.85); }
        }
      `}</style>
    </div>
  )
}
