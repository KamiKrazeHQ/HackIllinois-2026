interface Diagnosis {
  diagnosis_summary: string
  probable_causes: string[]
  severity: string
  failure_probability: string
  estimated_cost: string
  recommended_action: string
}
interface VisionResult { description: string; detected_issues: string[]; severity: string }
interface AudioResult { dominant_frequency_hz: number; anomaly_detected: boolean; anomaly_type: string; severity: string }
interface RiskResult { failure_probability_14_days: number; estimated_downtime_cost_usd: number; recommended_action_window: string; risk_level: string }

interface Props {
  diagnosis: Diagnosis | null
  vision: VisionResult | null
  audio: AudioResult | null
  risk: RiskResult | null
}

const SEV_BADGE: Record<string, string> = {
  Minor: 'bg-green-900 text-green-300 border-green-700',
  Moderate: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  Severe: 'bg-red-900 text-red-300 border-red-700',
}
const RISK_BADGE: Record<string, string> = {
  Low: 'bg-green-900 text-green-300 border-green-700',
  Medium: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  High: 'bg-orange-900 text-orange-300 border-orange-700',
  Critical: 'bg-red-900 text-red-300 border-red-700',
}

const RISK_COLOR: Record<string, string> = {
  Low: '#4ade80',
  Medium: '#FFC200',
  High: '#fb923c',
  Critical: '#f87171',
}

function RiskGauge({ pct, level }: { pct: number; level: string }) {
  const r = 36
  const cx = 44
  const cy = 44
  const circumference = Math.PI * r  // half-circle arc length
  // Arc goes from 180° (left) to 0° (right) — bottom half hidden
  const filled = (Math.min(pct, 100) / 100) * circumference
  const color = RISK_COLOR[level] ?? '#FFC200'
  return (
    <svg width={88} height={52} viewBox="0 0 88 52" className="flex-shrink-0">
      {/* Track */}
      <path
        d={`M8,44 A${r},${r} 0 0,1 80,44`}
        fill="none" stroke="#374151" strokeWidth={8} strokeLinecap="round"
      />
      {/* Filled arc */}
      <path
        d={`M8,44 A${r},${r} 0 0,1 80,44`}
        fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
      {/* Percentage */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={16} fontWeight="bold" fill="white">
        {pct.toFixed(0)}%
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="#6b7280">
        14-day risk
      </text>
    </svg>
  )
}

function Badge({ text, cls }: { text: string; cls: string }) {
  return <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>{text}</span>
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-800 rounded-xl p-4 space-y-2.5">
      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">{title}</p>
      {children}
    </div>
  )
}

export default function ReportCard({ diagnosis, vision, audio, risk }: Props) {
  if (!diagnosis && !vision && !audio && !risk) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-600">
        <div className="text-4xl mb-2">📋</div>
        <p className="text-sm">Run diagnostics to generate a report.</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white">Diagnostic Report</h2>
        <span className="text-xs text-gray-600">{new Date().toLocaleString()}</span>
      </div>

      {diagnosis && (
        <Section title="AI Diagnosis">
          <div className="flex flex-wrap gap-2">
            <Badge text={diagnosis.severity} cls={SEV_BADGE[diagnosis.severity] ?? SEV_BADGE.Minor} />
            <Badge text={`Risk: ${diagnosis.failure_probability}`} cls="bg-gray-800 text-gray-300 border-gray-700" />
            <Badge text={diagnosis.estimated_cost} cls="bg-gray-800 text-gray-300 border-gray-700" />
          </div>
          <p className="text-sm text-gray-200">{diagnosis.diagnosis_summary}</p>
          {diagnosis.probable_causes?.length > 0 && (
            <ul className="text-xs text-gray-400 space-y-0.5">
              {diagnosis.probable_causes.map((c, i) => (
                <li key={i} className="flex gap-1.5"><span className="text-[#FFC200]">›</span>{c}</li>
              ))}
            </ul>
          )}
          <div className="bg-gray-800 rounded-lg p-2.5 text-xs text-gray-300">
            <span className="text-[#FFC200] font-medium">Action: </span>{diagnosis.recommended_action}
          </div>
        </Section>
      )}

      {vision && (
        <Section title="Visual Inspection">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-gray-200 flex-1">{vision.description}</p>
            <Badge text={vision.severity} cls={SEV_BADGE[vision.severity] ?? SEV_BADGE.Minor} />
          </div>
        </Section>
      )}

      {audio && (
        <Section title="Audio / Vibration">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div><p className="text-xs text-gray-500">Frequency</p><p className="text-white font-mono">{audio.dominant_frequency_hz.toFixed(1)} Hz</p></div>
            <div><p className="text-xs text-gray-500">Anomaly</p><p className="text-white capitalize">{audio.anomaly_type}</p></div>
            <div><p className="text-xs text-gray-500">Severity</p><Badge text={audio.severity} cls={SEV_BADGE[audio.severity] ?? SEV_BADGE.Minor} /></div>
          </div>
        </Section>
      )}

      {risk && (
        <Section title="Risk Assessment">
          <div className="flex items-center gap-4">
            <RiskGauge pct={risk.failure_probability_14_days} level={risk.risk_level} />
            <div className="flex-1 space-y-2">
              <Badge text={risk.risk_level} cls={RISK_BADGE[risk.risk_level] ?? RISK_BADGE.Medium} />
              <div className="grid grid-cols-1 gap-1.5 text-sm">
                <div><p className="text-xs text-gray-500">Est. Downtime Cost</p><p className="text-white font-semibold">${risk.estimated_downtime_cost_usd.toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500">Action Window</p><p className="text-white text-xs">{risk.recommended_action_window}</p></div>
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  )
}
