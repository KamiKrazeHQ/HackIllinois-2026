'use client'
import { useState, useEffect, useRef } from 'react'
import { getAuth } from 'firebase/auth'
import {
  collection, doc, setDoc, deleteDoc, updateDoc,
  arrayUnion, query, orderBy, onSnapshot,
} from 'firebase/firestore'
import { app, db } from '../firebase'
import { addMachine as addMachineAPI, scanInspection as scanInspectionAPI } from '../api'
import { useT } from '../i18n/TranslationContext'

interface InspectionRecord {
  id: string
  filename: string
  summary: string
  issues_found: string[]
  overall_condition: 'Good' | 'Fair' | 'Poor'
  scanned_at: string
}

interface Machine {
  id: string
  nickname: string
  pin: string
  model_family: string
  model_code: string
  serial_number: string
  year: string | null
  description: string
  inspections: InspectionRecord[]
  added_at: string
}

const CONDITION_BORDER: Record<string, string> = {
  Good: 'border-green-500',
  Fair: 'border-cat',
  Poor: 'border-red-500',
}
const CONDITION_BADGE: Record<string, string> = {
  Good: 'bg-green-950 text-green-400 border-green-900',
  Fair: 'bg-yellow-950 text-yellow-400 border-yellow-900',
  Poor: 'bg-red-950 text-red-400 border-red-900',
}
const CONDITION_DOT: Record<string, string> = {
  Good: 'bg-green-500',
  Fair: 'bg-yellow-400',
  Poor: 'bg-red-500',
}

function fmt(iso: string) {
  try { return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return iso }
}

function uid() { return getAuth(app).currentUser?.uid ?? 'anonymous' }
function machineDoc(machineId: string) { return doc(db, 'users', uid(), 'machines', machineId) }
function machinesCol() { return collection(db, 'users', uid(), 'machines') }

// ── Machine Detail ─────────────────────────────────────────────────────────────

function MachineDetail({ machine, onBack, onUpdated }: {
  machine: Machine
  onBack: () => void
  onUpdated: (m: Machine) => void
}) {
  const { t } = useT()
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setScanError(null)
    try {
      const record: InspectionRecord = await scanInspectionAPI(machine.id, file, machine.description, machine.pin)
      record.filename = file.name
      const updated = { ...machine, inspections: [...machine.inspections, record] }
      onUpdated(updated)
      updateDoc(machineDoc(machine.id), { inspections: arrayUnion(record) })
        .catch(err => console.warn('[Scan] Firestore sync failed:', err))
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : 'Scan failed.')
    } finally {
      setScanning(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const latestCondition = machine.inspections.at(-1)?.overall_condition
  const condBorder = latestCondition ? CONDITION_BORDER[latestCondition] : 'border-[#2A2A2A]'
  const condBadge = latestCondition ? CONDITION_BADGE[latestCondition] : ''
  const condDot = latestCondition ? CONDITION_DOT[latestCondition] : ''

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-condensed font-bold text-[#444] hover:text-cat uppercase tracking-widest transition-colors"
      >
        ← {t('backToGarage')}
      </button>

      {/* Machine info card */}
      <div className={`bg-cat-black border-l-4 ${condBorder} p-5 space-y-4`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-condensed font-black text-white text-xl uppercase leading-tight">{machine.nickname}</h2>
            <p className="text-xs text-[#444] mt-0.5">{machine.description}</p>
          </div>
          <div className="w-10 h-10 bg-[#111] border border-[#2A2A2A] flex items-center justify-center text-xl flex-shrink-0">🏗</div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            [t('pinLabel'), machine.pin, true],
            [t('modelLabel'), machine.model_code, false],
            [t('familyLabel'), machine.model_family, false],
            [t('serialLabel'), machine.serial_number || '—', true],
            ...(machine.year ? [[t('yearLabel'), machine.year, false]] : []),
            [t('addedLabel'), fmt(machine.added_at), false],
          ].map(([label, value, mono], i) => (
            <div key={i}>
              <p className="text-[9px] text-cat font-condensed font-bold uppercase tracking-widest mb-0.5">{label}</p>
              <p className={`text-sm text-[#CCC] ${mono ? 'font-mono' : 'font-condensed font-semibold'}`}>{value as string}</p>
            </div>
          ))}
        </div>
        {latestCondition && (
          <div className="flex items-center gap-2 pt-2 border-t border-[#1A1A1A]">
            <span className="text-[9px] text-[#444] font-condensed font-bold uppercase tracking-widest">{t('latestCondition')}</span>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 border text-[11px] font-condensed font-bold uppercase ${condBadge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${condDot}`} />{latestCondition}
            </span>
          </div>
        )}
      </div>

      {/* Upload inspection */}
      <div className="bg-cat-black border-l-4 border-cat p-4">
        <p className="text-xs font-condensed font-black text-cat uppercase tracking-widest mb-1">{t('uploadInspectionDoc')}</p>
        <p className="text-[11px] text-[#444] mb-3">{t('uploadHint')}</p>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleScan} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="w-full py-3 border-2 border-dashed border-cat/30 text-xs font-condensed font-black text-cat/60 uppercase tracking-widest hover:bg-cat/5 hover:border-cat/50 hover:text-cat disabled:opacity-30 transition-all"
        >
          {scanning ? t('scanning') : t('chooseFile')}
        </button>
        {scanError && <p className="mt-2 text-xs text-red-400 font-condensed uppercase">{scanError}</p>}
      </div>

      {/* Inspection history */}
      {machine.inspections.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[9px] text-cat font-condensed font-black uppercase tracking-widest px-1">
            Inspection History ({machine.inspections.length})
          </p>
          {[...machine.inspections].reverse().map(rec => {
            const border = CONDITION_BORDER[rec.overall_condition] ?? CONDITION_BORDER.Fair
            const badge = CONDITION_BADGE[rec.overall_condition] ?? CONDITION_BADGE.Fair
            const dot = CONDITION_DOT[rec.overall_condition] ?? CONDITION_DOT.Fair
            return (
              <div key={rec.id} className={`bg-cat-black border-l-4 ${border} p-3.5 space-y-2`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#CCC] font-condensed font-bold uppercase truncate">{rec.filename}</span>
                  <span className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-0.5 border text-[10px] font-condensed font-bold uppercase ${badge}`}>
                    <span className={`w-1 h-1 rounded-full ${dot}`} />{rec.overall_condition}
                  </span>
                </div>
                <p className="text-xs text-[#666] leading-snug">{rec.summary}</p>
                {rec.issues_found.length > 0 && (
                  <ul className="space-y-0.5">
                    {rec.issues_found.map((issue, i) => (
                      <li key={i} className="text-xs text-[#555] flex gap-2">
                        <span className="text-cat font-condensed font-black">›</span><span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[10px] text-[#2A2A2A] font-condensed uppercase tracking-wide">{fmt(rec.scanned_at)}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-[#2A2A2A] text-center py-4 font-condensed uppercase tracking-widest">{t('noInspections')}</p>
      )}
    </div>
  )
}

// ── Garage List ────────────────────────────────────────────────────────────────

export default function GarageView() {
  const { t } = useT()
  const [machines, setMachines] = useState<Machine[]>([])
  const [selected, setSelected] = useState<Machine | null>(null)
  const [nickname, setNickname] = useState('')
  const [pin, setPin] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const col = machinesCol()
    const q = query(col, orderBy('added_at', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      const list: Machine[] = snap.docs.map(d => {
        const data = d.data()
        return { id: d.id, ...data, inspections: (data.inspections ?? []) as InspectionRecord[] } as Machine
      })
      setMachines(list)
      if (selected) {
        const updated = list.find(m => m.id === selected.id)
        if (updated) setSelected(updated)
      }
      setLoading(false)
    }, (err) => {
      console.error('[Garage] snapshot error:', err.code, err.message)
      setLoading(false)
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!pin.trim() || !nickname.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      const m = await addMachineAPI(nickname.trim(), pin.trim())
      await setDoc(machineDoc(m.id), {
        nickname: m.nickname, pin: m.pin, model_family: m.model_family,
        model_code: m.model_code, serial_number: m.serial_number,
        year: m.year ?? null, description: m.description,
        added_at: m.added_at, inspections: [],
      })
      setNickname('')
      setPin('')
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add machine.')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(id: string) {
    await deleteDoc(machineDoc(id))
    if (selected?.id === id) setSelected(null)
  }

  function handleUpdated(updated: Machine) {
    setMachines(prev => prev.map(m => m.id === updated.id ? updated : m))
    setSelected(updated)
  }

  if (selected) {
    return <MachineDetail machine={selected} onBack={() => setSelected(null)} onUpdated={handleUpdated} />
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="border-b border-[#1A1A1A] pb-3 mb-4">
        <h2 className="font-condensed font-black text-white text-2xl uppercase leading-none">{t('tabGarage')}</h2>
        <p className="text-[#444] text-sm mt-1">Register and manage your heavy machinery fleet</p>
      </div>

      {/* Add machine form */}
      <div className="bg-cat-black border-l-4 border-cat p-5">
        <p className="text-xs font-condensed font-black text-cat uppercase tracking-widest mb-4">{t('registerMachine')}</p>
        <form onSubmit={handleAdd} className="space-y-2">
          <div>
            <label className="block font-condensed font-bold uppercase tracking-widest text-[10px] text-cat mb-1.5">NICKNAME</label>
            <input
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-none text-sm text-[#CCC] placeholder-[#333] px-3 py-2.5 outline-none focus:border-cat/40 transition-all"
              placeholder={t('nicknamePlaceholder')}
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={60}
            />
          </div>
          <div>
            <label className="block font-condensed font-bold uppercase tracking-widest text-[10px] text-cat mb-1.5">PIN</label>
            <input
              className="w-full bg-[#111] border border-[#2A2A2A] rounded-none text-sm text-[#CCC] placeholder-[#333] px-3 py-2.5 outline-none focus:border-cat/40 transition-all font-mono tracking-wider"
              placeholder={t('pinPlaceholder')}
              value={pin}
              onChange={e => setPin(e.target.value.toUpperCase())}
              maxLength={17}
            />
          </div>
          {addError && <p className="text-xs text-red-400 font-condensed uppercase">{addError}</p>}
          <button
            type="submit"
            disabled={adding || pin.length !== 17 || !nickname.trim()}
            className="w-full py-3 bg-cat text-black text-xs font-condensed font-black uppercase tracking-widest hover:bg-yellow-300 hover:shadow-[0_0_28px_rgba(255,205,17,0.55)] disabled:opacity-30 transition-all duration-150 active:scale-[0.98]"
          >
            {adding ? t('adding') : t('addMachine')}
          </button>
        </form>
      </div>

      {/* Machine list */}
      {loading ? (
        <p className="text-xs text-[#2A2A2A] text-center py-6 font-condensed uppercase tracking-widest">{t('loadingGarage')}</p>
      ) : machines.length === 0 ? (
        <div className="text-center py-10 bg-cat-black border border-[#1A1A1A]">
          <p className="text-4xl mb-3 opacity-20">🏗</p>
          <p className="font-condensed font-black text-[#333] uppercase tracking-widest">{t('garageEmpty')}</p>
          <p className="text-xs text-[#222] font-condensed uppercase tracking-wide mt-1">{t('addFirst')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[9px] text-cat font-condensed font-black uppercase tracking-widest px-1">
            {machines.length} Machine{machines.length !== 1 ? 's' : ''} Registered
          </p>
          {machines.map(m => {
            const latest = m.inspections.at(-1)
            const border = latest ? CONDITION_BORDER[latest.overall_condition] : 'border-[#2A2A2A]'
            const badge = latest ? CONDITION_BADGE[latest.overall_condition] : ''
            const dot = latest ? CONDITION_DOT[latest.overall_condition] : ''
            return (
              <div
                key={m.id}
                className={`bg-cat-black border-l-4 ${border} p-4 flex items-center gap-3 hover:bg-[#111] hover:shadow-[inset_4px_0_20px_rgba(255,205,17,0.07),0_0_0_1px_rgba(255,205,17,0.08)] transition-all duration-150 cursor-pointer group active:scale-[0.995]`}
                onClick={() => setSelected(m)}
              >
                <div className="w-10 h-10 bg-[#111] border border-[#2A2A2A] flex items-center justify-center text-xl flex-shrink-0">🏗</div>
                <div className="flex-1 min-w-0">
                  <p className="font-condensed font-black text-white uppercase leading-tight truncate">{m.nickname}</p>
                  <p className="text-[11px] text-[#444] font-condensed uppercase truncate">{m.model_family} · {m.model_code}</p>
                  <p className="text-[10px] text-[#2A2A2A] font-mono mt-0.5">{m.pin}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {latest && badge && (
                    <span className={`flex items-center gap-1 px-2 py-0.5 border text-[10px] font-condensed font-bold uppercase ${badge}`}>
                      <span className={`w-1 h-1 rounded-full ${dot}`} />{latest.overall_condition}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#2A2A2A] group-hover:text-[#444] font-condensed uppercase transition-colors">
                      {m.inspections.length} scan{m.inspections.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); handleRemove(m.id) }}
                      className="text-[#222] hover:text-red-500 text-sm leading-none transition-colors"
                      aria-label="Remove machine"
                    >✕</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
