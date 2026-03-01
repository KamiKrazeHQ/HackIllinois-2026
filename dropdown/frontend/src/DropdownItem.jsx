import { useState } from 'react'
import { ChevronDown, ChevronUp, ShoppingCart, MapPin, AlertTriangle, Eye } from 'lucide-react'

export default function DropdownItem({ fault }) {
  const [open, setOpen] = useState(false)

  const isUrgent = fault.severity === 'Urgent'

  const borderColor = isUrgent ? '#dc2626' : '#f97316'
  const badgeBg = isUrgent ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-orange-500/20 text-orange-300 border-orange-500/40'
  const Icon = isUrgent ? AlertTriangle : Eye
  const pulseClass = isUrgent ? 'animate-pulse' : ''

  return (
    <div
      className="rounded-xl bg-[#0b1220] overflow-hidden shadow-lg transition-all duration-300"
      style={{ borderLeft: `6px solid ${borderColor}` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 hover:bg-[#FFD700]/5 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 ${pulseClass}`}>
            <Icon className="h-5 w-5" style={{ color: borderColor }} />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-white truncate">{fault.fault}</p>
            <p className="text-xs text-white/50 truncate">{fault.component}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badgeBg}`}>
            {fault.severity}
          </span>
          {open
            ? <ChevronUp className="h-4 w-4 text-[#FFD700]/60" />
            : <ChevronDown className="h-4 w-4 text-[#FFD700]/60" />
          }
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[#FFD700]/10 pt-4">
          <p className="text-sm text-white/80 mb-5 leading-relaxed">{fault.description}</p>

          {fault.parts && fault.parts.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-widest text-[#FFD700]/50 mb-3">
                Recommended Parts
              </p>
              <div className="flex flex-col gap-2">
                {fault.parts.map((part) => (
                  <a
                    key={part.part_number}
                    href={part.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-[#FFD700]/30 bg-[#FFD700]/5 px-4 py-3 text-sm transition hover:bg-[#FFD700]/15 hover:border-[#FFD700]/60 group"
                  >
                    <div>
                      <p className="font-semibold text-[#FFD700] group-hover:underline">{part.name}</p>
                      <p className="text-xs text-white/40">Part #{part.part_number}</p>
                    </div>
                    <ShoppingCart className="h-4 w-4 text-[#FFD700]/60 group-hover:text-[#FFD700]" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {fault.parts && fault.parts.length > 0 && (
              <a
                href={fault.parts[0].link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-[#FFD700] px-4 py-2.5 text-sm font-bold text-[#111827] transition hover:brightness-95"
              >
                <ShoppingCart className="h-4 w-4" />
                Buy Genuine CAT Part
              </a>
            )}
            <a
              href="https://www.google.com/maps/search/Caterpillar+Dealer+near+me"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-[#FFD700]/40 px-4 py-2.5 text-sm font-bold text-[#FFD700] transition hover:bg-[#FFD700]/10"
            >
              <MapPin className="h-4 w-4" />
              Locate Service Center
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
