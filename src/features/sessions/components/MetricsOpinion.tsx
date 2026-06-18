import { TrendingUp, Minus, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { LevelMetrics } from '../session.types'
import { formatNumber } from '../../../shared/utils/format'

type RecommendationValue =
  | 'increase_difficulty'
  | 'maintain_difficulty'
  | 'decrease_difficulty'

type Tone = 'positive' | 'neutral' | 'caution' | 'pending'

// SPS = 0.30·ORS + 0.30·ERS + 0.20·SCS + 0.10·(1−ER) + 0.10·RTA_score
//   RTA_score = clamp(1 − rta/8.0, 0, 1)   (lower reaction time → higher score)
const RTA_MAX_SECONDS = 8.0

// Clinical thresholds the SVM learned to imitate (generate_dataset.py).
const SPS_LOW = 0.4
const SPS_HIGH = 0.7

const ACTION: Record<
  RecommendationValue,
  { tone: Tone; verb: string; icon: LucideIcon }
> = {
  increase_difficulty: { tone: 'positive', verb: 'aumentar la dificultad', icon: TrendingUp },
  maintain_difficulty: { tone: 'neutral', verb: 'mantener la dificultad', icon: Minus },
  decrease_difficulty: { tone: 'caution', verb: 'reducir la dificultad', icon: TrendingDown },
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

// Base recommendation implied purely by the current SPS, before any history adjustment.
function baseFromSps(sps: number): RecommendationValue {
  if (sps < SPS_LOW) return 'decrease_difficulty'
  if (sps > SPS_HIGH) return 'increase_difficulty'
  return 'maintain_difficulty'
}

// Each metric normalised to 0..1 (its share of its own weight), labelled for the clinician.
function metricDrivers(level: LevelMetrics) {
  return [
    { label: 'reconocimiento de objetos (ORS)', score: clamp01(level.ors) },
    { label: 'reconocimiento de eventos (ERS)', score: clamp01(level.ers) },
    { label: 'comprensión semántica (SCS)', score: clamp01(level.scs) },
    { label: 'precisión en respuestas', score: clamp01(1 - level.er) },
    { label: 'velocidad de respuesta (RTA)', score: clamp01(1 - level.rta / RTA_MAX_SECONDS) },
  ]
}

type Opinion = { tone: Tone; icon: LucideIcon; text: string }

function buildOpinion(level: LevelMetrics): Opinion {
  const sps = level.sps
  const base = baseFromSps(sps)
  const rec: RecommendationValue | null =
    level.recommendation.status === 'resolved' ? level.recommendation.value : null

  const drivers = metricDrivers(level)
  const weakest = drivers.filter((d) => d.score < 0.5).sort((a, b) => a.score - b.score)
  const strongest = drivers.filter((d) => d.score >= 0.8)

  // Opening sentence: where the SPS lands the patient.
  const spsTxt = formatNumber(sps, 2)
  let where: string
  if (sps < SPS_LOW) where = `un SPS de ${spsTxt} (bajo, por debajo de ${SPS_LOW})`
  else if (sps > SPS_HIGH) where = `un SPS de ${spsTxt} (alto, por encima de ${SPS_HIGH})`
  else where = `un SPS de ${spsTxt} (en rango medio, entre ${SPS_LOW} y ${SPS_HIGH})`

  let text = `Con ${where}, el desempeño base sugiere ${ACTION[base].verb}.`

  // If the actual recommendation diverges from the SPS base, a history rule overrode it.
  if (rec && rec !== base) {
    if (rec === 'decrease_difficulty') {
      text += ` Sin embargo, se recomienda reducir: indica una caída significativa frente a sesiones previas (Δ SPS < -0.15).`
    } else if (rec === 'maintain_difficulty' && base === 'increase_difficulty') {
      text += ` Aun así, se opta por mantener: la tendencia reciente es a la baja, por lo que se frena la subida.`
    } else if (rec === 'increase_difficulty' && base === 'maintain_difficulty') {
      text += ` Además, se habilita el avance: hay mejora sostenida en las últimas sesiones.`
    } else {
      text += ` El ajuste final por historial es ${ACTION[rec].verb}.`
    }
  } else if (rec) {
    text += ` La recomendación se mantiene en ${ACTION[rec].verb}.`
  }

  // Metric-driven detail: what pulls the score up or down.
  if (weakest.length > 0) {
    const names = weakest.slice(0, 2).map((d) => d.label).join(' y ')
    text += ` Lo que más limita el puntaje es ${names}.`
  } else if (strongest.length >= 4) {
    text += ` Todas las áreas evaluadas se mantienen en niveles altos.`
  } else if (strongest.length > 0) {
    text += ` Destaca por ${strongest[0].label}.`
  }

  if (level.spsClass.status === 'resolved') {
    text += ` Clasificación: «${level.spsClass.value}».`
  }

  const action = rec ?? base
  const tone: Tone = rec ? ACTION[action].tone : 'pending'
  return { tone, icon: ACTION[action].icon, text }
}

type Props = {
  level: LevelMetrics
}

export function MetricsOpinion({ level }: Props) {
  const { tone, icon: Icon, text } = buildOpinion(level)

  return (
    <div className={`metrics-opinion metrics-opinion-${tone}`}>
      <div className="metrics-opinion-icon">
        <Icon size={16} />
      </div>
      <div>
        <div className="metrics-opinion-label">Lectura del modelo</div>
        <p className="metrics-opinion-text">{text}</p>
      </div>
    </div>
  )
}
