// Messages shown on /login when the app arrives there with a reason.
//
// `?error=<code>` is set by the backend's /auth/callback when the Auth0 login
// fails (codes defined in web_service dev/iam/interfaces/rest/auth/handler.go —
// keep both lists in sync). `?reason=<code>` is set by the frontend itself.

export type LoginNotice = {
  tone: 'danger' | 'warn'
  title: string
  message: string
}

const LOGIN_ERROR_MESSAGES: Record<string, LoginNotice> = {
  not_neurologist: {
    tone: 'danger',
    title: 'Acceso no autorizado',
    message:
      'Tu cuenta no tiene el rol de neurólogo. Solicita al administrador que te asigne el rol para acceder al portal.',
  },
  access_denied: {
    tone: 'danger',
    title: 'Acceso denegado',
    message: 'El proveedor de identidad rechazó el inicio de sesión. Contacta al administrador.',
  },
  unauthorized: {
    tone: 'danger',
    title: 'No se pudo iniciar sesión',
    message: 'La autorización no es válida o expiró. Inténtalo nuevamente.',
  },
  invalid_state: {
    tone: 'warn',
    title: 'La solicitud de inicio de sesión expiró',
    message: 'Por seguridad debes volver a iniciar sesión.',
  },
  invalid_request: {
    tone: 'warn',
    title: 'Solicitud incompleta',
    message: 'No se recibió la respuesta del proveedor de identidad. Inténtalo nuevamente.',
  },
  server_error: {
    tone: 'danger',
    title: 'Error del servidor',
    message: 'Ocurrió un problema al iniciar sesión. Inténtalo nuevamente en unos minutos.',
  },
}

const GENERIC_LOGIN_ERROR: LoginNotice = {
  tone: 'danger',
  title: 'No se pudo iniciar sesión',
  message: 'Ocurrió un error inesperado. Inténtalo nuevamente.',
}

export const LOGOUT_REASON_IDLE = 'idle'

const LOGOUT_REASON_MESSAGES: Record<string, LoginNotice> = {
  [LOGOUT_REASON_IDLE]: {
    tone: 'warn',
    title: 'Sesión cerrada por inactividad',
    message: 'Tu sesión se cerró tras 15 minutos sin actividad. Vuelve a iniciar sesión para continuar.',
  },
}

export function resolveLoginNotice(params: URLSearchParams): LoginNotice | null {
  const error = params.get('error')
  if (error) return LOGIN_ERROR_MESSAGES[error] ?? GENERIC_LOGIN_ERROR
  const reason = params.get('reason')
  if (reason) return LOGOUT_REASON_MESSAGES[reason] ?? null
  return null
}
