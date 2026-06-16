import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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
      <button
        onClick={() => navigate(backPath)}
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 16 }}
      >
        <ArrowLeft size={15} /> Volver
      </button>
      <MetricDetailTable sessionId={id} />
    </div>
  )
}
