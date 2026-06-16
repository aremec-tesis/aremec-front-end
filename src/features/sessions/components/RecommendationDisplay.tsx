import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MLField } from '../session.types'
import { MLFieldDisplay } from './MLFieldDisplay'

type RecommendationValue =
  | 'increase_difficulty'
  | 'maintain_difficulty'
  | 'decrease_difficulty'

const RECOMMENDATION_LABEL: Record<RecommendationValue, string> = {
  increase_difficulty: 'Aumentar dificultad',
  maintain_difficulty: 'Mantener dificultad',
  decrease_difficulty: 'Reducir dificultad',
}

const RECOMMENDATION_ICON: Record<RecommendationValue, LucideIcon> = {
  increase_difficulty: ArrowUp,
  maintain_difficulty: Minus,
  decrease_difficulty: ArrowDown,
}

const RECOMMENDATION_BADGE: Record<RecommendationValue, string> = {
  increase_difficulty: 'badge-green',
  maintain_difficulty: 'badge-blue',
  decrease_difficulty: 'badge-warn',
}

type Props = {
  recommendation: MLField<RecommendationValue>
}

export function RecommendationDisplay({ recommendation }: Props) {
  return (
    <MLFieldDisplay
      field={recommendation}
      render={(value) => {
        const Icon = RECOMMENDATION_ICON[value]
        return (
          <span
            className={`badge recommendation-badge ${RECOMMENDATION_BADGE[value] ?? 'badge-gray'}`}
          >
            {Icon && <Icon size={13} />}
            {RECOMMENDATION_LABEL[value] ?? value}
          </span>
        )
      }}
    />
  )
}
