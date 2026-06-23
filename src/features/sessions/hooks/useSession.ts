import { useQuery } from '@tanstack/react-query'
import { getSessionMetrics } from '../../../services/metrics.service'

type UseSessionMetricsOptions = {
  /**
   * Poll the metrics endpoint on this interval (ms) as a real-time backstop for
   * the live monitor: the WebSocket stays the primary, instant path, but if it
   * connects without ever delivering a `level_completed` frame the panel would
   * otherwise freeze until a manual reload. Off by default so historical views
   * (e.g. SessionDetailModal) never poll.
   */
  refetchInterval?: number
}

export function useSessionMetrics(
  sessionId: string,
  options: UseSessionMetricsOptions = {},
) {
  return useQuery({
    queryKey: ['session', sessionId, 'metrics'],
    queryFn: () => getSessionMetrics(sessionId),
    enabled: !!sessionId,
    refetchInterval: options.refetchInterval ?? false,
  })
}
