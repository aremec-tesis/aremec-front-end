import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { logout } from '../../../services/auth.service'
import { useAppStore } from '../../../store/app.store'
import { clearTrustedSession } from '../sessionGuard'

/**
 * Ends the neurologist's session: asks the backend to expire the HttpOnly
 * session cookie (the browser cannot delete it from JS), wipes client state
 * and redirects to /login. Local cleanup happens even if the logout call fails.
 */
export function useEndSession() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useCallback(
    async (options?: { reason?: string }) => {
      try {
        await logout()
      } catch {
        // Cookie may already be expired/absent — proceed with local teardown.
      }

      clearTrustedSession()
      const { setAuth, resetActiveSession, setNotifications } = useAppStore.getState()
      setAuth({ neurologist: null, status: 'unauthenticated' })
      resetActiveSession()
      setNotifications({ pendingSessionComplete: false, items: [] })
      await queryClient.cancelQueries()
      queryClient.clear()

      const query = options?.reason ? `?reason=${encodeURIComponent(options.reason)}` : ''
      navigate(`/login${query}`, { replace: true })
    },
    [navigate, queryClient],
  )
}
