'use client'
import { useState } from 'react'
import { fetchRisk } from '../api'

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
  const [temp, setTemp] = useState('85')
  const [pressure, setPressure] = useState('120')
  const [severity, setSeverity] = useState<'Minor' | 'Moderate' | 'Severe'>('Moderate')
  const [result, setResult] = useState<RiskResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    const t = parseFloat(temp)
    const p = parseFloat(pressure)
    if (isNaN(t) || t < -50 || t > 300) { setError('Temperature must be -50 to 300 °C'); return }
    if (isNaN(p) || p < 0 || p > 500) { setError('Pressure must be 0 to 500 PSI'); return }
    setLoading(true)
    try {
      const data = await fetchRisk({ session_id: sessionId, severity, temperature_c: t, pressure_psi: p })
      setResult(data)
      onResult(data)
    } catch {
      setError('Failed to compute risk. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Temperature (°C)</label>
          <input type="number" value={temp} onChange={e => setTemp(e.target.value)}
            className="w-full bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#FFC200]/50" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Pressure (PSI)</label>
          <input type="number" value={pressure} onChange={e => setPressure(e.target.value)}
            className="w-full bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#FFC200]/50" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Visual Severity</label>
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
            >{s}</button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button onClick={submit} disabled={loading}
        className="w-full bg-[#FFC200] text-gray-900 font-semibold py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-yellow-300 transition-colors">
        {loading ? 'Computing…' : 'Compute Risk Score'}
      </button>

      {result && !loading && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 uppercase tracking-wider">Risk Assessment</span>
            <span className={`text-xl font-bold ${RISK_COLOR[result.risk_level] ?? 'text-white'}`}>
              {result.risk_level}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Failure Probability (14d)</p>
              <p className="text-white font-semibold text-2xl">{result.failure_probability_14_days.toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Est. Downtime Cost</p>
              <p className="text-white font-semibold">${result.estimated_downtime_cost_usd.toLocaleString()}</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-2.5">
            <p className="text-xs text-gray-500">Action Window</p>
            <p className="text-sm text-gray-200">{result.recommended_action_window}</p>
          </div>
        </div>
      )}
    </div>
  )
}
