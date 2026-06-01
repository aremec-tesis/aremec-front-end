import { usePatientDashboard } from '../hooks/usePatientDashboard'
import { formatDate } from '../../../shared/utils/format'

type Props = {
  patientId: string
  selectedSessionId: string | null
  onSelect: (sessionId: string | null) => void
}

export function SessionFilter({ patientId, selectedSessionId, onSelect }: Props) {
  const { data, isPending } = usePatientDashboard(patientId)

  if (isPending || !data || data.sessions.length === 0) return null

  return (
    <div className="card">
      <div className="card-label" style={{ marginBottom: 8 }}>FILTRAR POR SESIÓN</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className={`btn btn-sm ${selectedSessionId === null ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onSelect(null)}
        >
          Ver todo
        </button>
        {data.sessions.map(s => (
          <button
            key={s.sessionId}
            className={`btn btn-sm ${selectedSessionId === s.sessionId ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onSelect(s.sessionId)}
          >
            {formatDate(s.sessionDate, { dateStyle: 'short' })}
          </button>
        ))}
      </div>
    </div>
  )
}

export default SessionFilter
