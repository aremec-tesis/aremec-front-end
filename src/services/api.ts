import { ApiError } from '../shared/types/shared.types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError(0, 'CONFIG_ERROR', 'VITE_API_BASE_URL is not configured')
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch (e) {
    throw new ApiError(0, 'NETWORK_ERROR', e instanceof Error ? e.message : 'Network error')
  }

  if (res.status === 401) {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired or absent')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(
      res.status,
      body.code ?? 'UNKNOWN',
      body.message ?? res.statusText
    )
  }

  if (res.status === 204) return undefined as T
  const ct = res.headers.get('content-type')
  if (ct?.includes('application/json')) return res.json() as Promise<T>
  const text = await res.text().catch(() => '')
  if (text.trim() === '') return undefined as T
  throw new ApiError(
    res.status,
    'NON_JSON_RESPONSE',
    `Expected JSON, received '${ct ?? 'unknown content-type'}'`
  )
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}
