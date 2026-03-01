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

const SEV_STYLE: Record<string, { badge: string; bar: string }> = {
  Minor:    { badge: 'bg-green-900/60 text-green-300 border-green-700',    bar: 'bg-green-500' },
  Moderate: { badge: 'bg-yellow-900/60 text-yellow-300 border-yellow-700', bar: 'bg-yellow-400' },
  Severe:   { badge: 'bg-red-900/60 text-red-300 border-red-700',          bar: 'bg-red-500' },
}

function CatAvatar() {
  return (
    <div className="w-7 h-7 rounded-lg bg-[#FFC200] flex items-center justify-center text-gray-900 font-bold text-[10px] flex-shrink-0 shadow-sm">
      CAT
    </div>
  )
}

export default function MessageBubble({ role, content, diagnosis, displayDiagnosis, timestamp, isLast }: Props) {
  const { t } = useT()
  const isUser = role === 'user'
  const sev = diagnosis?.severity ? SEV_STYLE[diagnosis.severity] ?? SEV_STYLE.Minor : null

  const causes = displayDiagnosis?.probable_causes ?? diagnosis?.probable_causes
  const action = displayDiagnosis?.recommended_action ?? diagnosis?.recommended_action

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4 items-end animate-fade-slide-in`}>
      {/* Avatar — AI only */}
      {!isUser ? <CatAvatar /> : <div className="w-7 flex-shrink-0" />}

      <div className={`max-w-[78%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-card ${
            isUser
              ? 'bg-[#FFC200] text-gray-900 font-medium rounded-br-sm'
              : 'bg-gray-800/90 text-gray-100 rounded-bl-sm border border-gray-700/40 backdrop-blur-sm'
          }`}
        >
          {content}
        </div>

        {/* Timestamp */}
        {timestamp && isLast && (
          <span className={`text-[10px] text-gray-600 px-1 animate-fade-in ${isUser ? 'self-end' : 'self-start'}`}>
            {timestamp}
          </span>
        )}

        {/* Diagnosis card — AI only */}
        {!isUser && diagnosis && sev && (
          <div className="w-full rounded-xl border border-gray-700/50 bg-gray-900/80 overflow-hidden shadow-card animate-slide-down backdrop-blur-sm">
            {/* Severity bar */}
            <div className={`h-0.5 w-full ${sev.bar}`} style={{ boxShadow: `0 0 8px var(--tw-shadow-color)` }} />

            <div className="p-3 space-y-2.5 text-xs">
              {/* Stats row */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${sev.badge}`}>
                  {diagnosis.severity}
                </span>
                <span className="text-gray-500">
                  Risk: <span className="text-gray-200 font-medium">{diagnosis.failure_probability}</span>
                </span>
                <span className="text-gray-500">
                  Cost: <span className="text-gray-200 font-medium">{diagnosis.estimated_cost}</span>
                </span>
              </div>

              {/* Probable causes */}
              {causes && causes.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-medium">
                    {t('probableCauses')}
                  </p>
                  <ul className="space-y-1">
                    {causes.map((c, i) => (
                      <li key={i} className="text-gray-300 flex gap-2 leading-snug">
                        <span className="text-[#FFC200] mt-px">›</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action */}
              {action && (
                <div className="border-t border-gray-800 pt-2.5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-medium">
                    {t('recommendedAction')}
                  </p>
                  <p className="text-gray-200 leading-snug">{action}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
