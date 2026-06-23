import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Neurologist = { id: string; name: string; email: string }
type Notification = { id: string; type: string; message: string; read: boolean }

type AuthSlice = {
  neurologist: Neurologist | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
}

type ActiveSessionSlice = {
  sessionId: string | null
  patientId: string | null
  startedAt: Date | null
  currentLevel: number | null
  wsStatus: 'connected' | 'reconnecting' | 'polling' | 'disconnected'
}

type NotificationsSlice = {
  pendingSessionComplete: boolean
  items: Notification[]
}

type AppStore = {
  auth: AuthSlice
  activeSession: ActiveSessionSlice
  notifications: NotificationsSlice
  setAuth: (patch: Partial<AuthSlice>) => void
  setActiveSession: (patch: Partial<ActiveSessionSlice>) => void
  setNotifications: (patch: Partial<NotificationsSlice>) => void
  resetActiveSession: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      auth: { neurologist: null, status: 'loading' },
      activeSession: {
        sessionId: null,
        patientId: null,
        startedAt: null,
        currentLevel: null,
        wsStatus: 'disconnected',
      },
      notifications: { pendingSessionComplete: false, items: [] },
      setAuth: (patch) => set((s) => ({ auth: { ...s.auth, ...patch } })),
      setActiveSession: (patch) =>
        set((s) => ({ activeSession: { ...s.activeSession, ...patch } })),
      setNotifications: (patch) =>
        set((s) => ({ notifications: { ...s.notifications, ...patch } })),
      resetActiveSession: () =>
        set((s) => ({
          activeSession: {
            sessionId: null,
            patientId: null,
            startedAt: null,
            currentLevel: null,
            wsStatus: 'disconnected',
          },
          notifications: { ...s.notifications, pendingSessionComplete: false },
        })),
    }),
    {
      // Survive a page reload while a session is open: the active session must
      // stay visible (sidebar "Sesión en Vivo", profile tab, monitor) until the
      // neurologist closes it (resetActiveSession). Only the identity of the
      // session is persisted; auth is re-verified via getMe() on every load and
      // notifications are ephemeral, so neither is written to storage.
      name: 'aremec-active-session',
      partialize: (s) => ({
        activeSession: {
          sessionId: s.activeSession.sessionId,
          patientId: s.activeSession.patientId,
          startedAt: s.activeSession.startedAt,
        },
      }),
      merge: (persisted, current) => {
        const saved = (persisted as { activeSession?: Partial<ActiveSessionSlice> } | undefined)
          ?.activeSession
        // startedAt round-trips through JSON as an ISO string — rehydrate it to a Date.
        const startedAt =
          typeof saved?.startedAt === 'string' ? new Date(saved.startedAt) : null
        return {
          ...current,
          activeSession: {
            ...current.activeSession,
            sessionId: saved?.sessionId ?? null,
            patientId: saved?.patientId ?? null,
            startedAt: startedAt && !isNaN(startedAt.getTime()) ? startedAt : null,
            // Live-only connection state always restarts cold after a reload;
            // useSessionWebSocket re-establishes it from the persisted sessionId.
            currentLevel: null,
            wsStatus: 'disconnected',
          },
        }
      },
    },
  ),
)
