# Continental Works — Project Progress Summary (UI-only)

**Date:** 2026-05-16  
**Repo:** workshop-builder-ui (Vite + React + TypeScript + MUI)  
**MVP constraint:** In-memory only (refresh clears data). No backend/API.

---

## 1) What’s implemented (high level)

- Role-based routing via `react-router-dom` + `RequireAuth` / `RequireRole`.
- Zustand store as in-memory “DB” for shops, bays, roles, users, customers, vehicles, appointments, pending vehicles, jobs, tasks.
- Admin CRUD screens for core configuration.
- Guard Entry + Exit Check flow (tablet-ish UI).
- CRO flows: customers/vehicles/appointments + walk-in resolution.
- Job Creation (JC) flows: pending queue → create job + tasks → job details.
- Task execution UX: My Tasks board + task detail form + task calendar.
- Records pages: vehicle history + employee records.

---

## 2) Data model + store work

### Types (src/types/cw.ts)
- `CWAppointment` now supports assignment metadata:
  - `assignedRoleId?: string`
  - `assignedUserIds: string[]`
- `CWJob` now stores linkage to upstream entities:
  - `pendingVehicleId?: string`
  - `appointmentId?: string`

### Store logic (src/store/cwStore.ts)
- Appointment create/update validates:
  - role exists (if provided)
  - user IDs exist
  - if role selected → users must include that role
- Job creation persists:
  - `pendingVehicleId` (when created from queue)
  - `appointmentId` derived from pending vehicle (if linked)
- When job created from a pending vehicle linked to appointment:
  - pending vehicle status updated
  - appointment status can move to “Job Created” (depending on flow)

---

## 3) Pages — current behavior (per route)

### Public
- `/login` (src/pages/LoginPage.tsx)
  - Demo login: choose name + toggle roles.
  - Session stored in-memory (no token).

### Shell / Routing
- App root (src/routes/AppRouter.tsx)
  - Routes grouped by role: Admin / Guard / CRO / Job Creation / Tasks / Records.

### Admin
- `/admin` (src/pages/admin/AdminHome.tsx)
  - Hub cards linking to setup pages.
- `/admin/shops` (src/pages/admin/ShopsPage.tsx)
  - Create/edit shops; activate/deactivate.
- `/admin/bays` (src/pages/admin/BaysPage.tsx)
  - Create bays; assign to shop; toggle status.
- `/admin/task-templates` (src/pages/admin/TaskTemplatesPage.tsx)
  - Create templates + fields.
  - Field types supported: text/textarea/number/checkbox/group/radio/dropdown/date/image/file.
  - Reorder fields, preview fields, activate/deactivate template.
- `/admin/roles` (src/pages/admin/RolesPage.tsx)
  - Create/manage roles.
- `/admin/users` (src/pages/admin/UsersPage.tsx)
  - Create/manage users; assign roles + shops; status.
- `/admin/f1` (src/pages/admin/F1Page.tsx)
  - Configure F1 return window + report view (UI-only).

### Guard
- `/guard` (src/pages/guard/GuardHome.tsx)
  - Entry flow:
    - enter registration → confirm → create `pendingVehicles` record.
    - if vehicle exists: tries auto-link to latest active appointment and marks appointment “Vehicle Arrived”.
    - if vehicle not found: creates temporary pending entry (`isTemporary`).
  - Exit check:
    - blocks exit for active job.
    - allows exit for “Test Drive Approved” or “Job Finished”.

### CRO
- `/cro` (src/pages/cro/CroHome.tsx)
  - Walk-ins list (temporary pending vehicles).
  - Detects “existing vehicle” by matching registration.
  - Resolve walk-in flows:
    - Existing vehicle/customer → create appointment → resolve pending vehicle.
    - New vehicle → 3-step forms:
      1) Create customer
      2) Create vehicle
      3) Create appointment + resolve pending vehicle
- `/cro/customers` (src/pages/cro/CustomersPage.tsx)
  - Create customer + search; duplicate phone/email blocked by store.
- `/cro/customers/:customerId` (src/pages/cro/CustomerDetailPage.tsx)
  - Customer detail view (info + linked vehicles).
- `/cro/vehicles` (src/pages/cro/VehiclesPage.tsx)
  - Register vehicle + search.
  - Supports deep-link preselect customer via querystring.
- `/cro/vehicles/:vehicleId` (src/pages/cro/VehicleDetailPage.tsx)
  - Vehicle detail view (vehicle + customer context).
- `/cro/appointments` (src/pages/cro/AppointmentsPage.tsx)
  - Create appointment:
    - pick customer + vehicle
    - optional scheduledAt, concerns, notes
    - optional gate entry link (known entries only)
    - status select
    - assignment: role (optional) + users (optional, filtered by role)
  - Appointment list:
    - search
    - inline status update
    - inline gate entry link update
- `/cro/whatsapp` (src/pages/cro/WhatsappPage.tsx)
  - UI placeholder for WhatsApp-related workflows (UI-only).

### Job Creation (JC)
- `/jc` (src/pages/jc/JobControllerHome.tsx)
  - JC module home.
- `/jc/pending-vehicles` (src/pages/jc/PendingVehiclesPage.tsx)
  - Queue view from Guard entries.
  - Shows appointment chip/status if `appointmentId` present.
  - “Create Job” opens job creation page with `pendingVehicleId`.
- `/jc/jobs/new` (src/pages/jc/NewJobPage.tsx)
  - Build job with tasks from templates.
  - Handles planned time window, dependencies, ordering.
  - Prefill behavior (when opened from pending vehicle with linked appointment):
    - prefill task role/users from appointment assignment (role/users) when adding task.
    - filters prefilled users by shop + role compatibility.
- `/jc/jobs/:jobId` (src/pages/jc/JobDetailsPage.tsx)
  - Job overview + tasks table.
  - Status transitions include Test Drive dialog.
  - Dependency override flow with reason.
  - Shows “Linked appointment” panel when job has `appointmentId` or can resolve via `pendingVehicleId`.

### Tasks (Operational users)
- `/tasks` (src/pages/tasks/TasksHome.tsx)
  - “My Tasks” board grouped by status.
  - MVP helper: create a task directly from template for quick testing.
- `/tasks/:taskId` (src/pages/tasks/TaskDetailPage.tsx)
  - Task execution form:
    - dynamic fields rendering
    - status changes (Assigned/In Progress/Pending/Completed)
    - pending reason + dependency info where applicable
- `/calendar` (src/pages/tasks/CalendarPage.tsx)
  - Task calendar with month/week modes.
  - Visual blocks per task with time range, shop/bay, blocked indicator.

### Records
- `/vehicle-history` + `/vehicle-history/:registrationNo` (src/pages/records/*)
  - UI for vehicle history lookup and detail.
- `/employee-records` + `/employee-records/:userId` (src/pages/records/*)
  - UI for employee records list and detail.

### Notifications
- `/notifications` (src/pages/NotificationsPage.tsx)
  - Notifications page (UI-only).

---

## 4) Recent fixes / stability

- Fixed TypeScript build issue in JC Job Details: removed duplicate `roleNameById` declaration.

---

## 5) Known gaps / next requested work

- CRO dashboard “side panel calendar” for appointments not implemented yet (requested next).
- No persistence layer (by design for Phase 1 UI-only MVP).
