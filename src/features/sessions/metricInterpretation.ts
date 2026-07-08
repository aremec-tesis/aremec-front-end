// Value-conditional, plain-language read of each metric for the neurologist.
// Bands mirror SPS_LOW/SPS_HIGH — the clinical thresholds the SVM learned to
// imitate (see MetricsOpinion.tsx) — applied to each metric's own 0..1 score.
const LOW = 0.4
const HIGH = 0.7
const RTA_MAX_SECONDS = 8.0

export type MetricKey = 'ors' | 'ers' | 'scs' | 'rta' | 'er' | 'sps'
export type MetricQuality = 'low' | 'medium' | 'high'

const MESSAGES: Record<MetricKey, Record<MetricQuality, string>> = {
  ors: {
    low: 'Desempeño bajo en reconocimiento de objetos: el paciente identifica con dificultad los objetos vistos previamente. Campo por mejorar.',
    medium: 'Desempeño medio en reconocimiento de objetos: el paciente identifica correctamente parte de los objetos vistos previamente.',
    high: 'Desempeño alto en reconocimiento de objetos: el paciente identifica con buena precisión los objetos vistos previamente.',
  },
  ers: {
    low: 'Desempeño bajo en reconocimiento de eventos: el paciente tiene dificultad para recordar escenas o situaciones ya vividas en la sesión. Campo por mejorar.',
    medium: 'Desempeño medio en reconocimiento de eventos: el paciente recuerda parcialmente las escenas o situaciones ya vividas.',
    high: 'Desempeño alto en reconocimiento de eventos: el paciente recuerda con buena precisión las escenas y situaciones ya vividas.',
  },
  scs: {
    low: 'Comprensión semántica baja: el paciente muestra dificultad para relacionar significados y conceptos presentados. Campo por mejorar.',
    medium: 'Comprensión semántica media: el paciente relaciona correctamente parte de los significados y conceptos presentados.',
    high: 'Comprensión semántica alta: el paciente relaciona con buena precisión los significados y conceptos presentados.',
  },
  rta: {
    low: 'Tiempo de reacción lento: el paciente tarda más de lo esperado en responder a los estímulos. Campo por mejorar.',
    medium: 'Tiempo de reacción moderado: la velocidad de respuesta del paciente es aceptable, con margen de mejora.',
    high: 'Tiempo de reacción rápido: el paciente responde a los estímulos con buena velocidad.',
  },
  er: {
    low: 'Tasa de error alta: el paciente comete errores frecuentes en sus respuestas. Campo por mejorar.',
    medium: 'Tasa de error moderada: el paciente comete algunos errores en sus respuestas.',
    high: 'Tasa de error baja: el paciente responde con alta precisión y pocos errores.',
  },
  sps: {
    low: 'Desempeño global bajo en esta sesión: conviene prestar atención a este nivel; el modelo sugiere considerar reducir la dificultad.',
    medium: 'Desempeño global medio en esta sesión: el paciente se mantiene dentro del rango esperado.',
    high: 'Desempeño global alto en esta sesión: el paciente muestra un buen desempeño integral en memoria y atención.',
  },
}

function qualityOf(score: number): MetricQuality {
  if (score < LOW) return 'low'
  if (score > HIGH) return 'high'
  return 'medium'
}

// Raw metric value → normalised 0..1 score, higher always meaning "better
// performance" — matching the weights in the SPS formula (rta and er are
// inverted there too: 0.10·(1−ER) and 0.10·RTA_score).
function scoreOf(key: MetricKey, value: number): number {
  if (key === 'rta') return Math.min(1, Math.max(0, 1 - value / RTA_MAX_SECONDS))
  if (key === 'er') return Math.min(1, Math.max(0, 1 - value))
  return Math.min(1, Math.max(0, value))
}

export function getMetricReading(key: MetricKey, value: number): { quality: MetricQuality; note: string } {
  const quality = qualityOf(scoreOf(key, value))
  return { quality, note: MESSAGES[key][quality] }
}
