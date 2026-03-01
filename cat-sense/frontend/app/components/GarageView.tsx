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

const CONDITION_STYLE: Record<string, { badge: string; dot: string }> = {
  Good: { badge: 'bg-green-900/60 text-green-300 border-green-700', dot: 'bg-green-500' },
  Fair: { badge: 'bg-yellow-900/60 text-yellow-300 border-yellow-700', dot: 'bg-yellow-400' },
  Poor: { badge: 'bg-red-900/60 text-red-300 border-red-700', dot: 'bg-red-500' },
}

function fmt(iso: string) {
  try { return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return iso }
}

function uid() {
  return getAuth(app).currentUser?.uid ?? 'anonymous'
}

function machineDoc(machineId: string) {
  return doc(db, 'users', uid(), 'machines', machineId)
}

function machinesCol() {
  return collection(db, 'users', uid(), 'machines')
}

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

      updateDoc(machineDoc(machine.id), {
        inspections: arrayUnion(record),
      }).catch(err => console.warn('[Scan] Firestore sync failed:', err))
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : 'Scan failed.')
    } finally {
      setScanning(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const latestCondition = machine.inspections.at(-1)?.overall_condition
  const condStyle = latestCondition ? CONDITION_STYLE[latestCondition] : null

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#FFC200] transition-colors">
        {t('backToGarage')}
      </button>

      {/* Machine info card */}
      <div className="bg-gray-900 border border-gray-700/50 rounded-2xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-bold text-white text-base leading-tight">{machine.nickname}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{machine.description}</p>
          </div>
          <span className="text-2xl">🏗</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div><span className="text-gray-500">{t('pinLabel')}</span><p className="text-gray-200 font-mono">{machine.pin}</p></div>
          <div><span className="text-gray-500">{t('modelLabel')}</span><p className="text-gray-200">{machine.model_code}</p></div>
          <div><span className="text-gray-500">{t('familyLabel')}</span><p className="text-gray-200">{machine.model_family}</p></div>
          <div><span className="text-gray-500">{t('serialLabel')}</span><p className="text-gray-200 font-mono">{machine.serial_number || '—'}</p></div>
          {machine.year && <div><span className="text-gray-500">{t('yearLabel')}</span><p className="text-gray-200">{machine.year}</p></div>}
          <div><span className="text-gray-500">{t('addedLabel')}</span><p className="text-gray-200">{fmt(machine.added_at)}</p></div>
        </div>
        {condStyle && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-gray-500">{t('latestCondition')}</span>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${condStyle.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${condStyle.dot}`} />{latestCondition}
            </span>
          </div>
        )}
      </div>

      {/* Upload inspection */}
      <div className="bg-gray-900 border border-[#FFC200]/20 rounded-2xl p-4">
        <p className="text-xs font-semibold text-[#FFC200] mb-2">{t('uploadInspectionDoc')}</p>
        <p className="text-[11px] text-gray-500 mb-3">{t('uploadHint')}</p>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleScan} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="w-full py-2 rounded-xl border border-dashed border-[#FFC200]/40 text-xs text-[#FFC200] hover:bg-[#FFC200]/5 disabled:opacity-40 transition-colors"
        >
          {scanning ? t('scanning') : t('chooseFile')}
        </button>
        {scanError && <p className="mt-2 text-xs text-red-400">{scanError}</p>}
      </div>

      {/* Inspection history */}
      {machine.inspections.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium px-1">
            Inspection History ({machine.inspections.length})
          </p>
          {[...machine.inspections].reverse().map(rec => {
            const cs = CONDITION_STYLE[rec.overall_condition] ?? CONDITION_STYLE.Fair
            return (
              <div key={rec.id} className="bg-gray-900 border border-gray-700/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-300 font-medium truncate">{rec.filename}</span>
                  <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${cs.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cs.dot}`} />{rec.overall_condition}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-snug">{rec.summary}</p>
                {rec.issues_found.length > 0 && (
                  <ul className="space-y-0.5">
                    {rec.issues_found.map((issue, i) => (
                      <li key={i} className="text-xs text-gray-300 flex gap-2">
                        <span className="text-[#FFC200]">›</span><span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[10px] text-gray-600">{fmt(rec.scanned_at)}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-600 text-center py-4">{t('noInspections')}</p>
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
        return {
          id: d.id,
          ...data,
          inspections: (data.inspections ?? []) as InspectionRecord[],
        } as Machine
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
        nickname: m.nickname,
        pin: m.pin,
        model_family: m.model_family,
        model_code: m.model_code,
        serial_number: m.serial_number,
        year: m.year ?? null,
        description: m.description,
        added_at: m.added_at,
        inspections: [],
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
      {/* Add machine form */}
      <div className="bg-gray-900 border border-[#FFC200]/20 rounded-2xl p-4">
        <p className="text-xs font-semibold text-[#FFC200] mb-3">{t('registerMachine')}</p>
        <form onSubmit={handleAdd} className="space-y-2">
          <input
            className="w-full bg-gray-800 text-sm text-gray-100 placeholder-gray-500 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#FFC200]/40"
            placeholder={t('nicknamePlaceholder')}
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={60}
          />
          <input
            className="w-full bg-gray-800 text-sm text-gray-100 placeholder-gray-500 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#FFC200]/40 font-mono tracking-wider"
            placeholder={t('pinPlaceholder')}
            value={pin}
            onChange={e => setPin(e.target.value.toUpperCase())}
            maxLength={17}
          />
          {addError && <p className="text-xs text-red-400">{addError}</p>}
          <button
            type="submit"
            disabled={adding || pin.length !== 17 || !nickname.trim()}
            className="w-full py-2 rounded-xl bg-[#FFC200] text-gray-900 text-xs font-semibold hover:bg-yellow-300 disabled:opacity-30 transition-colors"
          >
            {adding ? t('adding') : t('addMachine')}
          </button>
        </form>
      </div>

      {/* Machine list */}
      {loading ? (
        <p className="text-xs text-gray-600 text-center py-6">{t('loadingGarage')}</p>
      ) : machines.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🏗</p>
          <p className="text-sm text-gray-500">{t('garageEmpty')}</p>
          <p className="text-xs text-gray-600 mt-1">{t('addFirst')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium px-1">
            {machines.length} Machine{machines.length !== 1 ? 's' : ''}
          </p>
          {machines.map(m => {
            const latest = m.inspections.at(-1)
            const cs = latest ? CONDITION_STYLE[latest.overall_condition] : null
            return (
              <div
                key={m.id}
                className="bg-gray-900 border border-gray-700/40 rounded-2xl p-3.5 flex items-center gap-3 hover:border-[#FFC200]/30 transition-colors cursor-pointer group"
                onClick={() => setSelected(m)}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">🏗</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-100 leading-tight truncate">{m.nickname}</p>
                  <p className="text-[11px] text-gray-500 truncate">{m.model_family} · {m.model_code}</p>
                  <p className="text-[10px] text-gray-600 font-mono">{m.pin}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {cs && (
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cs.badge}`}>
                      <span className={`w-1 h-1 rounded-full ${cs.dot}`} />{latest!.overall_condition}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-600 group-hover:text-gray-400">
                      {m.inspections.length} inspection{m.inspections.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); handleRemove(m.id) }}
                      className="text-gray-700 hover:text-red-400 text-sm leading-none transition-colors ml-1"
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
