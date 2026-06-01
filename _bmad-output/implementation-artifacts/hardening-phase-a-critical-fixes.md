---
baseline_commit: 6a32fea776fdf42a2467b896175f6a9a0d5760c4
---

# Hardening Phase A: Critical Fixes

Status: done

## Story

As a neurologist using the clinical portal,
I want all critical bugs fixed before any new features are added,
so that the portal behaves correctly in error states, session close flows, and direct URL navigation.

## Prerequisites from Last Retro (Epic 4 — MUST complete as first tasks)

These are H1–H5 from the Epic 4 retrospective (2026-05-31). They are the reason this story exists.

| ID | Issue | File | Status |
|----|-------|------|--------|
| H1 | `api.get` 401 returns `undefined as never` — TanStack Query treats 401 as success | `src/services/api.ts:25` | **🔴 Fix in this story** |
| H2 | `resetActiveSession` doesn't reset `pendingSessionComplete` — toast re-appears after session close | `src/store/app.store.ts:49-58` | **🔴 Fix in this story** |
| H3 | `navigate(-1)` in SessionDetailPage exits app on direct URL; SessionHistory doesn't pass patientId | `src/features/sessions/pages/SessionDetailPage.tsx`, `src/features/analytics/components/SessionHistory.tsx` | **🔴 Fix in this story** |
| H4 | Triage `deferred-work.md`: classify all 35+ items by 🔴/🟡/🟢/❌ | `_bmad-output/implementation-artifacts/deferred-work.md` | **🔴 Do in this story** |
| H5 | Establish carry-forward pattern: "Prerequisites from Last Retro" section is now standard in Dev Notes | All future story files | **🟡 Established by this story's existence** |

---

## Acceptance Criteria

1. **H1 — 401 throws ApiError** — Given any protected API call returns 401, when `api.request` processes the response, then `throw new ApiError(401, 'UNAUTHORIZED', ...)` is executed instead of `return undefined as never`, so TanStack Query sets `isError: true` and shows `<ErrorMessage>` during auth redirect instead of rendering `undefined` as data.

2. **H2 — resetActiveSession clears toast** — Given the neurologist closes a session via `SessionCloseButton`, when `resetActiveSession()` is called, then `notifications.pendingSessionComplete` is reset to `false`, so `SessionCompletionToast` does not re-appear on the next page navigation.

3. **H3a — SessionHistory passes patientId in router state** — Given the neurologist clicks a session row in `SessionHistory`, when `navigate(\`/sessions/${sessionId}\`)` is called, then `{ state: { patientId } }` is included in the navigate call.

4. **H3b — SessionDetailPage uses patient-aware back navigation** — Given the neurologist arrives at `/sessions/:id` from `SessionHistory`, when they click "← Volver", then they navigate to `/patients/${patientId}`. Given the neurologist arrives at `/sessions/:id` via direct URL (no router state), when they click "← Volver", then they navigate to `/patients` (not exit the app).

5. **H4 — deferred-work.md triaged** — Given all 35+ deferred items in `deferred-work.md`, when the triage is complete, then each item has a priority symbol (🔴/🟡/🟢/❌) and either a story assignment or won't-fix rationale appended inline.

6. **Build stays green** — `npm run build` passes with 0 TypeScript errors after all changes.

---

## Tasks / Subtasks

- [x] **H1: Fix `api.get` 401 — throw ApiError** (AC: #1)
  - [x] Open `src/services/api.ts`
  - [x] In the `if (res.status === 401)` block (lines 21–26), replace `return undefined as never` with `throw new ApiError(401, 'UNAUTHORIZED', 'Session expired or absent')`
  - [x] Keep the `window.location.href = '/login'` redirect — it still runs before the throw
  - [x] `ApiError` is already imported at line 1 — do NOT add a new import

- [x] **H2: Fix `resetActiveSession` — clear pendingSessionComplete** (AC: #2)
  - [x] Open `src/store/app.store.ts`
  - [x] In `resetActiveSession` (lines 49–58), add `notifications` to the set call:
    ```ts
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
    ```
  - [x] The spread `...s.notifications` preserves the `items` array — do NOT reset `items`
  - [x] Change the arrow function parameter from `() =>` to `(s) =>` to access current state

- [x] **H3: Fix SessionHistory + SessionDetailPage back navigation** (AC: #3, #4)
  - [x] **Part A — SessionHistory.tsx**: Open `src/features/analytics/components/SessionHistory.tsx`
    - [x] Add `patientId: string` to `Props` type (already has `patientId` prop — it's passed in from `PatientProfilePage`)
    - [x] Update the `navigate` call in the row click handler:
      ```tsx
      onClick={() => navigate(`/sessions/${s.sessionId}`, { state: { patientId } })}
      ```
    - [x] No import changes needed — `useNavigate` is already imported
  - [x] **Part B — SessionDetailPage.tsx**: Open `src/features/sessions/pages/SessionDetailPage.tsx`
    - [x] Add `useLocation` to the import: `import { useParams, useNavigate, useLocation } from 'react-router-dom'`
    - [x] After the `useNavigate()` call, add: `const location = useLocation()`
    - [x] Derive back path: `const backPath = (location.state as { patientId?: string } | null)?.patientId ? \`/patients/${(location.state as { patientId: string }).patientId}\` : '/patients'`
    - [x] Replace the button onClick: `onClick={() => navigate(backPath)}`
    - [x] Remove the `window.history.state?.idx` check — it's no longer needed

- [x] **H4: Triage deferred-work.md** (AC: #5)
  - [x] Open `_bmad-output/implementation-artifacts/deferred-work.md`
  - [x] For each deferred item, append a priority suffix using this classification:
    - 🔴 = Production blocker or data corruption risk — needs a story assigned now
    - 🟡 = Real bug but low frequency / impact — schedule in next hardening sprint
    - 🟢 = Polish / tech debt — schedule when time permits
    - ❌ = Won't fix (by design, pre-existing architectural pattern, or spec)
  - [x] See "H4 Triage Guide" section below for recommended classifications
  - [x] Append a triage summary section at the bottom of `deferred-work.md`

- [x] **Verify build** (AC: #6)
  - [x] Run `npm run build`
  - [x] Confirm 0 TypeScript errors

### Review Findings

- [x] [Review][Defer] `api.ts` 401 redirect + throw race — React Query briefly sets `isError` while browser navigates away; retries hit 401 again; browser wins before retries complete [src/services/api.ts:24-27] — deferred, pre-existing redirect+throw pattern, practical impact nil
- [x] [Review][Defer] `resetActiveSession` preserves `notifications.items` unboundedly — items array and other flags survive session reset by spec-required spread [src/store/app.store.ts:54] — deferred, by spec design (spread intentional); clear items on logout if ever needed
- [x] [Review][Defer] `SessionHistory` threads prop `patientId` into router state — not session's own patient field; silently wrong if sessions ever span multiple patients in one list [src/features/analytics/components/SessionHistory.tsx:31] — deferred, single-patient assumption holds in current data model
- [x] [Review][Defer] `MetricDetailTable` `?.` silently shows EmptyState on `data.levels === undefined` — old explicit check would throw, surfacing API shape mismatch; new guard swallows it [src/features/analytics/components/MetricDetailTable.tsx:33] — deferred, intentional crash-prevention tradeoff per spec; add console.warn in future pass

---

## Dev Notes

### Critical Constraints — Read Before Writing Any Code

**`erasableSyntaxOnly: true` in `tsconfig.app.json`.** No constructor parameter properties. (Mandatory carry-forward.)

**`ApiError` is already imported in `api.ts` at line 1.** Do NOT add a new import line.

**`resetActiveSession` currently uses `() =>` (no state access).** You MUST change it to `(s) =>` to spread `s.notifications`. Without the `(s) =>` form, TypeScript will error when you reference `s.notifications`.

**`SessionHistory` already receives `patientId` as a prop** (it calls `useSessionHistory(patientId)` at line 196 of the current implementation). You only need to thread that same `patientId` into the navigate call. No new prop is needed.

**No test files** — project has no test infrastructure (MVP, single developer). Do not create test files.

---

### H1 — Current State of api.ts (lines 21–26)

```ts
// CURRENT (broken):
if (res.status === 401) {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    return undefined as never    // ← BUG: TanStack Query treats as success, data = undefined
}

// FIXED:
if (res.status === 401) {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired or absent')  // ← TanStack Query sets isError: true
}
```

**Why this matters:** When a protected API call (e.g., `GET /patients/:id`) returns 401, TanStack Query currently receives `undefined` as the resolved data. Components like `PatientProfilePage` then try to render `undefined.name`, crash, and show `<ErrorMessage error={null}>` — the user sees a confusing error instead of being cleanly redirected to login.

---

### H2 — Current State of resetActiveSession (lines 49–58)

```ts
// CURRENT (broken):
resetActiveSession: () =>
  set(() => ({
    activeSession: { sessionId: null, patientId: null, startedAt: null, currentLevel: null, wsStatus: 'disconnected' },
    // notifications NOT reset → pendingSessionComplete stays true
  })),

// FIXED:
resetActiveSession: () =>
  set((s) => ({
    activeSession: { sessionId: null, patientId: null, startedAt: null, currentLevel: null, wsStatus: 'disconnected' },
    notifications: { ...s.notifications, pendingSessionComplete: false },
  })),
```

**Why this matters:** After session close, `AppShell.tsx` renders `<SessionCompletionToast>` when `pendingSessionComplete` is `true`. Without the reset, navigating after session close causes the toast to re-appear on every page — the "session complete" notification persists indefinitely. Confirmed in deferred-work.md: "after a normal session close via `SessionCloseButton`, `pendingSessionComplete` remains `true` in the store" [src/store/app.store.ts].

---

### H3 — Current State of Files Being Modified

**`SessionHistory.tsx` (current navigate call, ~line 52):**
```tsx
// CURRENT (no patientId in state):
onClick={() => navigate(`/sessions/${s.sessionId}`)}

// FIXED:
onClick={() => navigate(`/sessions/${s.sessionId}`, { state: { patientId } })}
```

**`SessionDetailPage.tsx` (current back button, lines 14–16):**
```tsx
// CURRENT (browser-specific window.history.state check):
onClick={() => window.history.state?.idx > 0 ? navigate(-1) : navigate('/patients')}

// FIXED (router-state-aware, clean fallback):
// Add to imports: useLocation
// Add after useNavigate(): const location = useLocation()
// Derive: const backPath = (location.state as { patientId?: string } | null)?.patientId
//           ? `/patients/${(location.state as { patientId: string }).patientId}`
//           : '/patients'
onClick={() => navigate(backPath)}
```

**Why this is better:** The `window.history.state?.idx` check is browser-specific implementation detail. Router state is the React Router-idiomatic way to pass contextual data between routes. The fallback to `/patients` handles all entry points that don't pass a patientId (bookmarks, external links, future callers).

---

### H4 Triage Guide

Use this guide when classifying deferred-work.md items. Apply the prefix inline after each item's description.

**Recommended classifications (for the most impactful items):**

| Item | Recommended | Rationale |
|------|-------------|-----------|
| `api.get` 401 returns `undefined as never` | ❌ Fixed in this story | H1 resolves it |
| `pendingSessionComplete` not reset by `resetActiveSession` | ❌ Fixed in this story | H2 resolves it |
| `navigate(-1)` exits app | ❌ Fixed in this story | H3 resolves it |
| `RecommendationDisplay` maps without fallback → empty badge | 🔴 | Renders broken UI with `className="... undefined"` in production |
| `api.get` returns undefined for non-JSON response | 🔴 | Silent data loss; affects all non-JSON error responses |
| UTC date off-by-one (appears across 4.1/4.2/4.3/SessionHistory) | 🟡 | Off-by-one at UTC-5 only for date-only strings; mitigated by spec guaranteeing full ISO 8601 datetimes |
| `sps.toFixed(1)` NaN if API returns null | 🟡 | Backend contract says non-nullable; edge case; no crash, renders "NaN" |
| `LevelMetricCard value.toFixed(2)` no NaN guard | 🟡 | Same class as above |
| `data.slope.toFixed(2)` crashes on null slope | 🟡 | TrendChart renders blank if slope null |
| `QueryClient` no `retry`/`staleTime` config | 🟢 | Performance/UX polish; not a correctness bug |
| `initials` empty string for empty name | 🟢 | Cosmetic avatar fallback |
| Keyboard navigation for session rows | 🟢 | Accessibility; MVP scope defer |
| Inline style objects recreated every render | 🟢 | Performance; no user-visible impact |
| `startedAt: Date` type won't survive Zustand persist | ❌ | Not using persist middleware; architectural dead code path |
| `setAuth(Partial<AuthSlice>)` allows incoherent state | ❌ | Pre-existing design; discriminated union is a future refactor if needed |
| Cancel during in-flight POST | ❌ | No AbortController needed; React Router double-navigate is no-op |

---

### Project Structure for This Story

```
src/
  services/
    api.ts                              ← MODIFY: throw ApiError on 401 (H1)
  store/
    app.store.ts                        ← MODIFY: resetActiveSession clears pendingSessionComplete (H2)
  features/
    analytics/
      components/
        SessionHistory.tsx              ← MODIFY: pass patientId in router state on navigate (H3a)
    sessions/
      pages/
        SessionDetailPage.tsx           ← MODIFY: use useLocation for patient-aware back nav (H3b)

_bmad-output/
  implementation-artifacts/
    deferred-work.md                    ← MODIFY: add priority classification to all items (H4)
```

---

### References

- Retro action items: [_bmad-output/implementation-artifacts/epic-4-retro-2026-05-31.md](_bmad-output/implementation-artifacts/epic-4-retro-2026-05-31.md) — H1–H5 section
- api.ts current state: [src/services/api.ts](src/services/api.ts) lines 21–26
- app.store.ts current state: [src/store/app.store.ts](src/store/app.store.ts) lines 49–58
- SessionDetailPage current state: [src/features/sessions/pages/SessionDetailPage.tsx](src/features/sessions/pages/SessionDetailPage.tsx)
- SessionHistory current state: [src/features/analytics/components/SessionHistory.tsx](src/features/analytics/components/SessionHistory.tsx)
- Deferred work to triage: [_bmad-output/implementation-artifacts/deferred-work.md](_bmad-output/implementation-artifacts/deferred-work.md)
- ApiError type: [src/shared/types/shared.types.ts](src/shared/types/shared.types.ts) — already imported in api.ts
- Deferred 401 item: deferred-work.md "2-3-patient-profile-page" section: "`401` response in `api.get` resolves `undefined as never` instead of throwing"
- Deferred pendingSessionComplete item: deferred-work.md "3-4-live-vr-stream-embed" section: "`pendingSessionComplete` not reset by `resetActiveSession`"
- Deferred navigate(-1) item: story 4.3 Review Findings: "[Review][Patch] `navigate(-1)` exits app entirely when SessionDetailPage accessed via direct URL or bookmark"

---

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (BMad dev-story workflow)

### Debug Log References

- `npm run build` → `tsc -b && vite build` passed: 0 TypeScript errors, 782 modules transformed, built in ~4s. Pre-existing chunk-size (>500 kB) warning is unrelated to this story.

### Completion Notes List

- **H1 (AC #1)** — `src/services/api.ts`: replaced `return undefined as never` in the 401 branch with `throw new ApiError(401, 'UNAUTHORIZED', 'Session expired or absent')`. The `window.location.href = '/login'` redirect still runs before the throw. `ApiError` was already imported (line 1) — no new import. TanStack Query now sets `isError: true` on 401 instead of resolving `undefined` as data.
- **H2 (AC #2)** — `src/store/app.store.ts`: changed `resetActiveSession` from `() =>` to `(s) =>` and added `notifications: { ...s.notifications, pendingSessionComplete: false }` to the `set` payload. The `...s.notifications` spread preserves the `items` array. `SessionCompletionToast` no longer re-appears after a session close.
- **H3a (AC #3)** — `src/features/analytics/components/SessionHistory.tsx`: row `onClick` now calls `navigate(\`/sessions/${session.sessionId}\`, { state: { patientId } })`. `Props` already declared `patientId: string`; `useNavigate` already imported — no signature/import changes.
- **H3b (AC #4)** — `src/features/sessions/pages/SessionDetailPage.tsx`: added `useLocation` to the import, derived `statePatientId` from `location.state`, and computed `backPath = statePatientId ? \`/patients/${statePatientId}\` : '/patients'`. Back button `onClick` now calls `navigate(backPath)`, replacing the browser-specific `window.history.state?.idx` check. Direct-URL/bookmark entry (no router state) falls back to `/patients` instead of exiting the app.
- **H4 (AC #5)** — `_bmad-output/implementation-artifacts/deferred-work.md`: classified all 50 deferred items inline with 🔴/🟡/🟢/❌ + rationale, added a triage legend at the top and an "H4 Triage Summary" section at the bottom (counts: 2 🔴, 22 🟡, 18 🟢, 17 ❌). Surfaced 2 🔴 items needing a story now: `RecommendationDisplay` no-fallback broken badge, and `api.get` returning `undefined` for non-JSON responses.
- **Build (AC #6)** — `npm run build` passes with 0 TypeScript errors.
- **Testing note:** project has no test infrastructure (MVP, single dev) per Dev Notes — no test files created; verification is via the build and AC review.

### File List

- `src/services/api.ts` (modified)
- `src/store/app.store.ts` (modified)
- `src/features/analytics/components/SessionHistory.tsx` (modified)
- `src/features/sessions/pages/SessionDetailPage.tsx` (modified)
- `_bmad-output/implementation-artifacts/deferred-work.md` (modified)
- `_bmad-output/implementation-artifacts/hardening-phase-a-critical-fixes.md` (modified — story record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status tracking)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-31 | Implemented Hardening Phase A critical fixes H1–H4: 401 throws ApiError, resetActiveSession clears pendingSessionComplete, patient-aware session-detail back navigation, deferred-work.md fully triaged (50 items). Build green. Status → review. |
