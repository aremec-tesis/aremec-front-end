import { useSearchParams } from 'react-router-dom'
import { AlertCircle, Clock } from 'lucide-react'
import { resolveLoginNotice } from '../loginMessages'

export default function LoginPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined
  const [searchParams] = useSearchParams()
  const notice = resolveLoginNotice(searchParams)

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card" style={{ textAlign: 'center' }}>
        <img
          src="/aremec-logo-stacked.svg"
          alt="Aremec · Recordar, sentir, vivir"
          className="login-logo-full"
        />
        <div className="login-sub">Portal clínico</div>
        <div className="login-form">
          {notice && (
            <div
              className={`alert alert-${notice.tone} login-alert`}
              role={notice.tone === 'danger' ? 'alert' : 'status'}
            >
              {notice.tone === 'danger' ? <AlertCircle size={16} /> : <Clock size={16} />}
              <div>
                <div className="login-alert-title">{notice.title}</div>
                <div>{notice.message}</div>
              </div>
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={!apiBase}
            onClick={() => {
              window.location.href = `${apiBase}/auth/login`
            }}
          >
            {notice ? 'Volver a iniciar sesión' : 'Iniciar sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}
