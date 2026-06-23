import { useId, useState } from 'react'
import type { MLField } from '../session.types'
import { DomainTag } from './DomainTag'
import { MLFieldDisplay } from './MLFieldDisplay'
import { formatNumber } from '../../../shared/utils/format'

// Cognitive-domain tags hidden in the live transmission view.
const HIDDEN_DOMAINS = new Set(['Memoria episódica', 'Atención sostenida'])

type Props = {
  label: string
  value: number
  domain: string
  description?: string
  spsClass?: MLField<string>
}

export function LevelMetricCard({
  label,
  value,
  domain,
  description,
  spsClass,
}: Props) {
  const tooltipId = useId()
  // Click/tap latches the tooltip open (touch + keyboard); CSS handles hover.
  const [pinned, setPinned] = useState(false)

  return (
    <div className="metric-item">
      {description && (
        <button
          type="button"
          className="metric-help"
          aria-label={`¿Qué significa ${label}?`}
          aria-expanded={pinned}
          aria-describedby={tooltipId}
          onClick={() => setPinned((p) => !p)}
          onBlur={() => setPinned(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setPinned(false)
          }}
        >
          <span aria-hidden="true">?</span>
          <span className="metric-tooltip" id={tooltipId} role="tooltip">
            {description}
          </span>
        </button>
      )}
      <div className="metric-val">{formatNumber(value, 2)}</div>
      <div className="metric-abbr">{label}</div>
      {!HIDDEN_DOMAINS.has(domain) && (
        <div className="metric-domain">
          <DomainTag domain={domain} />
        </div>
      )}
      {spsClass !== undefined && (
        <div className="metric-sps-class">
          <span className="card-label">Clasificación</span>
          <MLFieldDisplay
            field={spsClass}
            render={(v) => <span className="badge badge-blue">{v}</span>}
          />
        </div>
      )}
    </div>
  )
}
