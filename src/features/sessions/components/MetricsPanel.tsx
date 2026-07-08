import { useState } from 'react'
import { useSessionMetrics } from '../hooks/useSession'
import { LevelMetricCard } from './LevelMetricCard'
import { MetricsOpinion } from './MetricsOpinion'
import { RecommendationDisplay } from './RecommendationDisplay'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { ErrorMessage } from '../../../shared/components/ErrorMessage'
import { EmptyState } from '../../../shared/components/EmptyState'
import { getMetricReading } from '../metricInterpretation'

const METRIC_DOMAINS: Record<string, string> = {
  ors: 'Memoria episódica',
  ers: 'Memoria episódica',
  scs: 'Memoria episódica',
  rta: 'Atención sostenida',
  er: 'Atención sostenida',
  sps: 'Composite',
}

const METRIC_LABELS: Record<string, string> = {
  ors: 'ORS',
  ers: 'ERS',
  scs: 'SCS',
  rta: 'RTA',
  er: 'ER',
  sps: 'SPS',
}

// Real-time backstop: while the live monitor is open, refetch metrics on this
// cadence so new levels appear even if the WebSocket connects but never pushes a
// `level_completed` frame. The WS remains the primary, instant update path.
const METRICS_BACKSTOP_INTERVAL_MS = 3000

type Props = {
  sessionId: string
}

export function MetricsPanel({ sessionId }: Props) {
  const { data, isPending, isError, error } = useSessionMetrics(sessionId, {
    refetchInterval: METRICS_BACKSTOP_INTERVAL_MS,
  })
  // Which level to display. Keyed by position, not the `level` field itself —
  // that field has been coming back empty from the API, which silently broke
  // the toggle when it compared by value instead.
  const [showFirstLevel, setShowFirstLevel] = useState(false)

  if (isPending) return <LoadingSpinner />
  if (isError) return <ErrorMessage error={error} />

  const levels = data?.levels ?? []

  if (levels.length === 0) {
    return (
      <div className="metrics-panel">
        <div className="section-header">
          <div className="section-title">Métricas en tiempo real</div>
        </div>
        <EmptyState message="Esperando primer nivel completado…" />
      </div>
    )
  }

  // `.sort` falls back to array order (already chronological) if `.level` is
  // empty on every entry, so first/last by position stay correct either way.
  const sortedLevels = [...levels].sort((a, b) => a.level - b.level)
  const firstLevel = sortedLevels[0]
  const lastLevel = sortedLevels[sortedLevels.length - 1]
  const hasMultipleLevels = sortedLevels.length > 1

  const isLastLevel = !showFirstLevel || !hasMultipleLevels
  const level = isLastLevel ? lastLevel : firstLevel

  const spsReading = getMetricReading('sps', level.sps)

  return (
    <div className="metrics-panel">
      <div className="section-header">
        <div>
          <div className="section-title">
            {isLastLevel ? 'Métricas del último nivel jugado' : 'Métricas del primer nivel jugado'}
          </div>
          <div className="section-sub">
            Viendo nivel {isLastLevel ? sortedLevels.length : 1} de {sortedLevels.length}
          </div>
        </div>
        <div className="metrics-recommendation">
          <span
            className="card-label"
            style={{ display: 'block', marginBottom: 4 }}
          >
            Recomendación
          </span>
          <RecommendationDisplay recommendation={level.recommendation} />
        </div>
      </div>

      {hasMultipleLevels && (
        <div className="level-toggle" role="tablist" aria-label="Seleccionar nivel">
          <button
            type="button"
            role="tab"
            aria-selected={!isLastLevel}
            className={`level-toggle-btn${!isLastLevel ? ' active' : ''}`}
            onClick={() => setShowFirstLevel(true)}
          >
            Nivel Anterior
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isLastLevel}
            className={`level-toggle-btn${isLastLevel ? ' active' : ''}`}
            onClick={() => setShowFirstLevel(false)}
          >
            Último Nivel
          </button>
        </div>
      )}

      <div className="metrics-live">
        {(['ors', 'ers', 'scs', 'rta', 'er'] as const).map((key) => {
          const { quality, note } = getMetricReading(key, level[key])
          return (
            <LevelMetricCard
              key={key}
              label={METRIC_LABELS[key]}
              value={level[key]}
              domain={METRIC_DOMAINS[key]}
              note={note}
              quality={quality}
            />
          )
        })}
        <LevelMetricCard
          label={METRIC_LABELS.sps}
          value={level.sps}
          domain={METRIC_DOMAINS.sps}
          note={spsReading.note}
          quality={spsReading.quality}
          spsClass={level.spsClass}
        />
      </div>

      <MetricsOpinion level={level} />
    </div>
  )
}
