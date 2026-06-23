// Single source of truth for the plain-language definitions surfaced via the
// `<InfoTip>` "?" affordance across the patient dashboard. Texts are authored to
// be clinically/technically correct but concise — review and adjust as needed.
export const GLOSSARY = {
  // ── Composite score & trend ──
  sps: 'SPS (Synthesized Performance Score): puntaje compuesto de 0 a 1 que sintetiza el desempeño global del paciente en la sesión, integrando memoria episódica y atención sostenida.',
  spsClass:
    'Clase del SPS: clasificación del puntaje en categorías (low / medium / high) según los rangos del modelo, para interpretar el nivel de desempeño de un vistazo.',
  trend:
    'Tendencia: dirección general del SPS a lo largo de las sesiones (positiva, estable o negativa), calculada por regresión lineal sobre el historial.',
  slope:
    'Pendiente: cuánto cambia el SPS por sesión según la regresión lineal. Positiva indica mejora sostenida; negativa, deterioro.',
  mean:
    'Promedio: valor medio del SPS sobre todas las sesiones con dato; sirve de referencia para leer cada punto frente a la media del paciente.',

  // ── KPIs ──
  sessionsCount:
    'Sesiones: total de sesiones registradas del paciente. "Completas" finalizaron todos los niveles; "incompletas" se interrumpieron antes.',
  lastSession:
    'Última sesión: fecha de la sesión más reciente y la recomendación de dificultad generada en ella.',

  // ── Recommendation ──
  recommendation:
    'Recomendación de dificultad: sugerencia del sistema sobre cómo ajustar la dificultad de la próxima sesión (aumentar, mantener o reducir) según el desempeño observado.',

  // ── Cognitive-domain metrics ──
  ors: 'ORS (Object Recognition Score): precisión al reconocer objetos presentados previamente. Dominio de memoria episódica.',
  ers: 'ERS (Event Recognition Score): precisión al reconocer eventos o escenas vistas antes. Dominio de memoria episódica.',
  scs: 'SCS (Semantic Comprehension Score): comprensión del significado y de las relaciones semánticas. Dominio de memoria episódica.',
  rta: 'RTA (Reaction Time Average): tiempo de reacción promedio ante los estímulos. Dominio de atención sostenida.',
  er: 'ER (Error Rate): proporción de respuestas incorrectas. Dominio de atención sostenida.',
  cognitiveDomains:
    'Dominios cognitivos: memoria episódica (ORS · ERS · SCS) y atención sostenida (RTA · ER). El radar compara la sesión seleccionada contra el promedio histórico; el radio es relativo al máximo por dominio.',
  episodic:
    'Memoria episódica: capacidad de recordar objetos, eventos y experiencias específicas. Se mide con ORS, ERS y SCS.',
  attention:
    'Atención sostenida: capacidad de mantener el foco atencional en el tiempo. Se mide con RTA y ER.',

  // ── Clinical baselines ──
  ravlt:
    'RAVLT (Rey Auditory Verbal Learning Test): prueba estandarizada de memoria verbal episódica. La "línea base" es el puntaje inicial del paciente, previo a la intervención, usado como referencia de comparación.',
  sart:
    'SART (Sustained Attention to Response Task): prueba de atención sostenida y control inhibitorio. La "línea base" es el puntaje inicial del paciente, usado como referencia de comparación.',
  diagnosis:
    'Diagnóstico: condición clínica del paciente. EA = Enfermedad de Alzheimer; MCI = Deterioro Cognitivo Leve (Mild Cognitive Impairment).',
} as const

export type GlossaryKey = keyof typeof GLOSSARY
