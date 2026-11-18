import { createBrowserRouter, redirect, Navigate } from 'react-router-dom'
import { useAppStore } from '../store/app.store'
import { getMe, logout } from '../services/auth.service'
import { claimTrustedSession, clearTrustedSession } from '../features/auth/sessionGuard'
import AppShell from '../shared/components/AppShell'
import LoginPage from '../features/auth/pages/LoginPage'
import PatientRegistrationPage from '../features/patients/pages/PatientRegistrationPage'
import PatientListPage from '../features/patients/pages/PatientListPage'
import PatientProfilePage from '../features/patients/pages/PatientProfilePage'
import SessionMonitorPage from '../features/sessions/pages/SessionMonitorPage'
import SessionDetailPage from '../features/sessions/pages/SessionDetailPage'
import SessionHistoryPage from '../features/sessions/pages/SessionHistoryPage'

let authCheckInFlight: Promise<Response | null> | null = null

// A backend session cookie that this browser did not just obtain through an
// explicit login (or that sat idle too long) is discarded instead of reused.
async function discardUntrustedSession() {
  try {
    await logout()
  } catch {
    // No cookie or already expired — nothing to discard server-side.
  }
  clearTrustedSession()
  useAppStore.getState().setAuth({ neurologist: null, status: 'unauthenticated' })
}

async function redirectIfAuthenticated() {
  const { auth } = useAppStore.getState()
  if (auth.status === 'authenticated') return redirect('/patients')
  if (auth.status === 'unauthenticated') return null

  if (!claimTrustedSession()) {
    await discardUntrustedSession()
    return null
  }

  try {
    const neurologist = await getMe()
    useAppStore.getState().setAuth({ neurologist, status: 'authenticated' })
    return redirect('/patients')
  } catch {
    clearTrustedSession()
    useAppStore.getState().setAuth({ neurologist: null, status: 'unauthenticated' })
    return null
  }
}

async function requireAuth() {
  const { auth } = useAppStore.getState()

  if (auth.status === 'authenticated') return null
  if (auth.status === 'unauthenticated') return redirect('/login')

  if (!authCheckInFlight) {
    authCheckInFlight = (async () => {
      if (!claimTrustedSession()) {
        await discardUntrustedSession()
        throw new Error('untrusted session')
      }
      return getMe()
    })()
      .then((neurologist) => {
        useAppStore.getState().setAuth({ neurologist, status: 'authenticated' })
        return null
      })
      .catch(() => {
        clearTrustedSession()
        useAppStore.getState().setAuth({ neurologist: null, status: 'unauthenticated' })
        return redirect('/login')
      })
      .finally(() => { authCheckInFlight = null })
  }
  return authCheckInFlight
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    loader: redirectIfAuthenticated,
  },
  {
    path: '/',
    element: <AppShell />,
    loader: requireAuth,
    children: [
      { index: true, element: <Navigate to="/patients" replace /> },
      { path: 'patients', element: <PatientListPage /> },
      { path: 'patients/new', element: <PatientRegistrationPage /> },
      { path: 'patients/:id', element: <PatientProfilePage /> },
      { path: 'patients/:id/session', element: <SessionMonitorPage /> },
      { path: 'sessions/history', element: <SessionHistoryPage /> },
      { path: 'sessions/:id', element: <SessionDetailPage /> },
    ],
  },
])

export default router
