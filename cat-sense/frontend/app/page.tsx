'use client'
import { useState, useEffect } from 'react'
import ChatWindow from './components/ChatWindow'
import ImageUpload from './components/ImageUpload'
import AudioRecorder from './components/AudioRecorder'
import SensorInput from './components/SensorInput'
import ReportCard from './components/ReportCard'

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

const TABS = ['Chat', 'Vision', 'Audio', 'Sensors', 'Report'] as const
type Tab = typeof TABS[number]

const TAB_ICONS: Record<Tab, string> = {
  Chat: '💬',
  Vision: '📷',
  Audio: '🎙',
  Sensors: '📊',
  Report: '📋',
}

export default function Home() {
  const [sessionId, setSessionId] = useState('session-default')
  useEffect(() => {
    setSessionId('session-' + Math.random().toString(36).slice(2, 9))
  }, [])
  const [tab, setTab] = useState<Tab>('Chat')
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
  const [vision, setVision] = useState<VisionResult | null>(null)
  const [audio, setAudio] = useState<AudioResult | null>(null)
  const [risk, setRisk] = useState<RiskResult | null>(null)

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#FFC200] rounded-lg flex items-center justify-center text-gray-900 font-bold text-sm">
            CAT
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">CAT Sense</h1>
            <p className="text-[10px] text-gray-500 leading-none mt-0.5">Heavy Machinery Diagnostics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(diagnosis || vision || audio || risk) && (
            <div className="flex gap-1">
              {vision && <span className="w-2 h-2 rounded-full bg-green-500" title="Vision data" />}
              {audio && <span className="w-2 h-2 rounded-full bg-blue-500" title="Audio data" />}
              {risk && <span className="w-2 h-2 rounded-full bg-orange-500" title="Risk data" />}
            </div>
          )}
          <span className="text-[10px] text-gray-600 font-mono">{sessionId}</span>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="border-b border-gray-800 px-3 flex gap-1 flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-xs font-medium transition-colors relative ${
              tab === t ? 'text-[#FFC200]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="mr-1">{TAB_ICONS[t]}</span>{t}
            {tab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFC200] rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === 'Chat' && (
          <ChatWindow sessionId={sessionId} onDiagnosis={setDiagnosis} />
        )}
        {tab !== 'Chat' && (
          <div className="h-full overflow-y-auto p-4">
            {tab === 'Vision' && (
              <ImageUpload sessionId={sessionId} onResult={setVision} />
            )}
            {tab === 'Audio' && (
              <AudioRecorder sessionId={sessionId} onResult={setAudio} />
            )}
            {tab === 'Sensors' && (
              <SensorInput sessionId={sessionId} onResult={setRisk} />
            )}
            {tab === 'Report' && (
              <ReportCard diagnosis={diagnosis} vision={vision} audio={audio} risk={risk} />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
