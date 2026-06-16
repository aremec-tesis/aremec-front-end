import { Inbox } from 'lucide-react'

type Props = {
  message: string
}

export function EmptyState({ message }: Props) {
  return (
    <div className="empty">
      <div className="empty-icon"><Inbox size={40} strokeWidth={1.5} /></div>
      <div className="empty-text">{message}</div>
    </div>
  )
}

export default EmptyState
