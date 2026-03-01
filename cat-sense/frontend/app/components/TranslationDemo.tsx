'use client'
import { useState, useRef } from 'react'
import { Loader2, Globe } from 'lucide-react'
import { translateTexts } from '../api'

// ── Source strings (English) ──────────────────────────────────────────────────

const SOURCE: Record<string, string> = {
  inspectionTitle: 'Daily Walkaround Inspection',
  inspectionSubtitle: 'CAT 950 Wheel Loader - Unit #4821',
  dateLabel: 'Date',
  inspectorLabel: 'Inspector',
  siteLabel: 'Site',
  passLabel: 'Pass',
  monitorLabel: 'Monitor',
  failLabel: 'Fail',
  passStatus: 'Pass',
  monitorStatus: 'Monitor',
  failStatus: 'Fail',
  engineSection: 'Engine & Fluids',
  engineOil: 'Engine Oil Level',
  coolantLevel: 'Coolant Level',
  hydraulicFluid: 'Hydraulic Fluid',
  fuelLevel: 'Fuel Level',
  tiresSection: 'Tires & Undercarriage',
  frontLeftTire: 'Front Left Tire',
  frontRightTire: 'Front Right Tire',
  rearLeftTire: 'Rear Left Tire',
  rearRightTire: 'Rear Right Tire',
  safetySection: 'Safety & Lights',
  headlights: 'Headlights',
  backupAlarm: 'Backup Alarm',
  seatbelt: 'Seatbelt',
  fireExtinguisher: 'Fire Extinguisher',
  notesLabel: 'Inspector Notes',
  notesText:
    'Front right tire shows signs of uneven wear on the outer edge. Recommend immediate inspection by maintenance team before next operational shift. All fluid levels within acceptable range. Hydraulic fluid slightly below optimal - schedule top-up within 48 hours.',
  submitBtn: 'Submit Report',
  saveBtn: 'Save Draft',
}

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="text-[10px] text-[#FFC200]/70 uppercase tracking-widest font-bold mb-2 pb-1.5 border-b border-gray-800">
      {children}
    </p>
  )
}

type BadgeVariant = 'pass' | 'monitor' | 'fail'
const BADGE_STYLES: Record<BadgeVariant, string> = {
  pass: 'bg-green-900/30 text-green-400 border border-green-500/40',
  monitor: 'bg-orange-900/30 text-orange-400 border border-orange-500/40',
  fail: 'bg-red-900/30 text-red-400 border border-red-500/40',
}

function InspectionRow({ label, badge, variant }: { label: string; badge: string; variant: BadgeVariant }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-900 px-3 py-2.5">
      <span className="text-xs text-gray-200">{label}</span>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE_STYLES[variant]}`}>{badge}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TranslationDemo() {
  const [lang, setLang] = useState('en')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cache = useRef<Record<string, Record<string, string>>>({ en: SOURCE })

  const t = cache.current[lang] ?? SOURCE

  async function switchLang(code: string) {
    if (code === lang) return
    setError(null)

    if (cache.current[code]) {
      setLang(code)
      return
    }

    setLoading(true)
    try {
      const keys = Object.keys(SOURCE)
      const texts = Object.values(SOURCE)
      const data = await translateTexts(texts, code) as { translations: string[] }
      const translated: Record<string, string> = {}
      keys.forEach((k, i) => { translated[k] = data.translations[i] })
      cache.current[code] = translated
      setLang(code)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Translation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Language switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Globe className="h-3.5 w-3.5 text-[#FFC200]" />
          <span>Language</span>
        </div>
        <div className="flex gap-1">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => switchLang(l.code)}
              disabled={loading}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                lang === l.code
                  ? 'bg-[#FFC200] text-gray-900 border-[#FFC200]'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FFC200]" />
          Translating with Gemini AI…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Inspection report */}
      <div className={`space-y-4 ${loading ? 'opacity-40 pointer-events-none' : ''} transition-opacity`}>
        {/* Header */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-1">
          <h2 className="text-base font-extrabold text-white uppercase tracking-wide leading-tight">
            {t.inspectionTitle}
          </h2>
          <p className="text-xs text-gray-500">{t.inspectionSubtitle}</p>
          <div className="pt-2 text-[11px] text-gray-500 space-y-0.5">
            <div><span className="text-[#FFC200] font-semibold">{t.dateLabel}:</span> Feb 28, 2025</div>
            <div><span className="text-[#FFC200] font-semibold">{t.inspectorLabel}:</span> J. Martinez</div>
            <div><span className="text-[#FFC200] font-semibold">{t.siteLabel}:</span> Zone A - North Pit</div>
          </div>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-900 border border-green-500/20 rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold text-green-400">14</p>
            <p className="text-[10px] text-gray-500">{t.passLabel}</p>
          </div>
          <div className="bg-gray-900 border border-orange-500/20 rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold text-orange-400">3</p>
            <p className="text-[10px] text-gray-500">{t.monitorLabel}</p>
          </div>
          <div className="bg-gray-900 border border-red-500/20 rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold text-red-400">1</p>
            <p className="text-[10px] text-gray-500">{t.failLabel}</p>
          </div>
        </div>

        {/* Engine & Fluids */}
        <div className="space-y-2">
          <SectionTitle>{t.engineSection}</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <InspectionRow label={t.engineOil} badge={t.passStatus} variant="pass" />
            <InspectionRow label={t.coolantLevel} badge={t.passStatus} variant="pass" />
            <InspectionRow label={t.hydraulicFluid} badge={t.monitorStatus} variant="monitor" />
            <InspectionRow label={t.fuelLevel} badge={t.passStatus} variant="pass" />
          </div>
        </div>

        {/* Tires */}
        <div className="space-y-2">
          <SectionTitle>{t.tiresSection}</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <InspectionRow label={t.frontLeftTire} badge={t.passStatus} variant="pass" />
            <InspectionRow label={t.frontRightTire} badge={t.failStatus} variant="fail" />
            <InspectionRow label={t.rearLeftTire} badge={t.passStatus} variant="pass" />
            <InspectionRow label={t.rearRightTire} badge={t.monitorStatus} variant="monitor" />
          </div>
        </div>

        {/* Safety */}
        <div className="space-y-2">
          <SectionTitle>{t.safetySection}</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <InspectionRow label={t.headlights} badge={t.passStatus} variant="pass" />
            <InspectionRow label={t.backupAlarm} badge={t.passStatus} variant="pass" />
            <InspectionRow label={t.seatbelt} badge={t.passStatus} variant="pass" />
            <InspectionRow label={t.fireExtinguisher} badge={t.monitorStatus} variant="monitor" />
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-1.5">
          <p className="text-[10px] text-[#FFC200]/60 uppercase tracking-widest font-medium">{t.notesLabel}</p>
          <p className="text-xs text-gray-300 leading-relaxed">{t.notesText}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button className="flex-1 py-2.5 rounded-xl bg-[#FFC200] text-gray-900 text-xs font-bold hover:bg-yellow-300 transition-colors">
            {t.submitBtn}
          </button>
          <button className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-xs font-bold hover:border-gray-500 hover:bg-gray-800/40 transition-colors">
            {t.saveBtn}
          </button>
        </div>
      </div>
    </div>
  )
}
