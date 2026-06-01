# Deferred Work

> **Triage legend** (added 2026-05-31, Hardening Phase A — H4):
> 🔴 Production blocker / data corruption risk — needs a story now ·
> 🟡 Real bug, low frequency/impact — next hardening sprint ·
> 🟢 Polish / tech debt — when time permits ·
> ❌ Won't fix (by design, pre-existing pattern, or already resolved)

## Deferred from: code review of 1-1-project-foundation-infrastructure (2026-05-28)

- No `/login` route in router stub — intentional, Story 1.3 will add it [src/router/index.tsx] **[❌ — resolved by Story 1.3 (done)]**
- No DELETE/PUT methods on `api` object — future story requirement [src/services/api.ts] **[🟢 — add when a story needs it]**
- `LoadingSpinner` has no visual animation — AC-5 criterion met ("no TS errors"); visual polish deferred [src/shared/components/LoadingSpinner.tsx] **[🟢 — Hardening Phase B (visual design)]**
- `startedAt: Date` type won't survive serialization if Zustand `persist` middleware is added — no persistence in this story [src/store/app.store.ts] **[❌ — not using persist; architectural dead code path]**
- `QueryClient` has no `retry`/`staleTime` config — default retries may cause redundant calls on 4xx [src/main.tsx] **[🟢 — performance/UX polish, not a correctness bug]**
- Store allows inconsistent slice state (e.g., `status='authenticated'` with `neurologist=null`) — no invariant enforcement; follows spec blueprint pattern [src/store/app.store.ts] **[❌ — pre-existing design; discriminated-union refactor if ever needed]**

## Deferred from: code review of 1-2-application-routing-layout-shell (2026-05-28)

- `/login` route not guarded for authenticated users — Story 1.3 rewrites LoginPage and should add a loader/redirect for already-authenticated users [src/router/index.tsx:22-25] **[🟢 — minor redirect polish; no broken state]**
- `setAuth(Partial<AuthSlice>)` allows incoherent auth state (e.g., `neurologist: undefined, status: 'authenticated'`) — pre-existing from Story 1.1 design; consider discriminated union in a future refactor [src/store/app.store.ts:24,36] **[❌ — pre-existing design; future refactor only if needed]**

## Deferred from: code review of 1-3-login-logout (2026-05-28)

- `authCheckInFlight` `.finally()` timing — race benign because Zustand `setAuth` is synchronous; new callers after settlement hit `status==='authenticated'` early return [src/router/index.tsx] **[❌ — benign by analysis (synchronous set)]**
- Open redirect via `apiBase` — build-time env var substitution in Vite; not a runtime injection risk; revisit if build pipeline allows untrusted env injection [src/features/auth/pages/LoginPage.tsx] **[❌ — build-time env, not a runtime vuln in current pipeline]**
- `requireAuth` getMe/logout race — AppShell (with LogoutButton) only renders after `status==='authenticated'`; race is practically unreachable in current UX flow [src/router/index.tsx] **[❌ — practically unreachable in current UX]**
- `initials` empty string when `neurologist.name` is `""` — cosmetic avatar fallback only covers `null`/`undefined`, not empty string; low-priority UI polish [src/shared/components/AppShell.tsx] **[🟢 — cosmetic avatar fallback]**

## Deferred from: code review of 2-1-patient-registration-form (2026-05-29)

- `defaultValue=""` on selects without `useForm({ defaultValues })` — works correctly now (RHF reads DOM ref on submit); becomes defect if `reset()` ever added [src/features/patients/components/PatientRegistrationForm.tsx] **[🟢 — latent; only breaks if `reset()` is added]**
- `toCamel(undefined)` on non-JSON API response — error propagates to TanStack Query `mutation.error`, user sees `<ErrorMessage>`; TypeError message text may be confusing [src/services/patients.service.ts] **[🟡 — surfaces as confusing error; tied to non-JSON handling 🔴 below]**
- Cancel during in-flight POST — no AbortController; orphaned mutation completes async, double `navigate('/patients')` is no-op in React Router v6 [src/features/patients/components/PatientRegistrationForm.tsx] **[❌ — no AbortController needed; double-navigate is a no-op]**
- Navigate fires before `invalidateQueries` settles — stale data flash on patients list; only observable once Story 2.2 is implemented [src/features/patients/components/PatientRegistrationForm.tsx] **[🟢 — brief stale flash; UX polish]**
- `PatientRaw` no runtime shape validation — TypeScript-only API contract, pre-existing architectural pattern [src/services/patients.service.ts] **[❌ — pre-existing pattern (no runtime schema layer); Zod is a future pass]**

## Deferred from: code review of 2-2-patient-list-search (2026-05-29)

- `gender` typed as unbounded `string` — no union type enforcing valid values; pre-existing from Story 2.1 design [src/features/patients/patient.types.ts] **[🟢 — type tightening; no runtime impact]**
- `baseline_ravlt/sart` may be `null` from API — TypeScript types say `number` but API may omit for new patients; silently produces `baselineRavlt: null` in Patient type [src/services/patients.service.ts] **[🟡 — silent null on new patients; real data-shape gap]**
- Cache invalidation in `useCreatePatient` fires only `onSuccess`, not `onSettled` — if `toCamel` throws post-successful POST, patient list is not refetched; pre-existing from Story 2.1 [src/features/patients/hooks/useCreatePatient.ts] **[🟡 — list can miss a refetch on post-POST parse error]**
- Stale results briefly visible during 300ms debounce window when clearing search — inherent debounce UX tradeoff; not addressable without changing the debounce architecture [src/shared/hooks/useDebounce.ts] **[❌ — inherent debounce tradeoff]**

## Deferred from: code review of 2-3-patient-profile-page (2026-05-29)

- `status ?? 'active'` fallback is dead code per TypeScript types; empty string from API passes nullish check, silently mis-classifying patient status [src/services/patients.service.ts:21] **[🟡 — empty-string from API mis-classifies status]**
- 401 response in `api.get` resolves `undefined as never` instead of throwing — TanStack Query treats it as success, `patient` becomes undefined, shows `<ErrorMessage error={null}>` during auth redirect [src/services/api.ts] **[❌ — FIXED in Hardening Phase A (H1)]**
- `age` field could be a float from API — renders as "75.5 años" with no rounding or integer validation [src/services/patients.service.ts:17] **[🟢 — cosmetic rounding]**
- `useAppStore(s => s.activeSession.sessionId)` lacks optional chaining — if `activeSession` is undefined on store initialization, accessing `.sessionId` throws TypeError [src/features/patients/pages/PatientProfilePage.tsx:18] **[🟡 — TypeError if store shape ever changes; activeSession is currently always initialized]**

## Deferred from: code review of 3-1-session-lifecycle-open-close-active-banner (2026-05-29)

- `status` field on `Session` type is untyped `string` — no union type enforcing valid values; pre-existing architectural pattern [src/features/sessions/session.types.ts] **[🟢 — type tightening]**
- `toSession` doesn't validate `raw.started_at` before `new Date()` — API contract assumption; Invalid Date silently propagates to banner timer [src/services/sessions.service.ts] **[🟡 — Invalid Date → broken banner timer if API sends bad value]**
- Session state (sessionId, startedAt) lost on browser refresh — no persistence layer; accepted MVP limitation [src/store/app.store.ts] **[❌ — accepted MVP limitation (no persistence)]**
- Initial `00:00:00` flicker on `ActiveSessionBanner` mount — inherent to `useState(0)` + `useEffect` pattern per spec blueprint [src/features/sessions/components/ActiveSessionBanner.tsx] **[❌ — per spec blueprint pattern]**
- `setInterval` clock drift over long sessions — visual only; timer recalculates from `Date.now()` wall clock on each tick [src/features/sessions/components/ActiveSessionBanner.tsx] **[🟢 — self-correcting; visual only]**
- `createSession` called while active session exists in store — API expected to enforce uniqueness; orphaned session risk [src/features/sessions/components/SessionOpenButton.tsx] **[🟡 — orphaned-session risk; same as 3-2 no-guard item below]**
- `completeSession` sends `{}` as PATCH body — intentional per api.ts contract; server must accept empty body [src/services/sessions.service.ts] **[❌ — intentional per API contract]**

## Deferred from: code review of 3-3-real-time-metrics-panel (2026-05-29)

- `patientId ?? ''` passes empty string to SessionCloseButton — spec-conformant but fragile; add early return guard when patientId is undefined [src/features/sessions/pages/SessionMonitorPage.tsx:24] **[🟡 — fragile empty-string passthrough]**
- `MLFieldDisplay` fallthrough `else` branch lacks explicit `'resolved'` guard — TypeScript-safe for current MLField union, but risks rendering `field.value` as undefined if API sends unexpected status [src/features/sessions/components/MLFieldDisplay.tsx:18] **[🟢 — TS-safe for current union]**
- `RecommendationDisplay` maps API values to label/badge without fallback — unknown recommendation value renders as empty badge with `className="... undefined"` [src/features/sessions/components/RecommendationDisplay.tsx:28-35] **[🔴 — renders broken UI (`className="... undefined"`) on any unknown value]**
- `LevelMetricCard value.toFixed(2)` call site has no NaN/Infinity/undefined guard — malformed API metric field would throw or render "NaN" on screen [src/features/sessions/components/LevelMetricCard.tsx:10] **[🟡 — renders "NaN" / throws on malformed metric]**
- `useSessionMetrics` hook has no `staleTime` or `refetchOnWindowFocus: false` — every window focus fires an extra metrics request alongside WebSocket-driven invalidations [src/features/sessions/hooks/useSession.ts:4-9] **[🟢 — redundant fetches; performance polish]**
- `WS_BASE_URL` undefined silently falls to polling — configuration error is indistinguishable from connectivity failure in user-facing notifications [src/features/sessions/hooks/useSessionWebSocket.ts:74] **[🟡 — config error masked as connectivity failure]**
- `encodeURIComponent` applied to `sessionId` in WS URL but not to `patientId` in navigation paths — inconsistent encoding pattern [src/features/sessions/hooks/useSessionWebSocket.ts:80] **[🟢 — encoding consistency; ids are server-generated]**
- `DomainTag` DOMAIN_CLASS map and `MetricsPanel` METRIC_DOMAINS map share Spanish domain strings as keys with no shared constant — silent fallback to badge-gray on rename/i18n drift [src/features/sessions/components/DomainTag.tsx:1-5, src/features/sessions/components/MetricsPanel.tsx:8-14] **[🟢 — refactor to shared constant; silent fallback only]**

## Deferred from: code review of 3-2-websocket-lifecycle-session-events (2026-05-29)

- Infinite reconnect / no total retry cap across reconnect cycles — production hardening; would require new circuit-breaker logic [src/features/sessions/hooks/useSessionWebSocket.ts] **[🟡 — production hardening; needs circuit-breaker]**
- No active-session guard in `SessionOpenButton` before creating new session — can overwrite store if second session started while first is active; tracked from Story 3.1 deferred items [src/features/sessions/components/SessionOpenButton.tsx] **[🟡 — store-overwrite / orphaned session]**
- `recommendation` field unsafe cast without runtime validation — TypeScript-only contract per spec design; add Zod validation in a future hardening pass [src/services/metrics.service.ts] **[🟡 — unsafe cast; pairs with RecommendationDisplay 🔴]**
- `Session.status` typed as unbounded `string` — no union type enforcing valid values; pre-existing from Story 3.1 [src/features/sessions/session.types.ts] **[🟢 — type tightening (dup of 3-1)]**
- `Session.startedAt` typed as `Date` but API likely returns ISO string — needs investigation of `api.get` deserializer; pre-existing architectural pattern [src/features/sessions/session.types.ts] **[🟡 — type/runtime mismatch; needs deserializer investigation]**

## Deferred from: code review of 3-4-live-vr-stream-embed (2026-05-29)

- `pendingSessionComplete` not reset by `resetActiveSession` — after a normal session close via `SessionCloseButton`, `pendingSessionComplete` remains `true` in the store; `SessionCompletionToast` in `AppShell` re-appears on the patient detail page. Fix: `resetActiveSession` in `app.store.ts` should also clear `notifications.pendingSessionComplete` [src/shared/components/AppShell.tsx, src/store/app.store.ts] **[❌ — FIXED in Hardening Phase A (H2)]**
- MetricsPanel TanStack Query not cancelled on session close — `useSessionMetrics` query may still be in-flight when `resetActiveSession` runs and `SessionMonitorPage` unmounts; `enabled: !!sessionId` prevents new fetches but does not cancel the in-flight request. Pre-existing architectural pattern [src/features/sessions/components/MetricsPanel.tsx, src/features/sessions/hooks/useSession.ts] **[🟢 — in-flight request not cancelled; benign (result discarded on unmount)]**

## Deferred from: code review of 4-1-patient-dashboard-sps-trend (2026-05-30)

- Date timezone risk — bare `YYYY-MM-DD` strings display one day prior at UTC-5 (Peru); mitigated by spec guaranteeing full datetime strings; revisit if API contract changes [src/features/analytics/components/PatientDashboard.tsx] **[🟡 — UTC off-by-one for date-only strings; mitigated by ISO-8601 spec]**
- Invalid sessionDate crashes render — `new Date(invalid)` → `Intl.DateTimeFormat.format()` throws `RangeError`; backend contract specifies valid ISO 8601 [src/features/analytics/components/PatientDashboard.tsx] **[🟡 — RangeError crashes render on bad date]**
- `sps` null/NaN from API — `.toFixed(1)` throws or renders "NaN"; type declares `number` as non-nullable; backend contract issue [src/features/analytics/components/PatientDashboard.tsx] **[🟡 — `.toFixed` throws / "NaN" on null]**
- Empty/whitespace `patientId` → query disabled → spinner forever — currently protected by `PatientProfilePage` null guard; latent risk if component reused [src/features/analytics/hooks/usePatientDashboard.ts] **[🟢 — latent; currently guarded upstream]**
- `sps` outside [0,100] — chart clips silently at YAxis bounds while table shows raw value; backend data quality issue [src/features/analytics/components/PatientDashboard.tsx] **[🟢 — backend data-quality; chart clip only]**
- Chart X-axis label collisions on dense session lists — Story 4.2 session filter addresses this [src/features/analytics/components/PatientDashboard.tsx] **[❌ — addressed by Story 4.2 (done)]**
- `api.get` returns undefined for non-JSON response — pre-existing service-layer issue affecting all API calls [src/services/patients.service.ts] **[🔴 — silent data loss on any non-JSON response; affects all callers]**
- Inline style objects recreated every render — performance optimization; future work [src/features/analytics/components/PatientDashboard.tsx] **[🟢 — perf; no user-visible impact]**
- No `staleTime`/`gcTime` on dashboard query — default refetch-on-focus may be desirable for clinical freshness [src/features/analytics/hooks/usePatientDashboard.ts] **[🟢 — tuning; current default acceptable]**

## Deferred from: code review of 4-2-cognitive-trend-chart-session-filter (2026-05-30)

- UTC date off-by-one on date-only ISO strings in TrendChart/SessionFilter — aligns with 4-1 defer; mitigated by spec guaranteeing full datetime strings [src/features/analytics/components/TrendChart.tsx:28, SessionFilter.tsx:30] **[🟡 — UTC off-by-one (dup class of 4-1)]**
- Invalid `sessionDate` crashes TrendChart/SessionFilter render — `new Date(invalid)` → `Intl.DateTimeFormat.format()` throws RangeError; same class as 4-1 defer; backend contract specifies valid ISO 8601 [src/features/analytics/components/TrendChart.tsx:28-29, SessionFilter.tsx:30] **[🟡 — RangeError crash on bad date (dup class)]**
- `data.slope.toFixed(2)` crashes if slope is null/NaN/non-finite — same class as 4-1 `sps` null/NaN defer; raw type declares `number` as non-nullable [src/features/analytics/components/TrendChart.tsx:39] **[🟡 — `.toFixed` crash on null slope]**
- `TrendChart` (`/trend`) and `PatientDashboard` (`/dashboard`) can show contradictory trend directions — two intentionally separate API endpoints per spec architecture; no shared source of truth [src/features/analytics/components/TrendChart.tsx, PatientDashboard.tsx] **[❌ — by spec (two distinct endpoints)]**
- `metrics.service.ts` imports `PatientTrendData` from analytics feature module — layering inversion; by spec design (follow-up with shared types module if dependency graph grows) [src/services/metrics.service.ts] **[🟢 — layering tech debt; move to shared types later]**
- Stale `selectedSessionId` shows all sessions with filter chip still active — by spec design (explicit fallback documented in Dev Notes; reset on patient navigation via useEffect) [src/features/analytics/components/PatientDashboard.tsx] **[❌ — by spec design (documented fallback)]**
- Single-session filter renders sparkline with 1 dot (no line) in PatientDashboard — acceptable MVP sparkline behavior; visually suboptimal but not a data error [src/features/analytics/components/PatientDashboard.tsx] **[🟢 — cosmetic sparkline edge case]**

## Deferred from: code review of 4-3-session-history-per-session-detail (2026-05-30)

- Status coercion: any non-'complete' API value maps silently to 'incomplete' — by spec design; revisit if backend adds new statuses (e.g. 'cancelled', 'in_progress') [src/services/patients.service.ts] **[❌ — by spec; revisit if backend adds statuses]**
- Date-only ISO strings display off-by-one at UTC-5 — same class as 4.1/4.2 deferred; mitigated by spec guaranteeing full datetime strings [src/features/analytics/components/SessionHistory.tsx] **[🟡 — UTC off-by-one (dup class)]**
- Invalid `sessionDate` string crashes entire session list render — `new Date(invalid)` → `Intl.DateTimeFormat.format()` throws RangeError; same class as 4.1/4.2; backend contract specifies valid ISO 8601 [src/features/analytics/components/SessionHistory.tsx] **[🟡 — RangeError crashes whole list (dup class)]**
- `sps.toFixed(1)` throws/shows NaN if API returns null for sps — same class as 4.1 deferred; raw type declares `number` as non-nullable [src/features/analytics/components/SessionHistory.tsx] **[🟡 — `.toFixed` crash/NaN on null (dup class)]**
- `level[key]` undefined throws TypeError in LevelMetricCard — API omitting a metric (sparse level response) propagates as undefined; backend data quality issue [src/features/analytics/components/MetricDetailTable.tsx] **[🟡 — TypeError on sparse level response]**
- Sort stability with undefined `level` field — `a.level - b.level` evaluates to NaN, silently scrambles level order; backend data quality issue [src/features/analytics/components/MetricDetailTable.tsx] **[🟡 — NaN compare scrambles level order]**
- Clickable session rows not keyboard-navigable — div with onClick has no role="button", tabIndex, or onKeyDown; MVP scope accessibility defer [src/features/analytics/components/SessionHistory.tsx] **[🟢 — a11y; MVP scope defer (Hardening Phase B)]**

---

## H4 Triage Summary (2026-05-31, Hardening Phase A)

All 50 deferred items above classified. Counts:

| Priority | Count | Meaning | Disposition |
|----------|-------|---------|-------------|
| 🔴 | 2 | Production blocker / broken UI / silent data loss | **Needs a story now** |
| 🟡 | 22 | Real bug, low frequency/impact | Next hardening sprint |
| 🟢 | 18 | Polish / tech debt | When time permits (several → Hardening Phase B) |
| ❌ | 17 | Won't fix / by design / already resolved | No action (3 resolved by this story: H1, H2 + 401-undefined) |

### 🔴 Items requiring a story now

1. **`RecommendationDisplay` no fallback → broken badge** (`className="... undefined"`) — `src/features/sessions/components/RecommendationDisplay.tsx`. Pairs with the unsafe `recommendation` cast in `metrics.service.ts` (🟡). Recommend a single story: add `Zod`/runtime validation + a default label/badge.
2. **`api.get` returns `undefined` for non-JSON response** — `src/services/api.ts:38`. Silent data loss affecting every caller. Recommend folding into a service-layer story alongside the `toCamel(undefined)` 🟡 symptom.

### 🟡 Theme clusters (group into next hardening sprint)

- **Numeric guards** (`.toFixed` on null/NaN): `sps` (4-1, 4-3), `slope` (4-2), `LevelMetricCard.value` (3-3) — add a shared `formatNumber` helper.
- **Date safety** (UTC off-by-one + Invalid-Date `RangeError`): PatientDashboard, TrendChart, SessionFilter, SessionHistory — add a shared `formatDate` helper with guards.
- **Session integrity**: no active-session guard in `SessionOpenButton` / `createSession` while active (orphaned sessions) — single story.
- **Type/runtime mismatch**: `Session.startedAt` Date-vs-ISO, `baseline_ravlt/sart` nullable, empty-string status coercion.
- **WS/config**: `WS_BASE_URL` undefined masked as connectivity failure; infinite reconnect with no cap.

### 🟢 → Hardening Phase B (visual design) candidates

`LoadingSpinner` animation, `initials` empty-string fallback, keyboard navigation for session rows, inline-style memoization.

---

## Deferred from: code review of hardening-phase-a-critical-fixes + hardening-phase-a2-data-correctness (2026-05-31)

> Note: the two 🔴 items from the H4 triage summary above (`RecommendationDisplay` broken badge, `api.get` non-JSON silent data loss) were resolved by hardening-phase-a2-data-correctness (C1 + C2). Marked ❌ (resolved) in context.

- `api.ts` 401 path: `window.location.href = '/login'` fires then `throw new ApiError(401, ...)` — React Query briefly sees an error and may retry; retries hit 401 again; browser navigation wins before retries complete. [src/services/api.ts:24-27] **[🟢 — pre-existing pattern; browser navigation discards retries in practice]**
- `resetActiveSession` preserves `notifications.items` by spec-required spread — items array grows unboundedly across a long browser session; other notification flags also survive session reset. [src/store/app.store.ts:54] **[🟢 — by spec (items intentionally preserved); clear items on logout if needed]**
- `SessionHistory` threads prop `patientId` (not session's own field) into router state — silently wrong if sessions ever span multiple patients in one list. [src/features/analytics/components/SessionHistory.tsx:31] **[🟢 — single-patient assumption holds; revisit if multi-patient session lists are added]**
- `MetricDetailTable` `?.` guard shows EmptyState when `data.levels` is `undefined` — swallows the throw that would surface an API shape violation; silent "no data" instead of visible error. [src/features/analytics/components/MetricDetailTable.tsx:33] **[🟢 — intentional crash-prevention tradeoff; add console.warn in future pass]**
- `formatDate` date-only normalization appends `T00:00:00` without timezone — local-time interpretation; correct at UTC-5 but shifts a day in UTC+ environments or CI servers. [src/shared/utils/format.ts:18] **[🟢 — designed for UTC-5 (Peru); revisit if app deploys to other locales]**
- `formatDate` non-standard date strings bypass `^\d{4}-\d{2}-\d{2}$` regex — e.g. `"2025-1-5"`, `"2025/12/01"` enter `new Date()` unparsed; browser-dependent parse result. [src/shared/utils/format.ts:20] **[🟢 — API contract guarantees ISO 8601; same class as date-safety defers above]**
- `SessionOpenButton` `disabled={isPending}` persists briefly after `active.sessionId` set via mutation `onSuccess` — button shows "Ver sesión activa" but is disabled for one render cycle. [src/features/sessions/components/SessionOpenButton.tsx:32] **[🟢 — sub-render-cycle UX flash; non-critical]**
- `SessionOpenButton` rapid double-click before `isPending` re-render can call `mutate()` twice — no dedup guard; `useMutation` does not deduplicate concurrent calls to `mutate()`. [src/features/sessions/components/SessionOpenButton.tsx:34] **[🟡 — pre-existing mutation-button pattern; add `useRef` in-flight guard if double-sessions observed]**
- `formatNumber` no guard on `digits` argument — `toFixed(-1)` throws `RangeError`; current callers use literals `1`/`2` but exported function is unguarded for future callers. [src/shared/utils/format.ts:7] **[🟢 — latent; add `Math.max(0, Math.min(100, digits))` clamp if needed]**
- `MetricDetailTable` duplicate `level` integers from API → React key collision silently drops one row. [src/features/analytics/components/MetricDetailTable.tsx] **[🟢 — pre-existing API contract assumption; backend should ensure unique levels per session]**
