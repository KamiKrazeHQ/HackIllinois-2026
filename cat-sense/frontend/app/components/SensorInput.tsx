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
  Low: 'text-green-400',
  Medium: 'text-yellow-400',
  High: 'text-orange-400',
  Critical: 'text-red-400',
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
    Minor: 'minor',
    Moderate: 'moderate',
    Severe: 'severe',
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">{t('tempLabel')}</label>
          <input type="number" value={temp} onChange={e => setTemp(e.target.value)}
            className="w-full bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#FFC200]/50" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">{t('pressureLabel')}</label>
          <input type="number" value={pressure} onChange={e => setPressure(e.target.value)}
            className="w-full bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#FFC200]/50" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">{t('visualSeverityLabel')}</label>
        <div className="flex gap-2">
          {(['Minor', 'Moderate', 'Severe'] as const).map(s => (
            <button key={s} onClick={() => setSeverity(s)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                severity === s
                  ? s === 'Minor' ? 'bg-green-700 text-white'
                    : s === 'Moderate' ? 'bg-yellow-700 text-white'
                    : 'bg-red-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >{t(SEV_KEYS[s])}</button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button onClick={submit} disabled={loading}
        className="w-full bg-[#FFC200] text-gray-900 font-semibold py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-yellow-300 transition-colors">
        {loading ? t('computing') : t('computeRisk')}
      </button>

      {result && !loading && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 uppercase tracking-wider">{t('riskAssessment')}</span>
            <span className={`text-xl font-bold ${RISK_COLOR[result.risk_level] ?? 'text-white'}`}>
              {result.risk_level}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">{t('failureProbability')}</p>
              <p className="text-white font-semibold text-2xl">{result.failure_probability_14_days.toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('estDowntimeCost')}</p>
              <p className="text-white font-semibold">${result.estimated_downtime_cost_usd.toLocaleString()}</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-2.5">
            <p className="text-xs text-gray-500">{t('actionWindow')}</p>
            <p className="text-sm text-gray-200">{result.recommended_action_window}</p>
          </div>
        </div>
      )}
    </div>
  )
}
