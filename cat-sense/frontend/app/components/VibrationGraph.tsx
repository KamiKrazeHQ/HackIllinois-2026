interface Props {
  frequencyHz: number
  anomalyType: string
  severity: string
}

const BANDS = [
  { name: 'Structural', label: '50-70 Hz', center: 60 },
  { name: 'Bearing OR', label: '100-160 Hz', center: 130 },
  { name: 'Bearing IR', label: '160-230 Hz', center: 195 },
  { name: 'Blade Pass', label: '300-400 Hz', center: 350 },
  { name: 'Gear Mesh', label: '450-600 Hz', center: 525 },
  { name: 'Cavitation', label: '700-1k Hz', center: 850 },
  { name: 'Elec Hum', label: '55-65 Hz', center: 60 },
]

const SEV_COLOR: Record<string, string> = {
  Minor: '#4ade80',
  Moderate: '#FFC200',
  Severe: '#f87171',
}

export default function VibrationGraph({ frequencyHz, anomalyType, severity }: Props) {
  const activeColor = SEV_COLOR[severity] ?? '#FFC200'
  const activeBand = BANDS.reduce((best, b, i) => {
    const d = Math.abs(b.center - frequencyHz)
    return d < Math.abs(BANDS[best].center - frequencyHz) ? i : best
  }, 0)

  const W = 420
  const H = 110
  const barW = 38
  const gap = (W - BANDS.length * barW) / (BANDS.length + 1)

  // Deterministic-ish amplitudes based on index
  const amplitudes = BANDS.map((_, i) =>
    i === activeBand ? 0.88 : 0.08 + ((i * 7 + 3) % 11) * 0.015
  )

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-gray-500 uppercase tracking-wider">Frequency Spectrum</span>
        <span className="text-xs text-gray-400 font-mono">{frequencyHz.toFixed(1)} Hz</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 32}`} className="w-full">
        <line x1={0} y1={H} x2={W} y2={H} stroke="#374151" strokeWidth={1} />
        {BANDS.map((band, i) => {
          const x = gap + i * (barW + gap)
          const amp = amplitudes[i]
          const barH = amp * H
          const y = H - barH
          const active = i === activeBand
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={3}
                fill={active ? activeColor : '#374151'} opacity={active ? 1 : 0.7} />
              <text x={x + barW / 2} y={H + 12} textAnchor="middle" fontSize={7}
                fill={active ? activeColor : '#6b7280'}>{band.name}</text>
              <text x={x + barW / 2} y={H + 22} textAnchor="middle" fontSize={6}
                fill="#4b5563">{band.label}</text>
            </g>
          )
        })}
      </svg>
      <p className="text-xs text-center text-gray-500 mt-1 capitalize">
        {anomalyType !== 'none' ? `Detected: ${anomalyType}` : 'No anomaly detected'}
      </p>
    </div>
  )
}
