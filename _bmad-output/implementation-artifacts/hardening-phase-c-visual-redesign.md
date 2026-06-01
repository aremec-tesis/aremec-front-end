---
baseline_commit: ac57913bd50f03e25960542bbfa90bbaeddd7265
---

# Hardening Phase C: Visual Redesign — Port Prototype Layout to Production App

Status: done

## Story

As a neurologist using the clinical portal,
I want the application layout and page designs to match the final Figma prototype,
so that the UI structure, navigation, and page-level visual hierarchy are consistent with the agreed design.

## Context

The production app was built feature-by-feature over 4 epics and a hardening sprint. The visual foundation (CSS variables, card components, badge system) already exists and matches the prototype. However, the **page-level layout** diverges in several key areas:

| Area | Current | Prototype target |
|------|---------|-----------------|
| Topbar | None — title lives inside each page's `section-header` | Persistent topbar: page title + subtitle + LogoutButton on right |
| Sidebar nav | 1 section ("PRINCIPAL"), 1 item (Pacientes) | 3 sections: PRINCIPAL (Pacientes), MONITOREO (Sesión en Vivo), ANÁLISIS (Historial de Sesiones) |
| Patient list | Card grid (`patients-grid`) | Table with columns: PACIENTE, DIAGNÓSTICO, EDAD, ESTADO, ACCIONES |
| Patient profile header | Plain `section-header` with name | Header card with avatar + name + diagnosis + status badges + edit button |
| Session monitor | Stacked: metrics card → stream card | 2-col grid (stream left `3fr`, patient info right `2fr`) + metrics row below full width |
| Session history | None (only inline via patient profile historial tab) | Dedicated `/sessions/history` page with patient picker + table |

---

## Acceptance Criteria

1. **Topbar — persistent header** — Given any authenticated page is loaded, a topbar is visible at the top of the main content area showing the page title and subtitle on the left, and a logout button on the right. The topbar uses the `.topbar` CSS class. Moving the mouse or navigating does not lose the topbar. The LogoutButton is removed from the sidebar user section.

2. **Sidebar — three nav sections** — Given the authenticated layout loads, the sidebar shows three labeled sections: PRINCIPAL (Pacientes), MONITOREO (Sesión en Vivo), ANÁLISIS (Historial de Sesiones). Each nav item uses `.nav-item` with correct active state. "Sesión en Vivo" links to `/patients/{activePatientId}/session` when `activeSession.patientId` is set in the store; otherwise the item is rendered but visually muted (no pointer, no active route). "Historial de Sesiones" links to `/sessions/history`.

3. **Patient list — table layout** — Given the neurologist is on `/patients`, the patient list renders as a table (`<table>` inside `.table-wrap` inside `.card`). Columns: PACIENTE (avatar + name), DIAGNÓSTICO, EDAD, ESTADO (badge), ACCIONES (Dashboard button). Clicking any row or the Dashboard button navigates to `/patients/{id}`. Loading, error, and empty states are preserved.

4. **Patient profile — header card** — Given the neurologist is on `/patients/:id`, a header card appears above the tabs showing: patient avatar (initials, 56×56), full name (large), diagnosis label, status badge, age, and an Edit button (stub — navigates back, no edit route exists yet). The plain `section-header` with page title is removed.

5. **Session monitor — two-column layout** — Given the neurologist is on the session monitor page, the layout is: a 2-column grid where the left column (3fr) shows the VR stream card and the right column (2fr) shows a patient info card (name, diagnosis, current level info from `useSessionMetrics`). Below the grid, full width, is the existing `MetricsPanel` card. The `WsStatusIndicator` and the section header with `SessionCloseButton` remain at the top.

6. **Session history page** — Given the neurologist clicks "Historial de Sesiones" in the sidebar, a page at `/sessions/history` loads showing: a patient picker dropdown (from `usePatients()`) and, once a patient is selected, a table of their sessions using the existing `useSessionHistory` hook. Each row shows: fecha, SPS, clasificación, recomendación, estado. Clicking a row navigates to `/sessions/{sessionId}`. When no patient is selected, shows an `EmptyState`. Loading and error states are handled.

7. **Build green** — `npm run build` passes with 0 TypeScript errors after all changes.

---

## Tasks / Subtasks

- [x] **C1: Topbar component + AppShell wiring** (AC: #1)
  - [x] Create `src/shared/components/Topbar.tsx`:
    - Uses `useLocation()` from `react-router-dom` to determine current route
    - Static map `PAGE_TITLES` (keyed by path prefix) returns `{ title, sub }`:
      ```ts
      const PAGE_TITLES: Array<{ match: (p: string) => boolean; title: string; sub: string }> = [
        { match: p => p === '/patients' || p === '/patients/',         title: 'Gestión de Pacientes',  sub: 'Registro, consulta y edición de pacientes' },
        { match: p => p === '/patients/new',                           title: 'Nuevo Paciente',         sub: 'Complete los datos clínicos iniciales' },
        { match: p => /^\/patients\/[^/]+\/session/.test(p),           title: 'Sesión en Vivo',         sub: 'Monitoreo en tiempo real' },
        { match: p => /^\/patients\/[^/]+$/.test(p),                   title: 'Dashboard del Paciente', sub: 'Métricas, historial y análisis cognitivo' },
        { match: p => p.startsWith('/sessions/history'),               title: 'Historial de Sesiones',  sub: 'Registro cronológico de sesiones inmersivas' },
        { match: p => /^\/sessions\/[^/]+$/.test(p),                   title: 'Detalle de Sesión',      sub: '' },
      ]
      ```
    - Resolves to first matching entry; falls back to `{ title: 'AREMEC', sub: '' }`
    - Renders:
      ```tsx
      <div className="topbar">
        <div>
          <div className="page-title">{title}</div>
          {sub && <div className="page-sub">{sub}</div>}
        </div>
        <div className="topbar-actions">
          <LogoutButton />
        </div>
      </div>
      ```
  - [x] Modify `src/shared/components/AppShell.tsx`:
    - Import `Topbar`
    - Add `<Topbar />` as the first child of `.main` (before `<ActiveSessionBanner />`)
    - Remove `<LogoutButton />` and its container `<div style={{ marginLeft: 'auto' }}>` from the sidebar user section

- [x] **C2: Sidebar nav expansion** (AC: #2)
  - [x] Modify `src/shared/components/AppShell.tsx` sidebar `<nav>`:
    - Keep existing PRINCIPAL section with Pacientes `NavLink`
    - Add MONITOREO section:
      ```tsx
      <div className="nav-label">MONITOREO</div>
      {activePatientId ? (
        <NavLink
          to={`/patients/${activePatientId}/session`}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">◉</span>
          Sesión en Vivo
        </NavLink>
      ) : (
        <div className="nav-item nav-item-muted">
          <span className="nav-icon">◉</span>
          Sesión en Vivo
        </div>
      )}
      ```
    - Add ANÁLISIS section:
      ```tsx
      <div className="nav-label">ANÁLISIS</div>
      <NavLink
        to="/sessions/history"
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <span className="nav-icon">◫</span>
        Historial de Sesiones
      </NavLink>
      ```
    - Get `activePatientId` from store: `const activePatientId = useAppStore(s => s.activeSession.patientId)`
  - [x] Add `.nav-item-muted` CSS to `src/index.css` (after `.nav-item:hover` rules):
    ```css
    .nav-item-muted {
      opacity: 0.4;
      cursor: default;
      pointer-events: none;
    }
    ```

- [x] **C3: PatientList — table layout** (AC: #3)
  - [x] Modify `src/features/patients/components/PatientList.tsx`:
    - Replace `<div className="patients-grid">` with a table structure:
      ```tsx
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PACIENTE</th>
                <th>DIAGNÓSTICO</th>
                <th>EDAD</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="patient-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                        {p.name.trim()[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {DIAGNOSIS_LABEL[p.diagnosis] ?? p.diagnosis}
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{p.age} años</td>
                  <td>
                    <span className={`badge ${p.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                      {p.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate(`/patients/${p.id}`)}
                    >
                      Dashboard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      ```
    - Add `import { useNavigate } from 'react-router-dom'` and `DIAGNOSIS_LABEL` const (same values as PatientCard/PatientProfilePage)
    - Remove import of `PatientCard` (no longer used)
    - Keep loading/error/empty states unchanged at top of component

- [x] **C4: PatientListPage — remove section-header, move button to search row** (AC: #3, visual)
  - [x] Modify `src/features/patients/pages/PatientListPage.tsx`:
    - Remove the `<div className="section-header">` block (which contained `<div className="page-title">Pacientes</div>` and the "+ Nuevo paciente" button)
    - Move the `<button className="btn btn-primary" onClick={() => navigate('/patients/new')}>+ Nuevo paciente</button>` to the end of the `.search-row` div (after the select)
    - Result: search row has [search input] [status filter select] [+ Nuevo paciente button]

- [x] **C5: PatientProfilePage — header card + remove section-header** (AC: #4)
  - [x] Modify `src/features/patients/pages/PatientProfilePage.tsx`:
    - Remove the `<div className="section-header"><h1 className="page-title">{patient.name}</h1></div>` block
    - Above the `<div className="tabs">`, insert a patient header card:
      ```tsx
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="patient-avatar" style={{ width: 56, height: 56, fontSize: 20 }}>
            {patient.name.trim()[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{patient.name}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
                {patient.age} años
              </span>
              <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                {DIAGNOSIS_LABEL[patient.diagnosis] ?? patient.diagnosis}
              </span>
              <span className={`badge ${patient.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                {patient.status === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>
      </div>
      ```

- [x] **C6: SessionMonitorPage — two-column layout** (AC: #5)
  - [x] Modify `src/features/sessions/pages/SessionMonitorPage.tsx`:
    - Add import: `import { usePatient } from '../../patients/hooks/usePatient'`
    - Get patient data: `const { data: patient } = usePatient(patientId ?? '')`
    - Replace the two stacked card divs with a 2-col grid + full-width metrics card:
      ```tsx
      {/* 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, marginBottom: 20 }}>
        {/* Left: VR stream */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <CloudflareStreamPlayer streamId={CF_STREAM_ID ?? ''} />
        </div>
        {/* Right: patient info */}
        <div className="card">
          <div className="card-label">PACIENTE EN SESIÓN</div>
          {patient ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div className="patient-avatar" style={{ width: 44, height: 44, fontSize: 15 }}>
                  {patient.name.trim()[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{patient.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                    {DIAGNOSIS_LABEL[patient.diagnosis] ?? patient.diagnosis}
                  </div>
                </div>
              </div>
              <span className={`badge ${patient.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                {patient.status === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--mono)', marginTop: 8 }}>
              Cargando paciente…
            </div>
          )}
        </div>
      </div>

      {/* Full-width metrics */}
      <div className="card">
        <MetricsPanel sessionId={sessionId} />
      </div>
      ```
    - Add `DIAGNOSIS_LABEL` const to the file (same values as other components)
    - Remove the old stacked card structure

- [x] **C7: SessionHistoryPage — new page** (AC: #6)
  - [x] Create `src/features/sessions/pages/SessionHistoryPage.tsx`:
    ```tsx
    import { useState } from 'react'
    import { useNavigate } from 'react-router-dom'
    import { usePatients } from '../../patients/hooks/usePatients'
    import { useSessionHistory } from '../../analytics/hooks/useSessionHistory'
    import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
    import { ErrorMessage } from '../../../shared/components/ErrorMessage'
    import { EmptyState } from '../../../shared/components/EmptyState'
    import { formatDate, formatNumber } from '../../../shared/utils/format'

    const REC_LABEL: Record<string, string> = {
      increase_difficulty: 'Aumentar dificultad',
      maintain_difficulty: 'Mantener dificultad',
      decrease_difficulty: 'Reducir dificultad',
    }

    export default function SessionHistoryPage() {
      const navigate = useNavigate()
      const [selectedPatientId, setSelectedPatientId] = useState('')
      const { data: patients, isPending: loadingPatients } = usePatients()
      const { data: sessions, isPending: loadingSessions, error } = useSessionHistory(selectedPatientId)

      return (
        <div className="page">
          <div className="search-row">
            <select
              className="input"
              style={{ width: 280 }}
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
            >
              <option value="">Selecciona un paciente…</option>
              {!loadingPatients && patients?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {!selectedPatientId && (
            <EmptyState message="Selecciona un paciente para ver su historial de sesiones" />
          )}

          {selectedPatientId && loadingSessions && <LoadingSpinner />}
          {selectedPatientId && error && <ErrorMessage error={error} />}
          {selectedPatientId && !loadingSessions && !error && sessions && sessions.length === 0 && (
            <EmptyState message="Sin sesiones registradas para este paciente" />
          )}

          {selectedPatientId && !loadingSessions && sessions && sessions.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>FECHA</th>
                      <th>SPS</th>
                      <th>CLASIFICACIÓN</th>
                      <th>RECOMENDACIÓN</th>
                      <th>ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.sessionId} onClick={() => navigate(`/sessions/${s.sessionId}`, { state: { patientId: selectedPatientId } })}>
                        <td><span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{formatDate(s.sessionDate, { dateStyle: 'medium' })}</span></td>
                        <td><span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{formatNumber(s.sps, 1)}</span></td>
                        <td>
                          <span className={`badge ${s.spsClass === 'high' ? 'badge-green' : s.spsClass === 'medium' ? 'badge-warn' : 'badge-gray'}`}>
                            {s.spsClass ?? '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                          {s.recommendation ? (REC_LABEL[s.recommendation] ?? s.recommendation) : '—'}
                        </td>
                        <td>
                          <span className={`badge ${s.status === 'complete' ? 'badge-green' : 'badge-warn'}`}>
                            {s.status === 'complete' ? 'Completada' : 'Incompleta'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )
    }
    ```
  - [x] Note: `useSessionHistory` requires a truthy `patientId`. Pass `selectedPatientId` only when it's non-empty — the hook's internal query should be disabled when `patientId` is `''`. Verify the hook handles empty string by checking `useSessionHistory` — if it always fires, pass a conditional: use `useSessionHistory(selectedPatientId || null)` or similar based on the hook's implementation.

- [x] **C8: Router — add SessionHistoryPage route** (AC: #6)
  - [x] Modify `src/router/index.tsx`:
    - Import `SessionHistoryPage`
    - Add `{ path: 'sessions/history', element: <SessionHistoryPage /> }` to the authenticated children (after `sessions/:id`)

- [x] **C9: SessionDetailPage — remove section-header** (AC: #1, visual consistency)
  - [x] Modify `src/features/sessions/pages/SessionDetailPage.tsx`:
    - Remove the `<div className="section-header"><button...>← Volver</button><h1...>Detalle de sesión</h1></div>` block
    - Replace with just the back button as a standalone element before `<MetricDetailTable />`:
      ```tsx
      <button
        onClick={() => navigate(backPath)}
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 16 }}
      >
        ← Volver
      </button>
      ```

- [x] **C10: Verify build** (AC: #7)
  - [x] Run `npm run build`
  - [x] Confirm 0 TypeScript errors

---

## Dev Notes

### Critical Constraints (carry-forward)

- `erasableSyntaxOnly: true` — no enums, no constructor parameter properties
- No test files — project has no test infrastructure. Verification via `npm run build` + AC review
- `import type React from 'react'` for `React.CSSProperties` (not runtime `import React`)

### `useSessionHistory` empty-string guard

The hook at `src/features/analytics/hooks/useSessionHistory.ts` uses `patientId` as a React Query key. If it always fires (no `enabled: !!patientId` guard), passing `''` may trigger a 404. **Before implementing C7**, read `useSessionHistory.ts` and check if it has an `enabled` guard. If not, pass `selectedPatientId` only when truthy, or add the guard inside the hook (since we're modifying the analytics hooks area).

### `DIAGNOSIS_LABEL` duplication

Three files now share `DIAGNOSIS_LABEL`. Do NOT extract to a shared constant in this story — the story scope is visual layout only. Three separate declarations is acceptable for now.

### `usePatient` hook in SessionMonitorPage

`usePatient` takes a `string` ID. The `patientId` from `useParams` can be `undefined` if the route doesn't match, but `SessionMonitorPage` already redirects when `sessionId` is absent. Pass `patientId ?? ''` — the query won't fire for an empty string if the hook uses standard React Query `enabled` patterns.

### Sidebar "Sesión en Vivo" when no active session

When `activePatientId` is `null`/`undefined`/empty, render the nav item as `.nav-item-muted` (disabled, no pointer events) rather than hiding it. This preserves the visual structure from the prototype where the nav items are always visible.

### CSS additions

Only `.nav-item-muted` is new. All other classes (`.topbar`, `.table-wrap`, `table`, `th`, `td`, `.patient-avatar`, `.card-label`, etc.) already exist in `index.css`.

### PatientCard

`PatientCard.tsx` is no longer imported after C3. Do NOT delete it — it may be reused in future stories. Just remove the import from `PatientList.tsx`.

### Files to modify in this story

```
src/
  index.css                                          ← MODIFY: add .nav-item-muted
  router/
    index.tsx                                        ← MODIFY: add sessions/history route
  shared/
    components/
      AppShell.tsx                                   ← MODIFY: topbar + sidebar expansion + remove LogoutButton from sidebar
      Topbar.tsx                                     ← CREATE: page title + sub + logout
  features/
    patients/
      components/
        PatientList.tsx                              ← MODIFY: replace card grid with table
      pages/
        PatientListPage.tsx                          ← MODIFY: remove section-header, add button to search-row
        PatientProfilePage.tsx                       ← MODIFY: remove section-header, add header card
    sessions/
      pages/
        SessionMonitorPage.tsx                       ← MODIFY: 2-col layout + patient info card
        SessionDetailPage.tsx                        ← MODIFY: remove section-header, keep back button
        SessionHistoryPage.tsx                       ← CREATE: patient picker + sessions table
```

---

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story workflow)

### Debug Log References

- `npm run build` → `tsc -b && vite build` passed: 784 modules transformed (was 783, +1 SessionHistoryPage), 0 TypeScript errors. Pre-existing chunk-size (>500 kB) warning unrelated.
- `npm run lint` → 6 pre-existing errors (`react-hooks/set-state-in-effect`) in `NeurologistDashboard.tsx` (old prototype, untouched), `ActiveSessionBanner.tsx` (untouched), and `PatientProfilePage.tsx` lines 31/36/41 (pre-existing useEffect blocks — NOT modified by this story; only JSX header card was added). All files created/modified by this story lint clean (verified by running eslint on them in isolation — zero output).

### Completion Notes List

- **C1 (AC #1):** Created `Topbar.tsx` — resolves page title/subtitle from `useLocation().pathname` via an ordered `PAGE_TITLES` matcher array (static segments matched before dynamic via regex order), renders `.topbar` with title/sub on left and `LogoutButton` on right. Wired as first child of `.main` in `AppShell`. Removed `LogoutButton` + its wrapper from the sidebar user section.
- **C2 (AC #2):** Expanded sidebar nav to three sections — PRINCIPAL (Pacientes), MONITOREO (Sesión en Vivo), ANÁLISIS (Historial de Sesiones). "Sesión en Vivo" links to `/patients/{activePatientId}/session` when `activeSession.patientId` is set; otherwise rendered as `.nav-item-muted` (disabled, no pointer events). Added `.nav-item-muted` CSS rule after `.nav-item.active`.
- **C3 (AC #3):** Rewrote `PatientList.tsx` from card grid to a table (`.table-wrap` > `table`) inside a `.card`. Columns: PACIENTE (avatar+name), DIAGNÓSTICO, EDAD, ESTADO (badge), ACCIONES (Dashboard button with `stopPropagation`). Row click + button both navigate to `/patients/{id}`. Loading/error/empty states preserved. `PatientCard` import removed (component kept on disk for future reuse).
- **C4 (AC #3):** `PatientListPage` — removed `section-header`; moved "+ Nuevo paciente" button into `.search-row` after the status filter. (Page title now lives in the persistent Topbar.)
- **C5 (AC #4):** `PatientProfilePage` — removed `section-header`; added a header card above the tabs with 56×56 avatar, large name, age, diagnosis label, and status badge.
- **C6 (AC #5):** `SessionMonitorPage` — restructured into a `3fr / 2fr` grid: VR stream card left, patient-info card right (avatar, name, diagnosis, status — sourced from `usePatient(patientId)`). `MetricsPanel` moved below the grid as a full-width card. WsStatusIndicator + section-header with SessionCloseButton retained at top.
- **C7 (AC #6):** Created `SessionHistoryPage.tsx` — patient picker dropdown (`usePatients`) + sessions table (`useSessionHistory`, which has `enabled: !!patientId` so empty selection doesn't fire). Columns: fecha, SPS, clasificación, recomendación, estado. Row click navigates to `/sessions/{sessionId}` with `state.patientId`. Handles no-selection (EmptyState), loading, error, and empty-results states.
- **C8 (AC #6):** Router — registered `SessionHistoryPage` at `sessions/history`, placed before `sessions/:id`.
- **C9 (AC #1):** `SessionDetailPage` — removed `section-header`/page title; kept standalone "← Volver" back button (switched to `btn-ghost`).
- **AC #7:** `npm run build` passes with 0 TypeScript errors.
- No test files added — project has no test infrastructure (MVP); verification via build + lint + AC review per Dev Notes.
- **Scope note:** This story ports the page-level *layout/structure* of the original Figma prototype (`NeurologistDashboard.tsx`) onto the production routed app. The visual foundation (CSS vars, cards, badges, table styles) already matched; this closes the structural gap (topbar, full sidebar nav, table-based lists, header cards, two-column monitor, dedicated history page). Prototype features without backing data/endpoints in the current API (live SPS gauge, ML classification panel, notification bell, slope side-panel) were intentionally NOT fabricated.

### File List

- `src/index.css` — added `.nav-item-muted` (C2)
- `src/router/index.tsx` — registered `sessions/history` route (C8)
- `src/shared/components/Topbar.tsx` — **created**: page title/sub + logout (C1)
- `src/shared/components/AppShell.tsx` — topbar wiring, 3-section sidebar nav, removed sidebar logout (C1, C2)
- `src/features/patients/components/PatientList.tsx` — card grid → table (C3)
- `src/features/patients/pages/PatientListPage.tsx` — removed section-header, button into search-row (C4)
- `src/features/patients/pages/PatientProfilePage.tsx` — header card replaces section-header (C5)
- `src/features/sessions/pages/SessionMonitorPage.tsx` — two-column layout + patient info card (C6)
- `src/features/sessions/pages/SessionHistoryPage.tsx` — **created**: patient picker + sessions table (C7)
- `src/features/sessions/pages/SessionDetailPage.tsx` — removed section-header, kept back button (C9)

### Review Findings

- [x] [Review][Decision→Patch] Patient profile header avatar: changed to 2-char initials (same pattern as AppShell) [src/features/patients/pages/PatientProfilePage.tsx:56] — fixed
- [x] [Review][Patch] `SessionHistoryPage` `<tr>` rows lack keyboard navigation — added `role="button"`, `tabIndex={0}`, `onKeyDown` with Enter/Space + `e.preventDefault()` [src/features/sessions/pages/SessionHistoryPage.tsx:63] — fixed
- [x] [Review][Patch] `SessionHistoryPage` table renders simultaneously with `<ErrorMessage>` when stale cache exists — added `!error` guard to table condition [src/features/sessions/pages/SessionHistoryPage.tsx:49] — fixed
- [x] [Review][Defer] `usePatient('')` when `patientId` undefined with stale store session — requires route mismatch + stale `sessionId` in store simultaneously; `usePatient` `enabled: !!id` guard prevents the fetch but `SessionCloseButton` still receives `''` [src/features/sessions/pages/SessionMonitorPage.tsx:23] — deferred, requires route mismatch to trigger; route always provides patientId in normal flow
- [x] [Review][Defer] `Topbar` `PAGE_TITLES` match order is fragile — `/patients/new` beats the `patients/:id` regex now (correct), but a future reorder silently breaks the title [src/shared/components/Topbar.tsx:6] — deferred, latent only; not currently broken
- [x] [Review][Defer] Stale patient data briefly visible on patient switch in `SessionHistoryPage` — `isPending` is false on cache hit so spinner doesn't show; stale rows from prior patient flash until revalidation completes — deferred, React Query stale-while-revalidate by design
- [x] [Review][Defer] `p.name` null crash if API returns null for name field — `p.name.trim()` throws before optional chain activates when `name` is null — deferred, server contract violation; `Patient` type declares `name: string`
- [x] [Review][Defer] `formatDate` called with potentially null `sessionDate` from API in `SessionHistoryPage` — behavior depends on `formatDate` implementation [src/features/sessions/pages/SessionHistoryPage.tsx:70] — deferred, server contract violation
- [x] [Review][Defer] Cross-feature import: `SessionHistoryPage` reaches into `analytics/hooks/useSessionHistory` from `sessions` feature — deferred, MVP single-developer; refactor when feature isolation becomes relevant

## Change Log

| Date | Change |
|------|--------|
| 2026-06-01 | Story created — Hardening Phase C: visual redesign to match Figma prototype. Status → in-progress. |
| 2026-06-01 | Implemented C1–C9 (topbar, sidebar nav, table lists, header cards, 2-col monitor, session history page) + `.nav-item-muted` CSS. Build green (0 TS errors), modified files lint clean. Status → review. |
| 2026-06-01 | Code review complete. 1 decision-needed, 2 patches, 7 deferred findings written above. Status → in-progress. |
