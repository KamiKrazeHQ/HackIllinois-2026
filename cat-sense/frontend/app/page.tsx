'use client'
import { useState, useEffect } from 'react'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { app } from './firebase'
import Login from './components/Login'
import ChatWindow from './components/ChatWindow'
import ImageUpload from './components/ImageUpload'
import AudioRecorder from './components/AudioRecorder'
import SensorInput from './components/SensorInput'
import ReportCard from './components/ReportCard'
import GarageView from './components/GarageView'
import InspectionAnalyzer from './components/InspectionAnalyzer'
import TranslationDemo from './components/TranslationDemo'

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

const TABS = ['Chat', 'Vision', 'Audio', 'Sensors', 'Report', 'Garage', 'Inspect', 'Translate'] as const
type Tab = typeof TABS[number]

const TAB_ICONS: Record<Tab, string> = {
  Chat: '💬',
  Vision: '📷',
  Audio: '🎙',
  Sensors: '📊',
  Report: '📋',
  Garage: '🏗',
  Inspect: '🔩',
  Translate: '🌐',
}

export default function Home() {
  const [sessionId, setSessionId] = useState('session-default')
  const [user, setUser] = useState<{ email: string | null } | null | undefined>(undefined)

  useEffect(() => {
    setSessionId('session-' + Math.random().toString(36).slice(2, 9))
  }, [])

  useEffect(() => {
    const auth = getAuth(app)
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ? { email: u.email } : null))
    return unsub
  }, [])

  const [tab, setTab] = useState<Tab>('Chat')
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
  const [vision, setVision] = useState<VisionResult | null>(null)
  const [audio, setAudio] = useState<AudioResult | null>(null)
  const [risk, setRisk] = useState<RiskResult | null>(null)

  // Still loading auth state
  if (user === undefined) return null

  // Not logged in
  if (user === null) return <Login />

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto relative">
      {/* Ambient glow — decorative, pointer-events-none */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 max-w-2xl mx-auto"
        style={{
          background: 'radial-gradient(ellipse 60% 30% at 80% 0%, rgba(255,194,0,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <header className="border-b border-gray-800/80 px-4 py-3 flex items-center justify-between flex-shrink-0 backdrop-blur-sm bg-gray-950/80 sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#FFC200] rounded-lg flex items-center justify-center text-gray-900 font-bold text-sm shadow-glow-cat">
            CAT
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none tracking-tight">CAT Sense</h1>
            <p className="text-[10px] text-gray-500 leading-none mt-0.5 tracking-wide">Heavy Machinery Diagnostics</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {(diagnosis || vision || audio || risk) && (
            <div className="flex gap-1.5 items-center">
              {vision && (
                <span className="flex items-center gap-1 text-[10px] text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Vision
                </span>
              )}
              {audio && (
                <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Audio
                </span>
              )}
              {risk && (
                <span className="flex items-center gap-1 text-[10px] text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />Sensors
                </span>
              )}
            </div>
          )}
          <span className="text-[10px] text-gray-700 font-mono tabular-nums hidden sm:block">{sessionId}</span>
          <button
            onClick={() => signOut(getAuth(app))}
            className="text-[10px] text-gray-600 hover:text-gray-300 border border-gray-800 hover:border-gray-600 rounded-lg px-2 py-1 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="border-b border-gray-800/80 px-3 flex gap-0.5 flex-shrink-0 bg-gray-950/60 backdrop-blur-sm">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-xs font-medium transition-all relative rounded-t-md ${
              tab === t ? 'text-[#FFC200]' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40'
            }`}
          >
            <span className="mr-1">{TAB_ICONS[t]}</span>{t}
            {tab === t && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#FFC200] rounded-full shadow-[0_0_6px_rgba(255,194,0,0.6)]" />
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === 'Chat' && (
          <ChatWindow
            sessionId={sessionId}
            onDiagnosis={setDiagnosis}
            onVision={setVision}
            onAudio={setAudio}
            onRisk={setRisk}
          />
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
            {tab === 'Garage' && <GarageView />}
            {tab === 'Inspect' && <InspectionAnalyzer />}
            {tab === 'Translate' && <TranslationDemo />}
          </div>
        )}
      </main>
    </div>
  )
}
