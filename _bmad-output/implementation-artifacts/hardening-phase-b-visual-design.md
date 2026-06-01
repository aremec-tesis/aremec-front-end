---
baseline_commit: 6a32fea776fdf42a2467b896175f6a9a0d5760c4
---

# Hardening Phase B: Visual Design & Polish

Status: done

## Story

As a neurologist using the clinical portal,
I want the interface to be visually polished and accessible in the details,
so that loading states are clear, navigation is keyboard-accessible, and the UI never shows broken or undefined output.

## Prerequisites from Last Story (Hardening Phase A2 — carry-forward)

This story implements the 🟢 cluster identified as "Hardening Phase B (visual design)" in the H4 Triage Summary, plus the 🟢 a11y defer from Story 4.3.

| ID | Issue | Triage | File |
|----|-------|--------|------|
| B1 | `LoadingSpinner` has no visual animation — renders static "Cargando…" text using the `.empty` layout | 🟢 | `LoadingSpinner.tsx` + `index.css` |
| B2 | `initials` fallback breaks on empty-string `neurologist.name` — `split(' ').filter(Boolean).map(n => n[0])` returns `[]` → `join('') = ''` → avatar shows nothing instead of `'?'` | 🟢 | `AppShell.tsx` |
| B3 | Clickable session rows in `SessionHistory` have no `role="button"`, `tabIndex`, or `onKeyDown` — keyboard users cannot navigate the session list | 🟢 | `SessionHistory.tsx` |
| B4 | Inline style objects recreated every render in `PatientDashboard` and `SessionHistory` — four `style={{...}}` blocks in `PatientDashboard` and one in `SessionHistory` row are new objects on every render | 🟢 | `PatientDashboard.tsx`, `SessionHistory.tsx` |

---

## Acceptance Criteria

1. **B1 — LoadingSpinner shows animated spinner** — Given any component is in a loading state and renders `<LoadingSpinner />`, when the spinner appears, then a rotating CSS animation is visible (not just the static "Cargando…" text). The spinner uses a `@keyframes` spin animation defined in `index.css`. The "Cargando…" text label remains visible below the spinner for screen readers and users with reduced motion. The `aria-busy="true"` attribute is preserved.

2. **B2 — initials guard handles empty-string name** — Given `neurologist.name` is an empty string `""`, when `AppShell` computes `initials`, then the avatar shows `'?'` instead of an empty div. The guard must cover `null`, `undefined`, and `""`.

3. **B3 — Session rows are keyboard-navigable** — Given the neurologist is on the session history list and uses the Tab key, when focus reaches a session row, then the row is focusable (`tabIndex={0}`) and has `role="button"`. Given focus is on a row and the user presses Enter or Space, when the keydown fires, then `navigate` is called identically to the mouse `onClick`. The row has a visible `:focus-visible` outline consistent with the existing focus style in `index.css`.

4. **B4 — Row style objects are stable references** — Given `PatientDashboard` or `SessionHistory` renders a session list, when the component re-renders without data changes, then the inline `style` objects for row containers are not newly allocated on each render. Implementation: extract the repeated style objects as module-level `const` objects (not `useMemo`) — they are static and do not depend on props or state.

5. **Build stays green** — `npm run build` passes with 0 TypeScript errors after all changes.

---

## Tasks / Subtasks

- [x] **B1: Animated LoadingSpinner** (AC: #1)
  - [x] Open `src/index.css`
  - [x] Add a `@keyframes spin` animation and a `.spinner` class after the existing `/* ── ANIMATE ── */` section:
    ```css
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin: 0 auto 10px;
    }
    ```
  - [x] Open `src/shared/components/LoadingSpinner.tsx`
  - [x] Add a `<div className="spinner" aria-hidden="true" />` inside the existing `.empty` wrapper, above the `.empty-text` div:
    ```tsx
    export function LoadingSpinner() {
      return (
        <div className="empty" aria-live="polite" aria-busy="true">
          <div className="spinner" aria-hidden="true" />
          <div className="empty-text">Cargando…</div>
        </div>
      )
    }

    export default LoadingSpinner
    ```
  - [x] `aria-hidden="true"` on the spinner div — the text label carries the accessible meaning; the visual ring is decorative

- [x] **B2: initials empty-string guard in AppShell** (AC: #2)
  - [x] Open `src/shared/components/AppShell.tsx`
  - [x] The current logic (line 9–11):
    ```ts
    const initials = neurologist?.name
      ? neurologist.name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      : '?'
    ```
    fails when `neurologist.name === ''` because the truthy check passes but `split(' ').filter(Boolean)` returns `[]`, so `map(n => n[0]).join('')` returns `''`, and `slice(0, 2)` returns `''`.
  - [x] Replace with:
    ```ts
    const initials = neurologist?.name?.trim()
      ? neurologist.name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      : '?'
    ```
  - [x] The only change is `neurologist?.name` → `neurologist?.name?.trim()` — the `.trim()` makes the truthiness check also reject `""` and whitespace-only strings

- [x] **B3: Keyboard navigation for session rows in SessionHistory** (AC: #3)
  - [x] Open `src/features/analytics/components/SessionHistory.tsx`
  - [x] The current session row `<div>` (lines 29–59) uses only `onClick`. Add `role`, `tabIndex`, and `onKeyDown`:
    ```tsx
    <div
      key={session.sessionId}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/sessions/${session.sessionId}`, { state: { patientId } })}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/sessions/${session.sessionId}`, { state: { patientId } })
        }
      }}
      style={SESSION_ROW_STYLE}
    >
    ```
  - [x] Note: `style={SESSION_ROW_STYLE}` uses the module-level const from B4 (define it together)
  - [x] The `:focus-visible` outline will be handled via CSS — add to `index.css` (see B4 CSS note below)
  - [x] Do NOT add `cursor: pointer` to `onKeyDown` — it already exists in `SESSION_ROW_STYLE`

- [x] **B4: Extract static style objects as module-level consts** (AC: #4)
  - [x] **SessionHistory.tsx** — extract the row style object (lines 33–40) to a module-level const before the component function:
    ```ts
    const SESSION_ROW_STYLE: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr 1fr 2fr auto',
      gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
      cursor: 'pointer',
    }
    ```
  - [x] Add `import type React from 'react'` — needed for `React.CSSProperties` type annotation. Use the type-only import to avoid runtime overhead.
  - [x] Replace the inline `style={{...}}` on the row `<div>` with `style={SESSION_ROW_STYLE}`
  - [x] **PatientDashboard.tsx** — extract the two repeated style objects before the component function:
    ```ts
    const DASHBOARD_CONTAINER_STYLE: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }

    const HEADER_ROW_STYLE: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 12,
    }

    const SESSION_ROW_STYLE: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr 1fr 2fr',
      gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }
    ```
  - [x] Add `import type React from 'react'` to `PatientDashboard.tsx` as well
  - [x] Replace:
    - `style={{ display: 'flex', flexDirection: 'column', gap: 16 }}` → `style={DASHBOARD_CONTAINER_STYLE}` (outer wrapper div, line 58)
    - `style={{ display: 'flex', alignItems: 'center', ... }}` → `style={HEADER_ROW_STYLE}` (trend header div, lines 61–68)
    - `style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 2fr', ... }}` → `style={SESSION_ROW_STYLE}` (session row div, lines 94–101)
  - [x] Do NOT extract cell-level styles (fontSize, fontFamily, color) — those are fine inline as they're simple and non-repeated

- [x] **CSS: Focus-visible style for role="button" rows** (in same PR as B3)
  - [x] Open `src/index.css`
  - [x] After the `.spinner` block, add a rule so keyboard-focused rows have a visible outline consistent with the app's focus style:
    ```css
    [role="button"]:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      border-radius: 4px;
    }
    ```
  - [x] This is a global rule that applies to any `role="button"` element in the app — safe because the only current use is session rows

- [x] **Verify build** (AC: #5)
  - [x] Run `npm run build`
  - [x] Confirm 0 TypeScript errors

---

## Dev Notes

### Critical Constraints — Read Before Writing Any Code

**`erasableSyntaxOnly: true` in `tsconfig.app.json`.** No constructor parameter properties, no enums. Use `as const` arrays + `typeof[number]` unions. (Mandatory carry-forward.)

**No test files** — project has no test infrastructure (MVP, single developer). Do not create test files. Verification is via `npm run build` + AC review.

**Do NOT use `useMemo` for the style objects.** The style objects in B4 are module-level constants — they don't depend on props or state, so `useMemo` would be over-engineering. Module-level `const` is the correct pattern.

**`import type React from 'react'` — not `import React from 'react'`.** In this Vite/React 17+ JSX transform setup, React is not needed as a runtime import. Only import the type for `React.CSSProperties`.

**`aria-hidden="true"` on the spinner ring div.** The animated `.spinner` ring is purely decorative — screen readers should read the "Cargando…" text, not a spinning element. The existing `aria-busy="true"` on the wrapper already signals loading state.

**Space keydown `e.preventDefault()` is required.** Without it, pressing Space on a focused row triggers page scroll in addition to navigation. `e.preventDefault()` on `' '` blocks the default scroll behavior.

### B1 — Why the current LoadingSpinner is broken

`LoadingSpinner` renders as a static `.empty` container — the same component used for empty states (`<EmptyState message="..." />`). The only difference is the text. There is no visual animation, so users cannot distinguish "loading" from "no data" at a glance. The fix adds a CSS-only rotating ring above the text. No new JS dependency is needed — the animation is pure CSS `@keyframes`.

### B2 — Why the whitespace-only name produces an empty avatar

The current guard is `neurologist?.name ? ... : '?'`. An empty string `""` is falsy in JavaScript, so it already returns `'?'` — that case is handled. The actual gap is a **whitespace-only name** like `"   "`: that string is truthy, so the code enters the split branch, `split(' ').filter(Boolean)` returns `[]`, `map(n => n[0]).join('')` returns `""`, and `slice(0, 2)` returns `""` — leaving the avatar div visually empty.

The fix is `neurologist?.name?.trim()` for the truthiness check:
```ts
const initials = neurologist?.name?.trim()
  ? neurologist.name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  : '?'
```
This makes the guard reject `null`, `undefined`, `""`, and `"   "`. The computation itself (`split … filter … map … join`) does not need to change.

### B3/B4 — Why these matter

Keyboard navigation was not wired in Story 4.3 (it was marked 🟢 as MVP scope defer). Adding `role="button"` + `tabIndex={0}` + `onKeyDown` is the standard pattern for interactive divs. The `:focus-visible` CSS prevents the outline from showing on mouse click (only shows on keyboard focus), which is the modern accessible pattern.

The style object extraction (B4) is straightforward. It doesn't change visible behavior — it just prevents React from allocating new objects on every render cycle. For list rendering especially (one object per row × N sessions), this adds up.

### Project Structure for This Story

```
src/
  index.css                               ← MODIFY: add @keyframes spin + .spinner + [role="button"]:focus-visible
  shared/
    components/
      LoadingSpinner.tsx                  ← MODIFY: add animated spinner ring (B1)
      AppShell.tsx                        ← MODIFY: trim() guard on initials (B2)
  features/
    analytics/
      components/
        SessionHistory.tsx                ← MODIFY: role/tabIndex/onKeyDown + SESSION_ROW_STYLE (B3, B4)
        PatientDashboard.tsx              ← MODIFY: module-level style consts (B4)
```

### Current State Snapshots

**LoadingSpinner.tsx (current — to become animated):**
```tsx
export function LoadingSpinner() {
  return (
    <div className="empty" aria-live="polite" aria-busy="true">
      <div className="empty-text">Cargando…</div>
    </div>
  )
}
```

**AppShell.tsx initials (current — whitespace-only name produces empty avatar):**
```ts
const initials = neurologist?.name
  ? neurologist.name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  : '?'
```

**SessionHistory.tsx row (current — not keyboard-accessible):**
```tsx
<div
  key={session.sessionId}
  onClick={() => navigate(`/sessions/${session.sessionId}`, { state: { patientId } })}
  style={{
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr 1fr 2fr auto',
    gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
  }}
>
```

**PatientDashboard.tsx outer wrapper (current — recreated each render):**
```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
```

### References

- Deferred items source: [_bmad-output/implementation-artifacts/deferred-work.md](_bmad-output/implementation-artifacts/deferred-work.md)
  - B1: "LoadingSpinner has no visual animation" (1-1 section) `[🟢 — Hardening Phase B (visual design)]`
  - B2: "initials empty string for empty name" (1-3 section) `[🟢 — cosmetic avatar fallback]`
  - B3: "Clickable session rows not keyboard-navigable" (4-3 section) `[🟢 — a11y; MVP scope defer (Hardening Phase B)]`
  - B4: "Inline style objects recreated every render" (4-1 section) `[🟢 — perf; no user-visible impact]`
- H4 Triage Summary (Phase B candidates): deferred-work.md — "🟢 → Hardening Phase B (visual design) candidates"
- `index.css` existing animations: `@keyframes pulse-badge` (line 729), `@keyframes fadeUp` (line 1221), `.fade-up` (line 1233) — pattern to follow for new spin keyframe
- `LoadingSpinner.tsx`: [src/shared/components/LoadingSpinner.tsx](src/shared/components/LoadingSpinner.tsx)
- `AppShell.tsx`: [src/shared/components/AppShell.tsx](src/shared/components/AppShell.tsx)
- `SessionHistory.tsx`: [src/features/analytics/components/SessionHistory.tsx](src/features/analytics/components/SessionHistory.tsx)
- `PatientDashboard.tsx`: [src/features/analytics/components/PatientDashboard.tsx](src/features/analytics/components/PatientDashboard.tsx)
- `index.css`: [src/index.css](src/index.css)
- Previous story: [hardening-phase-a2-data-correctness.md](hardening-phase-a2-data-correctness.md) — `erasableSyntaxOnly`, no tests, carry-forward pattern

---

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story workflow)

### Debug Log References

- `npm run build` → `tsc -b && vite build` passed: 783 modules transformed, 0 TypeScript errors. Pre-existing chunk-size (>500 kB) warning is unrelated to this story.

### Completion Notes List

- **B1 (AC #1):** Added `@keyframes spin` + `.spinner` class to `index.css` (after `.fade-up`). Inserted `<div className="spinner" aria-hidden="true" />` above `.empty-text` in `LoadingSpinner.tsx`. `aria-busy="true"` / `aria-live="polite"` preserved; the visible "Cargando…" text remains for screen readers and reduced-motion users; the ring is decorative (`aria-hidden`).
- **B2 (AC #2):** Changed the `initials` truthiness guard in `AppShell.tsx` from `neurologist?.name` to `neurologist?.name?.trim()`. Now `null`, `undefined`, `""`, and whitespace-only names all fall back to `'?'`.
- **B3 (AC #3):** Session rows in `SessionHistory.tsx` now have `role="button"`, `tabIndex={0}`, and `onKeyDown` firing `navigate` on Enter/Space (with `e.preventDefault()` on Space to block page scroll). Visible focus ring provided by the global `[role="button"]:focus-visible` CSS rule.
- **B4 (AC #4):** Extracted static inline style objects to module-level consts: `SESSION_ROW_STYLE` in `SessionHistory.tsx`; `DASHBOARD_CONTAINER_STYLE`, `HEADER_ROW_STYLE`, `SESSION_ROW_STYLE` in `PatientDashboard.tsx`. Used `import type React from 'react'` (type-only, no runtime import) for `React.CSSProperties`. No `useMemo` (constants don't depend on props/state). Cell-level styles left inline per story guidance.
- **CSS:** Added `[role="button"]:focus-visible` outline rule (keyboard-only focus indicator) alongside the spinner styles.
- **AC #5:** `npm run build` passes with 0 TypeScript errors.
- No test files added — project has no test infrastructure (MVP); verification via build + AC review per Dev Notes.

### File List

- `src/index.css` — added `@keyframes spin`, `.spinner`, `[role="button"]:focus-visible` (B1, B3/CSS)
- `src/shared/components/LoadingSpinner.tsx` — added animated spinner ring (B1)
- `src/shared/components/AppShell.tsx` — `trim()` guard on `initials` (B2)
- `src/features/analytics/components/SessionHistory.tsx` — keyboard nav + `SESSION_ROW_STYLE` const (B3, B4)
- `src/features/analytics/components/PatientDashboard.tsx` — module-level style consts (B4)

### Review Findings

- [x] [Review][Defer] `[role="button"]:focus-visible` selector is globally scoped — any future third-party component with `role="button"` inherits this focus outline; a scoped class would be safer [src/index.css:1257] — deferred, spec-prescribed implementation; only current usage is session rows
- [x] [Review][Defer] `PatientDashboard` session rows have no keyboard interaction despite receiving `SESSION_ROW_STYLE` — B3 AC text scopes to "session history list" (`SessionHistory.tsx`); PatientDashboard rows are read-only (no navigate on click) [src/features/analytics/components/PatientDashboard.tsx:107] — deferred, out of B3 scope per spec; rows are not interactive by design

## Change Log

| Date | Change |
|------|--------|
| 2026-06-01 | Story created — Hardening Phase B visual design: spinner animation, initials guard, keyboard navigation, style object stability. Status → ready-for-dev. |
| 2026-06-01 | Implemented B1–B4 + focus-visible CSS. Build green (0 TS errors). Status → review. |
| 2026-06-01 | Code review complete. 2 deferred findings written above. Status → done. |
