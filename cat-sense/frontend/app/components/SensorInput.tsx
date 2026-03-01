'use client'
import { useState } from 'react'
import { fetchRisk } from '../api'
import { useT } from '../i18n/TranslationContext'

interface RiskResult {
  failure_probability_14_days: number
  estimated_downtime_cost_usd: number
  recommended_action_window: string
  risk_level: string
}
interface Props {
  sessionId: string
  onResult: (r: RiskResult) => void
}

const RISK_COLOR: Record<string, string> = {
  Low:      'text-green-400',
  Medium:   'text-cat',
  High:     'text-orange-400',
  Critical: 'text-red-400',
}
const RISK_BORDER: Record<string, string> = {
  Low:      'border-green-500',
  Medium:   'border-cat',
  High:     'border-orange-400',
  Critical: 'border-red-500',
}
const RISK_BADGE: Record<string, string> = {
  Low:      'bg-green-950 text-green-400 border-green-900',
  Medium:   'bg-yellow-950 text-yellow-400 border-yellow-900',
  High:     'bg-orange-950 text-orange-400 border-orange-900',
  Critical: 'bg-red-950 text-red-400 border-red-900',
}

export default function SensorInput({ sessionId, onResult }: Props) {
  const { t } = useT()
  const [temp, setTemp] = useState('85')
  const [pressure, setPressure] = useState('120')
  const [severity, setSeverity] = useState<'Minor' | 'Moderate' | 'Severe'>('Moderate')
  const [result, setResult] = useState<RiskResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    const tempVal = parseFloat(temp)
    const pressVal = parseFloat(pressure)
    if (isNaN(tempVal) || tempVal < -50 || tempVal > 300) { setError(t('tempError')); return }
    if (isNaN(pressVal) || pressVal < 0 || pressVal > 500) { setError(t('pressureError')); return }
    setLoading(true)
    try {
      const data = await fetchRisk({ session_id: sessionId, severity, temperature_c: tempVal, pressure_psi: pressVal })
      setResult(data)
      onResult(data)
    } catch {
      setError(t('riskBackendError'))
    } finally {
      setLoading(false)
    }
  }

  const SEV_KEYS: Record<'Minor' | 'Moderate' | 'Severe', string> = {
    Minor: 'minor', Moderate: 'moderate', Severe: 'severe',
  }
  const SEV_ACTIVE: Record<'Minor' | 'Moderate' | 'Severe', string> = {
    Minor:    'bg-green-950 text-green-400 border border-green-800',
    Moderate: 'bg-cat text-cat-black border border-cat',
    Severe:   'bg-red-950 text-red-400 border border-red-800',
  }

  const riskBorder = result ? (RISK_BORDER[result.risk_level] ?? RISK_BORDER.Medium) : ''
  const riskColor = result ? (RISK_COLOR[result.risk_level] ?? RISK_COLOR.Medium) : ''
  const riskBadge = result ? (RISK_BADGE[result.risk_level] ?? RISK_BADGE.Medium) : ''

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="border-b border-[#1A1A1A] pb-3 mb-4">
        <h2 className="font-condensed font-black text-white text-2xl uppercase leading-none">{t('tabSensors')}</h2>
        <p className="text-[#444] text-sm mt-1">Predictive failure probability &amp; downtime cost estimation</p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-condensed font-bold uppercase tracking-widest text-[10px] text-cat mb-2">{t('tempLabel')}</label>
          <input
            type="number"
            value={temp}
            onChange={e => setTemp(e.target.value)}
            className="w-full bg-[#111] border border-[#2A2A2A] rounded-none px-4 py-3 text-sm text-white outline-none focus:border-cat/50 transition-all font-mono"
          />
        </div>
        <div>
          <label className="block font-condensed font-bold uppercase tracking-widest text-[10px] text-cat mb-2">{t('pressureLabel')}</label>
          <input
            type="number"
            value={pressure}
            onChange={e => setPressure(e.target.value)}
            className="w-full bg-[#111] border border-[#2A2A2A] rounded-none px-4 py-3 text-sm text-white outline-none focus:border-cat/50 transition-all font-mono"
          />
        </div>
      </div>

      {/* Severity selector */}
      <div>
        <label className="block font-condensed font-bold uppercase tracking-widest text-[10px] text-cat mb-2">{t('visualSeverityLabel')}</label>
        <div className="flex gap-2">
          {(['Minor', 'Moderate', 'Severe'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`flex-1 py-3 font-condensed font-black uppercase tracking-widest text-xs transition-all duration-150 active:scale-[0.97] ${
                severity === s
                  ? SEV_ACTIVE[s] + ' shadow-[0_0_16px_rgba(255,205,17,0.25)]'
                  : 'bg-cat-black border border-[#2A2A2A] text-cat/40 hover:border-cat/40 hover:text-cat/80 hover:bg-cat/5'
              }`}
            >
              {t(SEV_KEYS[s])}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-xs font-condensed uppercase tracking-wide">{error}</p>}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full bg-cat text-black font-condensed font-black py-4 uppercase tracking-widest text-sm disabled:opacity-30 hover:bg-yellow-300 hover:shadow-[0_0_32px_rgba(255,205,17,0.6)] active:scale-[0.98] transition-all duration-150"
      >
        {loading ? t('computing') : t('computeRisk')}
      </button>

      {result && !loading && (
        <div className={`bg-cat-black border-l-4 ${riskBorder} p-5 space-y-4 animate-fade-slide-in`}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-cat font-condensed font-black uppercase tracking-widest">{t('riskAssessment')}</span>
            <span className={`font-condensed font-black text-3xl uppercase ${riskColor}`}>
              {result.risk_level}
            </span>
          </div>

          {/* Badge */}
          <span className={`inline-block px-3 py-1 border text-[11px] font-condensed font-bold uppercase tracking-wide ${riskBadge}`}>
            {result.risk_level} RISK
          </span>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#111] border border-[#2A2A2A] p-4">
              <p className="text-[9px] text-[#444] font-condensed font-bold uppercase tracking-widest mb-2">{t('failureProbability')}</p>
              <p className={`font-mono font-black text-4xl leading-none ${riskColor}`}>
                {result.failure_probability_14_days.toFixed(0)}
                <span className="text-base text-[#444] font-normal">%</span>
              </p>
              <p className="text-[9px] text-[#333] font-condensed uppercase tracking-wider mt-1">14-DAY WINDOW</p>
            </div>
            <div className="bg-[#111] border border-[#2A2A2A] p-4">
              <p className="text-[9px] text-[#444] font-condensed font-bold uppercase tracking-widest mb-2">{t('estDowntimeCost')}</p>
              <p className="text-white font-condensed font-black text-2xl leading-none">${result.estimated_downtime_cost_usd.toLocaleString()}</p>
            </div>
          </div>

          {/* Action window */}
          <div className="border-t border-[#1A1A1A] pt-4">
            <p className="text-[9px] text-cat font-condensed font-black uppercase tracking-widest mb-2">{t('actionWindow')}</p>
            <p className="text-sm text-[#999] leading-snug">{result.recommended_action_window}</p>
          </div>
        </div>
      )}
    </div>
  )
}
