import { useT } from '../i18n/TranslationContext'

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
  Minor:    'bg-green-950 text-green-400 border-green-900',
  Moderate: 'bg-yellow-950 text-yellow-400 border-yellow-900',
  Severe:   'bg-red-950 text-red-400 border-red-900',
}
const SEV_BORDER: Record<string, string> = {
  Minor:    'border-green-500',
  Moderate: 'border-cat',
  Severe:   'border-red-500',
}
const RISK_BADGE: Record<string, string> = {
  Low:      'bg-green-950 text-green-400 border-green-900',
  Medium:   'bg-yellow-950 text-yellow-400 border-yellow-900',
  High:     'bg-orange-950 text-orange-400 border-orange-900',
  Critical: 'bg-red-950 text-red-400 border-red-900',
}
const RISK_COLOR: Record<string, string> = {
  Low: '#22c55e', Medium: '#FFCD11', High: '#f97316', Critical: '#ef4444',
}
const RISK_BORDER: Record<string, string> = {
  Low: 'border-green-500', Medium: 'border-cat', High: 'border-orange-400', Critical: 'border-red-500',
}

function RiskGauge({ pct, level }: { pct: number; level: string }) {
  const { t } = useT()
  const r = 36, cx = 44, cy = 44
  const circumference = Math.PI * r
  const filled = (Math.min(pct, 100) / 100) * circumference
  const color = RISK_COLOR[level] ?? '#FFCD11'
  return (
    <svg width={88} height={52} viewBox="0 0 88 52" className="flex-shrink-0">
      <path d={`M8,44 A${r},${r} 0 0,1 80,44`} fill="none" stroke="#1A1A1A" strokeWidth={8} strokeLinecap="square" />
      <path
        d={`M8,44 A${r},${r} 0 0,1 80,44`}
        fill="none" stroke={color} strokeWidth={8} strokeLinecap="square"
        strokeDasharray={`${filled} ${circumference}`}
        style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
      />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={16} fontWeight="900" fill="white" fontFamily="'Barlow Condensed', sans-serif">{pct.toFixed(0)}%</text>
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize={7} fill="#444" fontFamily="'Barlow Condensed', sans-serif" letterSpacing="1">{t('riskDays')}</text>
    </svg>
  )
}

function Section({ title, borderColor, children }: { title: string; borderColor?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-cat-black border-l-4 ${borderColor ?? 'border-[#2A2A2A]'} p-4 space-y-3`}>
      <p className="text-[9px] text-cat font-condensed font-black uppercase tracking-widest">{title}</p>
      {children}
    </div>
  )
}

export default function ReportCard({ diagnosis, vision, audio, risk }: Props) {
  const { t } = useT()

  if (!diagnosis && !vision && !audio && !risk) {
    return (
      <div className="flex flex-col items-center justify-center h-48 border border-[#1A1A1A]">
        <p className="font-condensed font-black text-[#2A2A2A] text-xl uppercase tracking-widest">{t('noDiagnostics')}</p>
        <p className="text-[#1A1A1A] text-xs font-condensed uppercase tracking-widest mt-2">Run a diagnosis from any tab</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="border-b border-[#1A1A1A] pb-3 mb-4 flex items-center justify-between">
        <h2 className="font-condensed font-black text-white text-2xl uppercase leading-none">{t('diagnosticReport')}</h2>
        <span className="text-[10px] text-[#2A2A2A] font-mono">{new Date().toLocaleString()}</span>
      </div>

      {diagnosis && (
        <Section title={t('aiDiagnosis')} borderColor={SEV_BORDER[diagnosis.severity] ?? SEV_BORDER.Moderate}>
          <div className="flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 border text-[11px] font-condensed font-bold uppercase tracking-wide ${SEV_BADGE[diagnosis.severity] ?? SEV_BADGE.Moderate}`}>
              {diagnosis.severity}
            </span>
            <span className="px-2.5 py-1 bg-[#111] text-[#555] border border-[#2A2A2A] text-[11px] font-condensed font-bold uppercase">
              RISK: {diagnosis.failure_probability}
            </span>
            <span className="px-2.5 py-1 bg-[#111] text-[#555] border border-[#2A2A2A] text-[11px] font-condensed font-bold uppercase">
              {diagnosis.estimated_cost}
            </span>
          </div>
          <p className="text-sm text-[#CCC] leading-relaxed">{diagnosis.diagnosis_summary}</p>
          {diagnosis.probable_causes?.length > 0 && (
            <ul className="space-y-1">
              {diagnosis.probable_causes.map((c, i) => (
                <li key={i} className="flex gap-2 text-xs text-[#666]">
                  <span className="text-cat flex-shrink-0 font-condensed font-black">›</span>{c}
                </li>
              ))}
            </ul>
          )}
          <div className="border-l-2 border-cat pl-4 py-2 bg-[#111]">
            <p className="text-xs text-[#999] leading-snug">
              <span className="text-cat font-condensed font-black uppercase tracking-wide">{t('actionPrefix')} </span>
              {diagnosis.recommended_action}
            </p>
          </div>
        </Section>
      )}

      {vision && (
        <Section title={t('visualInspection')} borderColor={SEV_BORDER[vision.severity] ?? SEV_BORDER.Moderate}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-[#CCC] flex-1 leading-relaxed">{vision.description}</p>
            <span className={`flex-shrink-0 px-2.5 py-1 border text-[11px] font-condensed font-bold uppercase ${SEV_BADGE[vision.severity] ?? SEV_BADGE.Moderate}`}>
              {vision.severity}
            </span>
          </div>
        </Section>
      )}

      {audio && (
        <Section title={t('audioVibration')} borderColor={SEV_BORDER[audio.severity] ?? SEV_BORDER.Moderate}>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[9px] text-[#444] font-condensed font-bold uppercase tracking-widest mb-1.5">{t('frequencyLabel')}</p>
              <p className="text-white font-mono font-black text-xl">{audio.dominant_frequency_hz.toFixed(1)} <span className="text-sm text-[#444] font-normal">Hz</span></p>
            </div>
            <div>
              <p className="text-[9px] text-[#444] font-condensed font-bold uppercase tracking-widest mb-1.5">{t('anomalyLabel')}</p>
              <p className="text-white font-condensed font-bold uppercase capitalize">{audio.anomaly_type}</p>
            </div>
            <div>
              <p className="text-[9px] text-[#444] font-condensed font-bold uppercase tracking-widest mb-1.5">{t('severityLabel')}</p>
              <span className={`px-2.5 py-1 border text-[11px] font-condensed font-bold uppercase ${SEV_BADGE[audio.severity] ?? SEV_BADGE.Moderate}`}>
                {audio.severity}
              </span>
            </div>
          </div>
        </Section>
      )}

      {risk && (
        <Section title={t('riskAssessment')} borderColor={RISK_BORDER[risk.risk_level] ?? RISK_BORDER.Medium}>
          <div className="flex items-center gap-5">
            <RiskGauge pct={risk.failure_probability_14_days} level={risk.risk_level} />
            <div className="flex-1 space-y-3">
              <span className={`inline-block px-2.5 py-1 border text-[11px] font-condensed font-bold uppercase ${RISK_BADGE[risk.risk_level] ?? RISK_BADGE.Medium}`}>
                {risk.risk_level}
              </span>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <p className="text-[9px] text-[#444] font-condensed font-bold uppercase tracking-widest mb-0.5">{t('estDowntimeCost')}</p>
                  <p className="text-white font-condensed font-black text-xl">${risk.estimated_downtime_cost_usd.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#444] font-condensed font-bold uppercase tracking-widest mb-0.5">{t('actionWindow')}</p>
                  <p className="text-[#888] text-xs leading-snug">{risk.recommended_action_window}</p>
                </div>
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  )
}
