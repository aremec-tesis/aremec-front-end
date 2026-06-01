---
baseline_commit: 6a32fea776fdf42a2467b896175f6a9a0d5760c4
---

# Hardening Phase A2: Data Correctness Fixes

Status: done

## Story

As a neurologist using the clinical portal,
I want malformed or unexpected API data to fail safely instead of rendering broken UI, crashing a view, or silently losing data,
so that clinical screens stay trustworthy even when the backend returns an edge-case payload.

## Prerequisites from Last Story (Hardening Phase A — carry-forward)

This story implements the two 🔴 items surfaced by the H4 triage in [hardening-phase-a-critical-fixes.md](hardening-phase-a-critical-fixes.md), plus the 🟡 clusters that share the same root cause. Scope was confirmed with the user as "🔴 + clusters 🟡".

| ID | Issue | Triage | File |
|----|-------|--------|------|
| C1 | `RecommendationDisplay` renders a broken badge (`className="... undefined"`) for any recommendation value outside the known set | 🔴 | `RecommendationDisplay.tsx` + unsafe cast in `metrics.service.ts` (🟡) |
| C2 | `api.get` returns `undefined` for non-JSON `2xx` responses → silent data loss across all callers | 🔴 | `api.ts` + `toCamel(undefined)` symptom (🟡) |
| C3 | `.toFixed()` on `null`/`NaN`/non-finite values throws or renders "NaN" | 🟡 cluster | `TrendChart`, `PatientDashboard`, `SessionHistory`, `LevelMetricCard` |
| C4 | Invalid `sessionDate` → `new Date(invalid)` → `Intl.DateTimeFormat.format()` throws `RangeError` and crashes the view; date-only strings shift a day back at UTC-5 | 🟡 cluster | `TrendChart`, `PatientDashboard`, `SessionHistory`, `SessionFilter` |
| C5 | No active-session guard: a second `createSession` while one is active overwrites the store / orphans a session | 🟡 cluster | `SessionOpenButton.tsx` |

---

## Acceptance Criteria

1. **C1 — recommendation validated at the boundary + defensive fallback** — Given the metrics API returns a `recommendation` string outside `{increase_difficulty, maintain_difficulty, decrease_difficulty}`, when `toLevelMetrics` maps it, then it is treated as `{ status: 'pending' }` (not cast blindly to a `RecommendationValue`). And given `RecommendationDisplay` ever receives a resolved value with no matching label/badge, when it renders, then it falls back to `badge-gray` + the raw value text (never `className="... undefined"` or an empty badge).

2. **C2 — api.ts surfaces non-JSON responses instead of losing data** — Given a `2xx` response whose body is non-empty and whose `content-type` is not `application/json`, when `request<T>` processes it, then it throws `ApiError(status, 'NON_JSON_RESPONSE', ...)`. Given a `204 No Content` or an empty body, when `request<T>` processes it, then it resolves `undefined` (so `completeSession`'s `void` PATCH still works). As a consequence, `toCamel(undefined)` can no longer be reached via a non-JSON response.

3. **C3 — shared `formatNumber` guards all `.toFixed` call sites** — Given any of the four numeric render sites receives `null`, `undefined`, `NaN`, or a non-finite number, when it renders, then it shows the fallback `—` instead of throwing or printing "NaN". A single shared helper `formatNumber` is used at all four sites.

4. **C4 — shared `formatDate` guards all date render sites** — Given any of the five date render sites receives an invalid date string, when it renders, then it shows `—` instead of throwing a `RangeError` (which currently crashes the whole list/chart). And given a date-only string (`YYYY-MM-DD`), when it renders at UTC-5, then it shows the intended calendar day (no off-by-one). A single shared helper `formatDate` is used at all five sites.

5. **C5 — active-session guard in SessionOpenButton** — Given an active session already exists in the store (`activeSession.sessionId !== null`), when the neurologist clicks "Iniciar sesión", then `createSession` is NOT called; instead they navigate to the existing active session's route. This prevents store overwrite and orphaned sessions.

6. **Build stays green** — `npm run build` passes with 0 TypeScript errors after all changes.

---

## Tasks / Subtasks

- [x] **C1: Validate recommendation at the boundary + defensive fallback** (AC: #1)
  - [x] Open `src/services/metrics.service.ts`
  - [x] Add a known-values set near the top: `const RECOMMENDATION_VALUES = ['increase_difficulty', 'maintain_difficulty', 'decrease_difficulty'] as const`
  - [x] Replace the unsafe cast inside `toLevelMetrics` (lines 41–47). Instead of `toMLField(raw.recommendation as ...)`, validate first:
    ```ts
    recommendation:
      raw.recommendation != null &&
      (RECOMMENDATION_VALUES as readonly string[]).includes(raw.recommendation)
        ? { status: 'resolved', value: raw.recommendation as RecommendationValue }
        : { status: 'pending' },
    ```
    (Define/import `RecommendationValue` — it already exists in `RecommendationDisplay.tsx`; export it from there or re-declare the union locally to avoid a feature→service import inversion. Prefer a local `type RecommendationValue = typeof RECOMMENDATION_VALUES[number]`.)
  - [x] Open `src/features/sessions/components/RecommendationDisplay.tsx`
  - [x] In the `render` callback, add fallbacks so an unknown resolved value can never produce `undefined` in the className/label:
    ```tsx
    className={`badge recommendation-badge ${RECOMMENDATION_BADGE[value] ?? 'badge-gray'}`}
    // and
    {RECOMMENDATION_LABEL[value] ?? value}
    ```

- [x] **C2: api.ts — surface non-JSON 2xx responses** (AC: #2)
  - [x] Open `src/services/api.ts`
  - [x] Replace the final return (lines 37–38) with content-type-aware handling that throws on unexpected non-JSON bodies but still allows empty/204 → `undefined`:
    ```ts
    if (res.status === 204) return undefined as T
    const ct = res.headers.get('content-type')
    if (ct?.includes('application/json')) return res.json() as Promise<T>
    const text = await res.text().catch(() => '')
    if (text.trim() === '') return undefined as T
    throw new ApiError(res.status, 'NON_JSON_RESPONSE', `Expected JSON, received '${ct ?? 'unknown content-type'}'`)
    ```
  - [x] `ApiError` is already imported (line 1) — do NOT add a new import
  - [x] Verify `completeSession` (`api.patch<void>`, empty body) still resolves: it hits the `204`/empty-text → `undefined` path

- [x] **C3: Shared `formatNumber` + apply to 4 sites** (AC: #3)
  - [x] Create `src/shared/utils/format.ts` (new file) with:
    ```ts
    export function formatNumber(
      value: number | null | undefined,
      digits: number,
      fallback = '—',
    ): string {
      return typeof value === 'number' && Number.isFinite(value)
        ? value.toFixed(digits)
        : fallback
    }
    ```
  - [x] `src/features/analytics/components/TrendChart.tsx:39` — `Pendiente: {formatNumber(data.slope, 2)}`
  - [x] `src/features/analytics/components/PatientDashboard.tsx:107` — `SPS {formatNumber(session.sps, 1)}`
  - [x] `src/features/analytics/components/SessionHistory.tsx:46` — `SPS {formatNumber(session.sps, 1)}`
  - [x] `src/features/sessions/components/LevelMetricCard.tsx:15` — `{formatNumber(value, 2)}`
  - [x] Add the import to each of the four files

- [x] **C4: Shared `formatDate` + apply to 5 sites** (AC: #4)
  - [x] Add to `src/shared/utils/format.ts`:
    ```ts
    export function formatDate(
      iso: string | null | undefined,
      opts: Intl.DateTimeFormatOptions,
      locale = 'es-PE',
    ): string {
      if (!iso) return '—'
      // Date-only strings (YYYY-MM-DD) parse as UTC midnight → shift a day back at UTC-5.
      // Append local midnight so they render on the intended calendar day.
      const normalized = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso
      const d = new Date(normalized)
      if (Number.isNaN(d.getTime())) return '—'
      return new Intl.DateTimeFormat(locale, opts).format(d)
    }
    ```
  - [x] `TrendChart.tsx:28-29` — `label: formatDate(s.sessionDate, { month: 'short', day: 'numeric' })`
  - [x] `PatientDashboard.tsx:52-53` — same `{ month: 'short', day: 'numeric' }`
  - [x] `PatientDashboard.tsx:104` — `formatDate(session.sessionDate, { dateStyle: 'medium' })`
  - [x] `SessionHistory.tsx:42-43` — `formatDate(session.sessionDate, { dateStyle: 'medium' })`
  - [x] `SessionFilter.tsx:30-31` — `formatDate(s.sessionDate, { dateStyle: 'short' })`
  - [x] Add the import to each file; remove the now-unused inline `new Intl.DateTimeFormat(...)` expressions

- [x] **C5: Active-session guard in SessionOpenButton** (AC: #5)
  - [x] Open `src/features/sessions/components/SessionOpenButton.tsx`
  - [x] Read the active session from the store: `const active = useAppStore((s) => s.activeSession)`
  - [x] Guard the click handler so an existing session is not overwritten:
    ```tsx
    onClick={() => {
      if (active.sessionId) {
        navigate(`/patients/${active.patientId ?? patientId}/session`)
        return
      }
      mutate()
    }}
    ```
  - [x] (Optional) Reflect state in the label, e.g. `{active.sessionId ? 'Ver sesión activa' : isPending ? 'Iniciando...' : 'Iniciar sesión'}`

- [x] **Verify build** (AC: #6)
  - [x] Run `npm run build`
  - [x] Confirm 0 TypeScript errors

### Review Findings

- [x] [Review][Defer] `formatDate` date-only normalization appends `T00:00:00` (no timezone) — local-time interpretation correct at UTC-5 but shifts a day in UTC+ deployments [src/shared/utils/format.ts:18] — deferred, designed for UTC-5 (es-PE) per spec; revisit if app deploys to other locales
- [x] [Review][Defer] `formatDate` non-standard date strings bypass `^\d{4}-\d{2}-\d{2}$` regex — e.g. `"2025-1-5"` or `"2025/12/01"` enter `new Date()` unparsed; browser-dependent result [src/shared/utils/format.ts:20] — deferred, API contract guarantees ISO 8601 format; same class as date-safety defers
- [x] [Review][Defer] `SessionOpenButton` `disabled={isPending}` blocks "Ver sesión activa" click briefly — button shows updated label but remains disabled for one render cycle after `onSuccess` sets `active.sessionId` [src/features/sessions/components/SessionOpenButton.tsx:32] — deferred, sub-render-cycle UX flash, non-critical
- [x] [Review][Defer] `SessionOpenButton` rapid double-click can call `mutate()` twice — `isPending` guard not yet active before first render; `useMutation` does not deduplicate concurrent calls [src/features/sessions/components/SessionOpenButton.tsx:34] — deferred, pre-existing pattern for all mutation buttons; add `useRef` guard if needed
- [x] [Review][Defer] `formatNumber` no guard on `digits` argument — `toFixed(negative)` throws `RangeError`; all current call sites use literal `1`/`2` but exported function is unguarded [src/shared/utils/format.ts:7] — deferred, latent risk for future callers; clamp `Math.max(0, Math.min(100, digits))` if needed
- [x] [Review][Defer] `MetricDetailTable` duplicate `level` values → React key collision silently drops a row — if API returns two entries with same `level` integer, one is discarded without error [src/features/analytics/components/MetricDetailTable.tsx] — deferred, pre-existing API contract assumption; backend should ensure unique levels

---

## Dev Notes

### Critical Constraints — Read Before Writing Any Code

**`erasableSyntaxOnly: true` in `tsconfig.app.json`.** No constructor parameter properties, no enums. Use `as const` arrays + `typeof[number]` unions. (Mandatory carry-forward from Phase A.)

**No test files** — project has no test infrastructure (MVP, single developer). Do not create test files. Verification is via `npm run build` + AC review.

**`ApiError` is already imported in `api.ts` at line 1.** Do NOT add a new import.

**Avoid feature→service import inversions.** `metrics.service.ts` already imports `PatientTrendData` from the analytics feature (a known 🟢 layering debt). Do NOT add a new `service → feature` import for `RecommendationValue`; derive it locally in `metrics.service.ts` from the `as const` array.

**`formatNumber`/`formatDate` live in `src/shared/utils/format.ts`** — new folder `src/shared/utils/` (shared currently has `components/`, `hooks/`, `types/` only).

### C1 — Why the current code is unsafe

`metrics.service.ts:41-47` casts `raw.recommendation` straight to the union before wrapping it with `toMLField`. `MLFieldDisplay` then renders the `resolved` branch for ANY non-null value, so an unknown string reaches `RecommendationDisplay`'s `render`, where `RECOMMENDATION_BADGE[value]` and `RECOMMENDATION_LABEL[value]` are both `undefined`. Result: `<span className="badge recommendation-badge undefined">` with empty text. The boundary validation (C1) is the real fix; the component fallback is defense-in-depth.

### C2 — Why returning `undefined` is silent data loss

`api.ts:38` currently returns `Promise.resolve(undefined)` for any non-JSON body. If a proxy/misroute returns a `200` HTML error page, every caller (`getPatient`, `getDashboard`, `getSessionMetrics`, …) receives `undefined` and TanStack Query reports success with no data — the user sees a blank/`—` screen instead of an error. The fix throws for non-empty non-JSON bodies while preserving the legitimate empty-body (`completeSession`) path.

### C3/C4 — Centralize the guards

All four `.toFixed` sites and all five date sites repeat the same fragile pattern. Centralizing into `formatNumber`/`formatDate` fixes them uniformly and prevents regressions when new screens are added. The date helper also closes the long-standing UTC off-by-one defer (4.1/4.2/4.3) for date-only strings.

**Out of scope (stays deferred):** `NeurologistDashboard.tsx` `.toFixed` sites — that file is a standalone legacy prototype not wired into the feature routes. `MetricDetailTable` sparse-`level`/sort-stability 🟡 items are a different cluster and remain in `deferred-work.md`.

### Project Structure for This Story

```
src/
  shared/
    utils/
      format.ts                         ← NEW: formatNumber + formatDate (C3, C4)
  services/
    api.ts                              ← MODIFY: throw on non-JSON 2xx (C2)
    metrics.service.ts                  ← MODIFY: validate recommendation at boundary (C1)
  features/
    sessions/
      components/
        RecommendationDisplay.tsx       ← MODIFY: defensive label/badge fallback (C1)
        LevelMetricCard.tsx             ← MODIFY: formatNumber (C3)
        SessionOpenButton.tsx           ← MODIFY: active-session guard (C5)
    analytics/
      components/
        TrendChart.tsx                  ← MODIFY: formatNumber + formatDate (C3, C4)
        PatientDashboard.tsx            ← MODIFY: formatNumber + formatDate (C3, C4)
        SessionHistory.tsx              ← MODIFY: formatNumber + formatDate (C3, C4)
        SessionFilter.tsx               ← MODIFY: formatDate (C4)
```

### References

- Triage source: [hardening-phase-a-critical-fixes.md](hardening-phase-a-critical-fixes.md) — "H4 Triage Summary" (2 🔴 + 🟡 clusters)
- Deferred items: [deferred-work.md](deferred-work.md) — RecommendationDisplay 🔴, api.get non-JSON 🔴, numeric/date 🟡 clusters, SessionOpenButton no-guard 🟡
- `ApiError`: [src/shared/types/shared.types.ts](src/shared/types/shared.types.ts)
- `MLField` / `MLFieldDisplay`: [src/features/sessions/components/MLFieldDisplay.tsx](src/features/sessions/components/MLFieldDisplay.tsx)

---

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (BMad dev-story workflow)

### Debug Log References

- `npm run build` → `tsc -b && vite build` passed: 0 TypeScript errors, 783 modules transformed (one more than Phase A — the new `format.ts`), built in ~0.6s. Pre-existing chunk-size (>500 kB) warning is unrelated.

### Completion Notes List

- **C1 (AC #1)** — `src/services/metrics.service.ts`: added `RECOMMENDATION_VALUES` (`as const`) + local `RecommendationValue = typeof[number]` (no service→feature import inversion) and a `toRecommendationField(raw)` guard that returns `{ status: 'pending' }` for null/unknown values instead of blindly casting. `toLevelMetrics` now calls it. `src/features/sessions/components/RecommendationDisplay.tsx`: defensive fallbacks `RECOMMENDATION_BADGE[value] ?? 'badge-gray'` and `RECOMMENDATION_LABEL[value] ?? value` — an unknown value can never produce `className="... undefined"` or an empty label.
- **C2 (AC #2)** — `src/services/api.ts`: replaced the silent `Promise.resolve(undefined)` non-JSON branch. Now: `204` → `undefined`; `application/json` → `res.json()`; empty body → `undefined`; any non-empty non-JSON `2xx` → `throw new ApiError(status, 'NON_JSON_RESPONSE', ...)`. `completeSession` (`api.patch<void>`, empty body) still resolves via the empty/204 path. `ApiError` already imported — no new import. As a consequence, `toCamel(undefined)` (🟡) is no longer reachable via non-JSON responses.
- **C3 (AC #3)** — new `src/shared/utils/format.ts` `formatNumber(value, digits, fallback='—')` guards `null`/`undefined`/`NaN`/non-finite. Applied at all 4 sites: `TrendChart.tsx` (`slope`), `PatientDashboard.tsx` (`sps`), `SessionHistory.tsx` (`sps`), `LevelMetricCard.tsx` (`value`).
- **C4 (AC #4)** — `formatDate(iso, opts, locale='es-PE')` in the same helper: returns `—` for null/invalid dates (kills the `RangeError` crash) and appends `T00:00:00` to date-only `YYYY-MM-DD` strings to fix the UTC-5 off-by-one. Applied at all 5 sites: `TrendChart.tsx`, `PatientDashboard.tsx` (×2), `SessionHistory.tsx`, `SessionFilter.tsx`. All inline `new Intl.DateTimeFormat(...).format(new Date(...))` expressions removed.
- **C5 (AC #5)** — `src/features/sessions/components/SessionOpenButton.tsx`: reads `activeSession` from the store; the click handler now navigates to the existing active session (`/patients/${active.patientId ?? patientId}/session`) instead of calling `createSession` when `active.sessionId` is set. Button label switches to "Ver sesión activa". Prevents store overwrite / orphaned sessions.
- **Build (AC #6)** — `npm run build` passes with 0 TypeScript errors.
- **Testing note:** no test infrastructure (MVP, single dev) per Dev Notes — no test files created; verification via build + AC review. `deferred-work.md` 🔴 entries (RecommendationDisplay, api.get non-JSON) are now resolved by this story.

### File List

- `src/shared/utils/format.ts` (new — formatNumber + formatDate)
- `src/services/api.ts` (modified — non-JSON 2xx handling)
- `src/services/metrics.service.ts` (modified — recommendation boundary validation)
- `src/features/sessions/components/RecommendationDisplay.tsx` (modified — defensive fallback)
- `src/features/sessions/components/LevelMetricCard.tsx` (modified — formatNumber)
- `src/features/sessions/components/SessionOpenButton.tsx` (modified — active-session guard)
- `src/features/analytics/components/TrendChart.tsx` (modified — formatNumber + formatDate)
- `src/features/analytics/components/PatientDashboard.tsx` (modified — formatNumber + formatDate)
- `src/features/analytics/components/SessionHistory.tsx` (modified — formatNumber + formatDate)
- `src/features/analytics/components/SessionFilter.tsx` (modified — formatDate)
- `_bmad-output/implementation-artifacts/hardening-phase-a2-data-correctness.md` (modified — story record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status tracking)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-31 | Implemented Hardening Phase A2 data-correctness fixes C1–C5: recommendation boundary validation + defensive badge fallback, api.ts throws on non-JSON 2xx, shared formatNumber/formatDate guards across 4 numeric + 5 date sites, active-session guard in SessionOpenButton. Resolves both 🔴 triage items. Build green. Status → review. |
