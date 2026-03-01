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
import { useT, LANGS } from './i18n/TranslationContext'
import { Loader2 } from 'lucide-react'

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

const TABS = ['Chat', 'Vision', 'Audio', 'Sensors', 'Report', 'Garage', 'Inspect'] as const
type Tab = typeof TABS[number]

const TAB_KEY: Record<Tab, string> = {
  Chat: 'tabChat', Vision: 'tabVision', Audio: 'tabAudio', Sensors: 'tabSensors',
  Report: 'tabReport', Garage: 'tabGarage', Inspect: 'tabInspect',
}

export default function Home() {
  const [sessionId, setSessionId] = useState('session-default')
  const [user, setUser] = useState<{ email: string | null } | null | undefined>(undefined)
  const { t, lang, setLang, translating } = useT()

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

  if (user === undefined) return null
  if (user === null) return <Login />

  return (
    <div className="flex flex-col h-screen" style={{ background: 'radial-gradient(ellipse at top left, #1a2236 0%, #090D14 55%)' }}>

      {/* ── Yellow Header ── */}
      <header className="flex-shrink-0 bg-cat shadow-[0_8px_40px_rgba(0,0,0,0.7)]">
        <div className="px-8 py-6 flex items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-5">
            <div className="bg-black px-4 py-3 flex items-center justify-center flex-shrink-0">
              <span className="font-condensed font-black text-cat text-2xl leading-none tracking-tighter">CAT</span>
            </div>
            <div>
              <h1 className="font-condensed font-black text-black text-5xl uppercase leading-none tracking-tight">
                CAT SENSE
              </h1>
              <p className="font-condensed text-black/50 text-xs uppercase tracking-[0.3em] font-bold leading-none mt-1.5">
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Active data indicators */}
            {(vision || audio || risk) && (
              <div className="hidden sm:flex gap-1 mr-1">
                {vision && (
                  <span className="px-3 py-2 bg-black text-cat text-[11px] font-condensed font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cat animate-cat-pulse" />VIS
                  </span>
                )}
                {audio && (
                  <span className="px-3 py-2 bg-black text-blue-400 text-[11px] font-condensed font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-cat-pulse" />AUD
                  </span>
                )}
                {risk && (
                  <span className="px-3 py-2 bg-black text-orange-400 text-[11px] font-condensed font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-cat-pulse" />SNS
                  </span>
                )}
              </div>
            )}

            {/* Language switcher */}
            <div className="flex items-center">
              {translating && <Loader2 className="h-4 w-4 animate-spin text-black mr-2" />}
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  disabled={translating}
                  title={l.name}
                  className={`px-4 py-2.5 text-sm font-condensed font-black uppercase tracking-widest transition-all duration-150 disabled:opacity-40 active:scale-95 ${
                    lang === l.code
                      ? 'bg-black text-cat shadow-[0_0_16px_rgba(0,0,0,0.5)]'
                      : 'text-black/60 hover:bg-black/15 hover:text-black'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => signOut(getAuth(app))}
              className="text-black/40 hover:text-black text-xs font-condensed font-bold uppercase tracking-widest transition-all duration-150 ml-1 hover:underline active:scale-95"
            >
              {t('signOut')}
            </button>
          </div>
        </div>

        {/* ── Tab bar (black strip) ── */}
        <div className="bg-black flex overflow-x-auto border-t-2 border-cat/30">
          {TABS.map(tabName => (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              className={`relative px-8 py-5 font-condensed font-black text-base uppercase tracking-widest whitespace-nowrap transition-all duration-150 flex-shrink-0 border-r border-cat/10 active:scale-[0.97] ${
                tab === tabName
                  ? 'text-cat bg-[#0D0D0D] border-b-[3px] border-b-cat shadow-[inset_0_-12px_30px_rgba(255,205,17,0.13),0_0_0_0_transparent]'
                  : 'text-cat/45 hover:text-cat hover:bg-cat/5 hover:shadow-[inset_0_-8px_20px_rgba(255,205,17,0.07)] border-b-[3px] border-b-transparent'
              }`}
            >
              {t(TAB_KEY[tabName])}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ── */}
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
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              {tab === 'Vision'  && <ImageUpload sessionId={sessionId} onResult={setVision} />}
              {tab === 'Audio'   && <AudioRecorder sessionId={sessionId} onResult={setAudio} />}
              {tab === 'Sensors' && <SensorInput sessionId={sessionId} onResult={setRisk} />}
              {tab === 'Report'  && <ReportCard diagnosis={diagnosis} vision={vision} audio={audio} risk={risk} />}
              {tab === 'Garage'  && <GarageView />}
              {tab === 'Inspect' && <InspectionAnalyzer />}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
