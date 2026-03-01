import { useT } from '../i18n/TranslationContext'

interface Diagnosis {
  diagnosis_summary: string
  probable_causes: string[]
  severity: string
  failure_probability: string
  estimated_cost: string
  recommended_action: string
}

interface DisplayDiagnosis {
  probable_causes?: string[]
  recommended_action?: string
}

interface Props {
  role: 'user' | 'assistant'
  content: string
  diagnosis?: Diagnosis
  displayDiagnosis?: DisplayDiagnosis
  timestamp?: string
  isLast?: boolean
}

const SEV_BORDER: Record<string, string> = {
  Minor:    'border-green-500',
  Moderate: 'border-cat',
  Severe:   'border-red-500',
}
const SEV_BADGE: Record<string, string> = {
  Minor:    'bg-green-950 text-green-400 border-green-900',
  Moderate: 'bg-yellow-950 text-yellow-400 border-yellow-900',
  Severe:   'bg-red-950 text-red-400 border-red-900',
}

function CatAvatar() {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="bg-cat w-8 h-8 rounded-full flex items-center justify-center shadow-[0_0_16px_rgba(255,205,17,0.55)]">
        <span className="font-condensed font-black text-black text-[9px] leading-none">CAT</span>
      </div>
      <span className="text-[7px] text-cat/40 font-condensed uppercase tracking-wide">AI</span>
    </div>
  )
}

export default function MessageBubble({ role, content, diagnosis, displayDiagnosis, timestamp, isLast }: Props) {
  const { t } = useT()
  const isUser = role === 'user'
  const sevBorder = diagnosis?.severity ? SEV_BORDER[diagnosis.severity] ?? SEV_BORDER.Moderate : SEV_BORDER.Moderate
  const sevBadge = diagnosis?.severity ? SEV_BADGE[diagnosis.severity] ?? SEV_BADGE.Moderate : SEV_BADGE.Moderate
  const causes = displayDiagnosis?.probable_causes ?? diagnosis?.probable_causes
  const action = displayDiagnosis?.recommended_action ?? diagnosis?.recommended_action

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-5 items-end animate-fade-slide-in`}>
      {/* Avatar — AI only */}
      {!isUser ? <CatAvatar /> : <div className="w-8 h-8 flex-shrink-0" />}

      <div className={`max-w-[82%] space-y-2 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div
          className={`px-4 py-3 text-sm leading-relaxed transition-all duration-200 ${
            isUser
              ? 'bg-cat text-black font-medium rounded-xl rounded-br-sm border-r-2 border-yellow-300 hover:brightness-110 hover:-translate-y-[1px] hover:shadow-[0_4px_20px_rgba(255,205,17,0.35)]'
              : 'bg-[#111827] text-gray-100 rounded-xl rounded-bl-sm border border-white/5 hover:border-white/10 hover:-translate-y-[1px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
          }`}
        >
          {content}
        </div>

        {/* Timestamp */}
        {timestamp && isLast && (
          <span className={`text-[10px] text-[#2A2A2A] px-1 font-condensed uppercase tracking-wider ${isUser ? 'self-end' : 'self-start'}`}>
            {timestamp}
          </span>
        )}

        {/* Diagnosis card */}
        {!isUser && diagnosis && (
          <div className={`w-full bg-[#111827] border-l-4 ${sevBorder} rounded-xl rounded-tl-none overflow-hidden animate-slide-down`}>
            <div className="px-4 py-3 space-y-3 text-xs">
              {/* Stats row */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`px-2.5 py-1 border text-[11px] font-condensed font-bold uppercase tracking-wide ${sevBadge}`}>
                  {diagnosis.severity}
                </span>
                <span className="text-[#444] text-[9px] font-condensed font-bold uppercase tracking-widest bg-[#111] border border-[#2A2A2A] px-2.5 py-1">
                  RISK: <span className="text-white font-mono">{diagnosis.failure_probability}</span>
                </span>
                <span className="text-[#444] text-[9px] font-condensed font-bold uppercase tracking-widest bg-[#111] border border-[#2A2A2A] px-2.5 py-1">
                  COST: <span className="text-white">{diagnosis.estimated_cost}</span>
                </span>
              </div>

              {/* Probable causes */}
              {causes && causes.length > 0 && (
                <div>
                  <p className="text-[9px] text-cat font-condensed font-black uppercase tracking-widest mb-2">
                    {t('probableCauses')}
                  </p>
                  <ul className="space-y-1.5">
                    {causes.map((c, i) => (
                      <li key={i} className="flex gap-2 text-[#888] leading-snug">
                        <span className="text-cat flex-shrink-0 font-condensed font-black">›</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended action */}
              {action && (
                <div className="border-t border-[#1A1A1A] pt-3">
                  <p className="text-[9px] text-cat font-condensed font-black uppercase tracking-widest mb-2">
                    {t('recommendedAction')}
                  </p>
                  <div className="flex gap-2.5">
                    <div className="w-0.5 flex-shrink-0 bg-cat mt-0.5 mb-0.5" />
                    <p className="text-[#BBB] leading-snug">{action}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
