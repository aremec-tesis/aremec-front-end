import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { logout } from '../../../services/auth.service'
import { useAppStore } from '../../../store/app.store'

export function LogoutButton() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setAuth = useAppStore((s) => s.setAuth)
  const resetActiveSession = useAppStore((s) => s.resetActiveSession)
  const setNotifications = useAppStore((s) => s.setNotifications)

  const resetAndRedirect = () => {
    setAuth({ neurologist: null, status: 'unauthenticated' })
    resetActiveSession()
    setNotifications({ pendingSessionComplete: false, items: [] })
    queryClient.cancelQueries()
    queryClient.clear()
    navigate('/login')
  }

  const { mutate, isPending } = useMutation({
    mutationFn: logout,
    onSuccess: resetAndRedirect,
    onError: resetAndRedirect,
  })

  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={() => mutate()}
      disabled={isPending}
    >
      <LogOut size={15} />
      {isPending ? 'Cerrando...' : 'Cerrar sesión'}
    </button>
  )
}
