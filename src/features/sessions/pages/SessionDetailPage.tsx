import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ErrorMessage } from '../../../shared/components/ErrorMessage'
import { MetricDetailTable } from '../../analytics/components/MetricDetailTable'

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  if (!id) return <ErrorMessage error={new Error('Ruta inválida: falta el ID de sesión')} />

  const statePatientId = (location.state as { patientId?: string } | null)?.patientId
  const backPath = statePatientId ? `/patients/${statePatientId}` : '/patients'

  return (
    <div className="page">
      <div className="section-header">
        <button
          onClick={() => navigate(backPath)}
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: 12 }}
        >
          ← Volver
        </button>
        <h1 className="page-title">Detalle de sesión</h1>
      </div>
      <MetricDetailTable sessionId={id} />
    </div>
  )
}
