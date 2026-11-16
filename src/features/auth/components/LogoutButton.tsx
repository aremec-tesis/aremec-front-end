import { useMutation } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useEndSession } from '../hooks/useEndSession'

export function LogoutButton() {
  const endSession = useEndSession()

  const { mutate, isPending } = useMutation({
    mutationFn: () => endSession(),
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
