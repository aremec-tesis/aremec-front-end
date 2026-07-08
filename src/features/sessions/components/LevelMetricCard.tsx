import type { MLField } from '../session.types'
import type { MetricQuality } from '../metricInterpretation'
import { DomainTag } from './DomainTag'
import { MLFieldDisplay } from './MLFieldDisplay'
import { formatNumber } from '../../../shared/utils/format'

// Cognitive-domain tags hidden in the live transmission view.
const HIDDEN_DOMAINS = new Set(['Memoria episódica', 'Atención sostenida'])

type Props = {
  label: string
  value: number
  domain: string
  note: string
  quality: MetricQuality
  spsClass?: MLField<string>
}

export function LevelMetricCard({
  label,
  value,
  domain,
  note,
  quality,
  spsClass,
}: Props) {
  return (
    <div className={`metric-item metric-item-${quality}`}>
      <div className="metric-item-head">
        <span className="metric-val">{formatNumber(value, 2)}</span>
        <span className="metric-abbr">{label}</span>
      </div>
      <p className="metric-note">{note}</p>
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
