# Continental Works — UI Development Plan (UI-only, Phase 1)

**Date:** 2026-05-13  
**Scope:** Frontend/UI only for Phase 1 as defined in the SRS. No backend/Frappe work in this plan.

> Note on stack: The SRS references Next.js, but this repo is a Vite + React + TypeScript UI. This plan assumes we continue with the current Vite/React UI for now, while keeping the same API-driven architecture and role-based access patterns.

---

## 1) Goals, Non-Goals, and Assumptions

### Goals
- Build the complete **Phase 1 UI**: Admin, CRO, Guard, Job Controller, User Task Dashboard, Vehicle History, Employee Records, Notifications, and F1 reporting screens.
- Enforce **role-based UI access** (route guards + module visibility) consistent with the SRS role matrix.
- Implement **dynamic task forms** renderer (field types + required flags + partial save) driven by backend field definitions.
- Build **tablet-optimized Guard UI** and tablet-friendly operational UIs.
- Keep UI strictly within SRS scope (no extra modules/features).

### Non-Goals (explicit)
- No database or API implementation.
- No cross-service integrations (WhatsApp provider implementation, SMTP setup, etc.). UI only.
- No new workflows beyond SRS.
- No native mobile apps.
- No persistence beyond the current browser tab session (no LocalStorage/IndexedDB). This is an MVP constraint.

### Assumptions
- There is **no backend** initially.
- All data is stored **in-memory** (JS runtime) only. A hard refresh (Ctrl+Shift+R) clears all app data by design.
- We can still define API-shaped “service” functions so replacing the in-memory store with real HTTP later is straightforward.

---

## 2) UX/Module Boundaries (from SRS)

### Fixed system roles
- **Admin** (superuser)
- **Guard** (gate)
- **Job Controller** (orchestrator)

### Admin-created optional roles (examples)
- CRO, Technician, Service Advisor, Service Engineer, Custom Role

### Key state machines to reflect in UI
- **Task:** Assigned → In Progress → Pending ↔ In Progress → Completed (Admin override any with reason)
- **Job:** Active ↔ Test Drive Approved → Job Finished (Admin can reopen with audit reason)
- **Appointment:** Draft → Confirmed → Vehicle Arrived → Job Created → Cancelled

---

## 3) UI Architecture (Vite + React)

### Component library (MVP)
- Use **MUI (Material UI)** to deliver a modern, polished MVP quickly (layout, forms, tables, dialogs, icons).
- Prefer MUI theme + `sx` styling over ad-hoc CSS.

### Routing
- Use `react-router-dom` with route groups by module/role.
- Use a single `ProtectedRoute` wrapper that:
  - redirects unauthenticated users to `/login`
  - checks role access (UI-level)

### State management
- MVP constraint: there is no server state and **no backend**.
- Store everything **in-memory only** (JS runtime). Do **not** use LocalStorage/IndexedDB.
  - A hard refresh (`Ctrl+Shift+R`) clears all app data by design.
- Use a small in-memory store (recommended: Zustand) for:
  - auth session (current user/roles)
  - “database” entities (shops, bays, task templates, users, customers, vehicles, appointments, jobs, tasks)
- Do not persist to LocalStorage/IndexedDB so `Ctrl+Shift+R` clears everything.

### API layer
- No HTTP client in the MVP.
- Implement a typed “service layer” that reads/writes to the in-memory store (e.g., `services/admin.ts`, `services/jobs.ts`).
- Keep request/response shapes close to the SRS endpoint intent so a future backend swap is mechanical.

### Mocking strategy (UI-only development)
- MVP: treat the in-memory store as the source of truth.
- Seed demo data on app start (optional) to make the UI feel “alive”, but keep a clear “Reset app data” action for local testing.

### Cross-cutting UI primitives
- Layouts:
  - `AppShell` (sidebar + header)
  - `ModuleShell` per role (AdminShell, GuardShell, etc.)
- Shared components:
  - `DataTable`, `Form`, `FieldRenderer`, `StatusBadge`, `DateTime`, `FileUpload`, `ConfirmDialog`
- Shared utilities:
  - date/time formatting
  - file validation (type/size)

---

## 4) Route Map (UI)

### Public
- `/login`

### Admin
- `/admin`
- `/admin/shops`
- `/admin/bays`
- `/admin/task-templates`
- `/admin/roles`
- `/admin/users`
- `/admin/f1`

### CRO
- `/cro`
- `/cro/customers`
- `/cro/vehicles`
- `/cro/appointments`
- `/cro/whatsapp` (or accessed from customer/appointment detail)

### Guard
- `/guard` (single screen with Entry + Exit check flows; minimal navigation)

### Job Controller
- `/jc`
- `/jc/pending-vehicles`
- `/jc/jobs/new`
- `/jc/jobs/:jobId`

### User Task Dashboard (operational users)
- `/tasks`
- `/tasks/:taskId`
- `/calendar`

### Records
- `/vehicle-history`
- `/vehicle-history/:registrationNo`
- `/employee-records`
- `/employee-records/:userId`

### Notifications
- `/notifications` (optional page; bell in header)

---

## 5) Data Contracts (UI-facing)

> There is no backend in the MVP. The following contracts are still useful as *internal* service interfaces and future API shapes.

### Auth
- `POST /auth/login` → `{ token, user: { id, name, roles: string[], shops: string[] } }`
- `POST /auth/logout` → 204

MVP implementation note:
- Replace `token` with an in-memory session object; do not persist it.

### Admin config (examples)
- Shops: list/create/update
- Bays: list/create/update
- Task templates: list/create/update with ordered fields
- Users/Roles: list/create/update
- F1 config/report

### Job Controller
- pending vehicles
- create job (potentially create job + tasks in one call)
- availability endpoints:
  - users available for slot
  - bays available for slot
- dependencies management
- gatepass approval
- test drive initiate/return

### Task dashboard
- my tasks grouped by status
- task detail
- update task status
- submit field values (partial save)
- comments
- attachments
- calendar feed

### Records
- vehicle history
- employee record

---

## 6) Milestones (UI-only), with Acceptance Criteria

### Milestone 0 — Project foundation (UI)
**Output:** stable shell app with routing, auth scaffolding, and mocks.
- Add routing + layouts + protected routes
- Add in-memory store (auth + entities) and typed service layer
- Basic error boundary + empty/loading states

**Acceptance criteria**
- Unauthenticated user hitting a protected route is redirected to `/login`.
- Logged-in user can navigate to a role landing page based on their roles.
- Ctrl+Shift+R clears the session and all app data (no persistence).

---

### Milestone 1 — Design system & shared components
**Output:** reusable UI primitives for the rest of the app.
- AppShell + responsive sidebar/header
- StatusBadge (Task/Job/Appointment)
- DataTable + pagination placeholder
- Form components (text/textarea/number/select/checkbox/radio/date)
- File upload UI with type/size validation (10MB max)

**Acceptance criteria**
- Shared components render consistently across modules.
- File upload rejects invalid types/sizes client-side.

---

### Milestone 2 — Guard Module (tablet-first)
**Output:** simplest functional UI in the system.
- Single screen optimized for tablet:
  - vehicle registration input
  - “Entry” action → confirmation panel
  - “Exit Check” action → ALLOWED/BLOCKED result UI
- Show test drive details when status is `Test Drive Approved` (driver name/NID/expected return)

**Acceptance criteria**
- Large touch targets, minimal navigation.
- Exit result clearly communicates allowed/blocked + reason.

---

### Milestone 3 — CRO Module
**Output:** customer/vehicle/appointment management + WhatsApp composer UI.
- Customers: create/edit/search, detail view shows vehicle + appointment history
- Vehicles: register/search, update odometer at each visit
- Appointments: create/list/filter, status indicator
- WhatsApp:
  - message templates selection
  - compose/preview/send
  - message log UI

**Acceptance criteria**
- Duplicate-prevention is represented in UI (error messages on “duplicate phone/email/reg”).
- Appointment statuses follow the SRS state machine in UI.

---

### Milestone 4 — Admin Module (configuration core)
**Output:** shop/bay/task-template builder + roles/users UI.
- Shops CRUD
- Bays CRUD (scoped to shop)
- Task Templates:
  - create/edit template
  - add/remove/reorder fields
  - field types support **all SRS types**
  - options editor for checkbox-group/radio/dropdown
  - required flag
  - preview mode
  - edit behavior messaging: changes won’t retroactively change historical submissions (UI copy + UX)
- Roles & Users management screens
- F1 configuration page (return window N days)

**Acceptance criteria**
- Template builder can represent the complete field type matrix.
- Preview matches the operational Task Detail form rendering.

---

### Milestone 5 — Job Controller Module (core orchestration UI)
**Output:** dashboards + job creation + dependency + gatepass/test drive UIs.
- Dashboard listing active jobs/vehicles with counts by task status
- Pending vehicles screen (from guard entries)
- Create Job flow:
  - choose vehicle
  - select shop(s)
  - choose tasks from templates
  - for each task: planned time window, bay (availability UI), assign users (availability UI)
  - dependency management (Finish-to-Start)
- Job detail view:
  - tasks list with statuses, blocked indicators
  - override dependency unblock with reason
  - gatepass approval (only when all tasks completed; otherwise show blocked reason)
  - test drive initiation form + return logging

**Acceptance criteria**
- UI prevents invalid actions (e.g., gatepass approval when tasks not completed) while still allowing override flows where SRS permits.
- Dependencies are visible and blocks are clearly communicated.

---

### Milestone 6 — User Task Dashboard (operational)
**Output:** user task list + task detail execution UI.
- Task list grouped: Assigned / In Progress / Pending / Completed
- Overdue indicator when planned end time passed and not completed
- Task detail:
  - vehicle/shop/bay/time/assigned users
  - dependency block indicator
  - status actions with valid transitions only
  - pending reason input required
  - dynamic form renderer (partial save)
  - comments thread
  - attachments gallery + upload
- Calendar (read-only) month/week views; blocks link to task detail

**Acceptance criteria**
- Only valid transitions are shown per current state.
- Dynamic form supports partial save and reload of values.
- Calendar is read-only (no create/move/resize).

---

### Milestone 7 — Notifications UI
**Output:** in-app notification surface.
- Notification bell with list
- Mark-as-read
- (If backend is not ready) polling stubbed against mocks

**Acceptance criteria**
- Notifications include vehicle reg, shop, task, status.

---

### Milestone 8 — Records: Vehicle History & Employee Records
**Output:** read-only views for historical reporting.
- Vehicle history search by reg/VIN; timeline view with tasks, statuses, form values, attachments, F1 outcomes
- Employee record view:
  - task history
  - summary metrics placeholders

**Acceptance criteria**
- Views are read-only in UI.
- Data is filterable/searchable per SRS needs.

---

### Milestone 9 — F1 Reporting UI
**Output:** Admin F1 report screens.
- Filters: date range, shop, user
- Summary cards (total, F1=1, F1=0, rate %)
- Drill-down table to task records

**Acceptance criteria**
- Filters are wired and the drill-down navigation works.

---

## 7) Definition of Done (per milestone)
- Routes accessible only to correct roles (UI-level checks)
- Loading/empty/error states present
- Basic responsive behavior verified on tablet width (>=768px)
- No UI flows outside SRS
- Mocks/fixtures updated to match any contract changes

---

## 8) Suggested “Step-by-step” execution order
To proceed incrementally with minimal rework:
1. Milestone 0 (foundation) — minimal shell + in-memory store
2. Milestone 4 (Admin) — **first real product milestone**; defines shops/tasks/forms
3. Milestone 6 (Task Dashboard) — validates the dynamic form renderer against Admin templates
4. Milestone 5 (Job Controller) — orchestration and dependency logic
5. Milestone 2 (Guard) — integrates with job status/test drive UX
6. Milestone 3 (CRO) — customer/vehicle/appointment workflows
7. Milestones 7–9 (notifications + records + F1)

---

## 9) Open Questions (to resolve before implementing screens)
1. Confirm we will proceed with **Vite/React UI** (current repo) for Phase 1 UI, or whether a **Next.js migration** is required later.
2. Confirm initial role list and whether a user can hold multiple roles simultaneously (SRS says yes) and how role landing is chosen.
3. Confirm the API contract shapes (especially: create job + tasks transaction, availability endpoints, and dynamic form value storage).
