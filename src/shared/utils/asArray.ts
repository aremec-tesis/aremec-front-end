/**
 * Coerce an API response into an array.
 *
 * Backends are not always consistent: an endpoint may return a bare array
 * (`[...]`) or wrap it inside an object (`{ sessions: [...] }`, `{ data: [...] }`,
 * `{ items: [...] }`, `{ results: [...] }`). Calling `.map` directly on the
 * wrapped object throws `... .map is not a function`.
 *
 * This helper returns the array if it can find one (recovering wrapped data),
 * and otherwise falls back to an empty array so the UI can show a friendly
 * empty state instead of surfacing a runtime error.
 */
const ARRAY_WRAPPER_KEYS = ['data', 'items', 'results', 'sessions', 'records', 'list'] as const

export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of ARRAY_WRAPPER_KEYS) {
      if (Array.isArray(obj[key])) return obj[key] as T[]
    }
  }
  return []
}
