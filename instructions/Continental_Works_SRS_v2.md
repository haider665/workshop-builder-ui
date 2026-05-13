# CONTINENTAL WORKS
## Workshop Management Platform
### System Requirements Specification (SRS) — Revised Draft 2.0

---

| Field | Value |
|---|---|
| **Prepared For** | Continental Works |
| **Prepared By** | Dotech Development Team |
| **Document Type** | Master SRS — Point of Truth for Product and Engineering |
| **Version** | Draft 2.0 |
| **Status** | Working Baseline |
| **Supersedes** | Master SOW+SRS Draft 1.0 and all earlier drafts |
| **Tech Stack** | Backend: Frappe Framework \| Frontend: Next.js (TypeScript) |
| **Phase** | Phase 1 — Core Platform (Parts Division deferred to Phase 2) |

> ⚠️ **This document supersedes all earlier drafts, flow diagrams, and verbal agreements. Where any prior document conflicts with this SRS, this document is the authoritative source of truth until formally revised by both parties in writing.**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision and Strategic Objectives](#2-product-vision-and-strategic-objectives)
3. [Core Design Principles](#3-core-design-principles)
4. [Platform Architecture](#4-platform-architecture)
5. [Scope Boundaries](#5-scope-boundaries)
6. [Cross-Cutting Functional Requirements](#6-cross-cutting-functional-requirements)
7. [Module Specifications](#7-module-specifications)
8. [Core Data Model Overview](#8-core-data-model-overview)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Phase 2 — Parts Division](#10-phase-2--parts-division-separate-contract)
- [Annex A — Role Matrix](#annex-a--role-matrix)
- [Annex B — State Machines](#annex-b--state-machines)
- [Annex C — Dynamic Form Field Types](#annex-c--dynamic-form-field-types)
- [Annex D — Custom API Endpoint Overview](#annex-d--custom-api-endpoint-overview)

---

## 1. Executive Summary

Continental Works is a configurable, multi-shop workshop management platform built to digitise the full vehicle service lifecycle — from gate entry through task execution, customer communication, and final delivery. The platform is not a fixed workflow application. It is a builder-driven operating system where an Application Admin composes each workshop (shop) from configurable task templates, dynamic forms, roles, users, and bays without requiring engineering changes.

The system serves two primary categories of users: administrative users who configure and supervise the platform (Admin, Job Controller, CRO), and operational users who execute assigned work (Technicians, Service Advisors, Engineers, and any custom role the admin creates). All operational roles are optional and workspace-configurable. The Guard role handles gate access control. The Job Controller is the central orchestration role who creates jobs, assigns tasks, manages dependencies, and controls the gatepass lifecycle.

Phase 1 delivers the full core platform excluding the Parts Division. Phase 2 delivers the Parts Division as a separately contracted extension.

---

## 2. Product Vision and Strategic Objectives

The platform must support multiple workshop types — Auto Shop, Paint Shop, Body Shop, Quick Service, Diagnostics, and hybrid models — through a single configurable engine. A workshop in this context is called a **Shop**. Each Shop has its own task templates, dynamic form fields, bays, and assigned users. An organisation can have N number of Shops simultaneously active.

### 2.1 Strategic Objectives

- Increase daily vehicle throughput by reducing waiting time, handover lag, and underutilisation of bays and staff.
- Provide real-time operational visibility into every active vehicle, task, status, dependency, and bay state.
- Support different process structures for different shop types without rebuilding the product.
- Preserve full traceability for every gate action, task assignment, status transition, comment, attachment, and customer communication event.
- Enable performance measurement through F1 rate tracking and employee task history.

### 2.2 Core Product Outcomes

- Configurable shops, roles, and task forms without engineering intervention.
- Real-time task visibility for Job Controller and role-based task visibility for operational users.
- Structured customer communication via WhatsApp through a CRO interface.
- Gate access controlled by system-driven job and gatepass status.
- Auditable employee and vehicle records across all historical jobs.

---

## 3. Core Design Principles

### 3.1 Admin as Application Superuser

The Application Admin is the only fixed, mandatory role. Admin has full access across all modules, shops, users, and configurations. Admin can perform the work of any operational role and intervene on any record with full audit trail. All system configuration flows through Admin.

### 3.2 All Operational Roles are Admin-Created and Optional

Roles such as Service Advisor, Technician, and CRO are not hard-coded. Admin creates roles by name. Admin then creates users and assigns one or more roles to each user. A user can be assigned to multiple shops. A shop can be operated without some roles if the workflow does not require them. No operational role is universally mandatory.

### 3.3 Shop-First, Task-Driven Architecture

Every job is rooted in a Shop. Every Shop has Task Templates. Every Task Template has a dynamic form built from configurable fields. The Job Controller selects a Shop when creating a job, and the shop's tasks appear for assignment. The system does not have a global fixed task list — tasks are shop-specific and form-defined.

### 3.4 Job Controller as the Central Orchestrator

The Job Controller is the most important operational role. All job creation, task assignment, bay allocation, technician scheduling, dependency management, gatepass approval, and test drive initiation flows through the Job Controller. No job can exist without a Job Controller creating it.

### 3.5 Traceability by Default

Every material event — gate entry, task assignment, status change, comment, attachment, WhatsApp message, gatepass approval — must be recorded with actor identity, role, timestamp, and affected entity. This audit trail is immutable once written.

---

## 4. Platform Architecture

### 4.1 Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend Framework | Frappe Framework | Custom App: `continental_works` |
| Frontend | Next.js (TypeScript) | Headless — consumes Frappe APIs only |
| Database | MariaDB | Managed by Frappe |
| Authentication | Frappe JWT / Session | Role-based access per Frappe RBAC |
| File Storage | Frappe File Manager | S3-compatible configuration optional |
| Email | SMTP (Client-provided) | Frappe Email Queue used for delivery |
| WhatsApp | Client-provided API | CRO sends via in-app interface |
| API Protocol | REST (Frappe auto-generated + custom whitelisted endpoints) | Next.js consumes all APIs |

### 4.2 Multi-Shop Architecture

The platform supports N number of Shops under one organisation. Each Shop is independently configured with its own task templates, form fields, bays, and role assignments. Data is scoped to shops where appropriate — a technician assigned to Paint Shop sees only Paint Shop tasks unless also assigned to other shops.

### 4.3 Platform Targets

| Role(s) | Primary Device |
|---|---|
| Admin, Job Controller, CRO | Desktop |
| Guard | Tablet |
| Technicians and operational users | Tablet |
| All roles | Mobile responsive web (calendar and notifications) |

---

## 5. Scope Boundaries

### 5.1 In Scope — Phase 1

- Application Admin module — shop, bay, task template, form builder, role, user management, F1 configuration
- Guard module — vehicle entry logging, exit status check
- CRO module — customer registration, vehicle registration, appointment management, WhatsApp communication
- Job Controller module — job creation, task assignment, bay allocation, user availability engine, dependency management, gatepass approval, test drive management
- User Task Dashboard — task list, dynamic form submission, status actions, comments, attachments, calendar
- Notification system — email on task assignment and status change (Frappe Email Queue + client SMTP)
- Vehicle history — full service history per vehicle
- Employee records — task history, performance data per user
- F1 Rate tracking and reporting

### 5.2 In Scope — Phase 2 (Separate Contract)

- Parts Division — Purchase, Vendor Management, Counter Desk, Inventory, Estimator, Parts Accounts views

### 5.3 Explicitly Out of Scope

- Frappe / ERPNext built-in frontend — Next.js is the only UI
- Native mobile applications — responsive web only
- Full ERP or accounting system replacement
- OEM DMS integration, telematics, IoT hardware, or AI/ML features
- Customer self-service booking portal
- Payment processing or invoice generation

---

## 6. Cross-Cutting Functional Requirements

### 6.1 Authentication and Session Management

- **FR-AUTH-001.** The system SHALL authenticate users via Frappe's JWT-based authentication consumed by Next.js.
- **FR-AUTH-002.** The system SHALL restrict all API endpoints to authenticated users. Unauthenticated requests SHALL receive a 401 response.
- **FR-AUTH-003.** The system SHALL enforce role-based access control at the API level. Hidden UI elements alone are not sufficient access control.
- **FR-AUTH-004.** The system SHALL redirect unauthenticated users to the login page on all protected routes.
- **FR-AUTH-005.** The system SHALL support session invalidation on logout, clearing all stored tokens.

### 6.2 Audit Trail

- **FR-AUD-001.** The system SHALL record every material action with actor identity, role, timestamp, affected record, and action type.
- **FR-AUD-002.** Audit records SHALL be immutable once written. No user including Admin may delete audit entries.
- **FR-AUD-003.** Audit records SHALL cover: gate entry/exit, job creation, task creation and assignment, task status changes, comments, file uploads, gatepass approval, test drive initiation, WhatsApp messages sent, and F1 flag events.

### 6.3 Notifications

- **FR-NOT-001.** The system SHALL send an email notification to all users assigned to a task when that task is created or assigned.
- **FR-NOT-002.** The system SHALL send an email notification to the Job Controller when any task's status changes.
- **FR-NOT-003.** Email delivery SHALL use the client-provided SMTP credentials via Frappe Email Queue.
- **FR-NOT-004.** The system SHALL display in-app notifications for relevant events per logged-in user.
- **FR-NOT-005.** Notifications SHALL include vehicle registration number, shop name, task name, and current status to enable quick context.

---

## 7. Module Specifications

---

### 7.1 Admin Module

#### Overview

The Admin module is the configuration and governance layer of the entire platform. Admin is the only mandatory, fixed role. All platform configuration — shops, bays, task templates, form fields, roles, and users — is managed here. Admin can also view all operational data across all shops and intervene on any record.

#### 7.1.1 Shop Management

- **FR-ADM-001.** Admin SHALL be able to create, edit, activate, and deactivate Shops.
- **FR-ADM-002.** Each Shop SHALL have: name, type (Auto / Paint / Body / Quick Service / Diagnostics / Custom), description, and status (Active / Inactive).
- **FR-ADM-003.** The system SHALL support N number of active shops simultaneously.
- **FR-ADM-004.** Deactivating a shop SHALL not delete its historical data or affect active jobs in that shop.

#### 7.1.2 Bay Management

- **FR-ADM-005.** Admin SHALL be able to create, edit, and deactivate Bays within a Shop.
- **FR-ADM-006.** Each Bay SHALL have: name, assigned shop (link), and status (Available / Occupied / Inactive).
- **FR-ADM-007.** The system SHALL support N number of bays per shop.
- **FR-ADM-008.** Bay availability SHALL be dynamically derived from active task assignments occupying that bay in a given time window.

#### 7.1.3 Task Template and Dynamic Form Builder

> This is the most critical Admin configuration feature. Admin defines what tasks exist in each shop and what information is captured during task execution.

- **FR-ADM-009.** Admin SHALL be able to create Task Templates linked to a specific Shop.
- **FR-ADM-010.** Each Task Template SHALL have: name, shop (link), description, and an ordered list of form fields.
- **FR-ADM-011.** Admin SHALL be able to add, remove, and reorder form fields within a Task Template.
- **FR-ADM-012.** Each form field SHALL support the following types: Text Input, Text Area, Number, Checkbox (single), Checkbox Group (multiple options), Radio Button Group (single selection from options), Dropdown (single selection), Date Picker, Image Upload, File Upload.
- **FR-ADM-013.** For Checkbox Group, Radio Button Group, and Dropdown fields, Admin SHALL be able to define the list of selectable options.
- **FR-ADM-014.** Each form field SHALL have: label, field type, options list (where applicable), required flag (yes/no), and display order.
- **FR-ADM-015.** Admin SHALL be able to preview the rendered form as it will appear to an operational user before saving.
- **FR-ADM-016.** Editing a Task Template SHALL not retroactively alter form field values already submitted against existing job tasks.

#### 7.1.4 Role Management

- **FR-ADM-017.** Admin SHALL be able to create custom roles by name (e.g. Service Advisor, Technician, CRO, Paint Technician).
- **FR-ADM-018.** Admin SHALL be able to edit role names and deactivate roles.
- **FR-ADM-019.** The following roles are system-level and cannot be deleted: Admin, Guard, Job Controller.
- **FR-ADM-020.** Each role SHALL have configurable permissions at module and action level.

#### 7.1.5 User Management

- **FR-ADM-021.** Admin SHALL be able to create, edit, activate, deactivate, and suspend user accounts.
- **FR-ADM-022.** Each user SHALL have: full name, email, mobile number, role(s) (one or more), assigned shop(s) (one or more), and password.
- **FR-ADM-023.** A user may hold multiple roles simultaneously.
- **FR-ADM-024.** A user may be assigned to multiple shops simultaneously.
- **FR-ADM-025.** The system SHALL use the user's assigned roles and shops to determine task assignment eligibility in the Job Controller scheduling interface.

#### 7.1.6 F1 Rate Configuration

- **FR-ADM-026.** Admin SHALL be able to configure the F1 return window in days (N days). This is the period within which a returning vehicle with the same issue is flagged as an F1 failure.
- **FR-ADM-027.** Admin SHALL be able to view F1 reports filterable by date range (monthly, yearly), shop, and individual user.
- **FR-ADM-028.** The F1 report SHALL display: total tasks completed, F1 success count (value = 1), F1 failure count (value = 0), and F1 rate percentage.
- **FR-ADM-029.** Admin SHALL be able to drill down from the F1 report to individual task records.

#### 7.1.7 Admin Operational Visibility

- **FR-ADM-030.** Admin SHALL have access to all active jobs, tasks, and statuses across all shops.
- **FR-ADM-031.** Admin SHALL be able to intervene on any record — update status, reassign users, or add comments — with mandatory reason capture.
- **FR-ADM-032.** All Admin interventions SHALL be logged in the audit trail with reason, timestamp, and original state.

---

### 7.2 Guard Module

#### Overview

The Guard module is a deliberately simple, single-purpose interface for gate access control. The Guard does not create jobs, does not manage appointments, and does not perform approvals. The Guard logs vehicle entry and checks exit eligibility by registration number.

#### 7.2.1 Vehicle Entry

- **FR-GRD-001.** The Guard interface SHALL allow a Guard user to log a vehicle entry by entering the vehicle registration number.
- **FR-GRD-002.** On entry, the system SHALL check if a matching vehicle record exists. If found, it SHALL display the customer name and any active appointment for confirmation before logging entry.
- **FR-GRD-003.** The system SHALL log every entry event with registration number, Guard identity, and timestamp.
- **FR-GRD-004.** The system SHALL prevent duplicate active entry records for the same registration number.

#### 7.2.2 Vehicle Exit Check

- **FR-GRD-005.** The Guard interface SHALL allow a Guard user to check exit eligibility by entering the vehicle registration number.
- **FR-GRD-006.** The system SHALL retrieve the linked job's current status for the entered registration number.
- **FR-GRD-007.** The Guard interface SHALL display a clear **ALLOWED EXIT** indicator when the job status is `Job Finished` or `Test Drive Approved`.
- **FR-GRD-008.** The Guard interface SHALL display a clear **BLOCKED EXIT** indicator with reason when the job is still active or no approved gatepass state exists.
- **FR-GRD-009.** When status is `Test Drive Approved`, the interface SHALL additionally display: driver name, NID number, and expected return time.
- **FR-GRD-010.** The system SHALL log every exit check attempt — both allowed and blocked — with Guard identity, timestamp, status at time of check, and outcome.
- **FR-GRD-011.** The Guard interface SHALL be optimised for tablet use — large text input, large status display, minimal navigation.

---

### 7.3 CRO Module (Customer Representative Officer)

#### Overview

The CRO is the front-desk administrative role responsible for customer and vehicle registration, appointment management, and structured customer communication via WhatsApp. CRO is an admin-created role — it exists only in shops that require it.

#### 7.3.1 Customer Management

- **FR-CRO-001.** The CRO interface SHALL allow creation of customer records containing: full name, primary phone number, secondary phone number, email address, WhatsApp number, and communication preference.
- **FR-CRO-002.** The system SHALL prevent duplicate customer records with the same primary phone number or email.
- **FR-CRO-003.** CRO SHALL be able to search customers by name, phone number, or email.
- **FR-CRO-004.** CRO SHALL be able to edit customer records and view the customer's full vehicle and appointment history.

#### 7.3.2 Vehicle Management

- **FR-CRO-005.** CRO SHALL be able to register vehicles containing: registration number, VIN, make, model, variant, year, colour, fuel type, transmission type, and linked customer.
- **FR-CRO-006.** The system SHALL prevent duplicate vehicle records with the same active registration number.
- **FR-CRO-007.** CRO SHALL be able to search vehicles by registration number or customer name.
- **FR-CRO-008.** CRO SHALL be able to update the odometer reading at each visit.

#### 7.3.3 Appointment Management

- **FR-CRO-009.** CRO SHALL be able to create appointments linked to a customer and vehicle, containing: appointment date and time, appointment type (Pre-booked / Walk-in), stated concerns (free text), and notes.
- **FR-CRO-010.** CRO SHALL be able to view, filter, and search appointments by date, status, and customer.
- **FR-CRO-011.** Appointment status SHALL progress through: `Draft` → `Confirmed` → `Vehicle Arrived` → `Job Created` → `Cancelled`.
- **FR-CRO-012.** When a Guard logs vehicle entry, the system SHALL attempt to match the registration number to a Confirmed appointment and update its status to `Vehicle Arrived`.
- **FR-CRO-013.** CRO SHALL be able to cancel an appointment with a mandatory reason.

#### 7.3.4 WhatsApp Communication

- **FR-CRO-014.** The CRO interface SHALL include a WhatsApp messaging panel accessible from customer and appointment records.
- **FR-CRO-015.** The system SHALL provide pre-built message templates for common scenarios: appointment confirmation, vehicle arrival confirmation, and service update.
- **FR-CRO-016.** CRO SHALL be able to compose, preview, and send WhatsApp messages via the client-provided WhatsApp API.
- **FR-CRO-017.** The system SHALL log every WhatsApp message sent, including sender identity, recipient number, message content, timestamp, and delivery status returned by the API.
- **FR-CRO-018.** Message templates SHALL be manageable by Admin.

---

### 7.4 Job Controller Module

#### Overview

The Job Controller is the central operational role. This module handles all job creation, task assignment, resource scheduling (users and bays), task dependency management, gatepass approval, and test drive management. No job exists without a Job Controller creating it.

#### 7.4.1 Job Controller Dashboard

- **FR-JC-001.** The Job Controller dashboard SHALL display all active vehicles in the workshop with their current job status.
- **FR-JC-002.** The dashboard SHALL show: vehicle registration number, customer name, arrival time, active shop(s), overall job status, and number of tasks by status.
- **FR-JC-003.** The dashboard SHALL provide real-time or near-real-time task status updates without requiring a full page refresh.
- **FR-JC-004.** Job Controller SHALL receive in-app and email notification when any task's status changes.

#### 7.4.2 Job Creation

- **FR-JC-005.** Job Controller SHALL be able to create a Job for any vehicle that has a logged Guard entry.
- **FR-JC-006.** Job creation SHALL allow selection of one or more Shops. The tasks from all selected shops are available for addition to the job.
- **FR-JC-007.** The job form SHALL display all Task Templates from the selected shop(s) for the Job Controller to select which tasks are required.
- **FR-JC-008.** Each job SHALL be linked to: vehicle, appointment (if exists), selected shop(s), and the creating Job Controller.
- **FR-JC-009.** A vehicle SHALL not have more than one active job at a time.

#### 7.4.3 Task Assignment

- **FR-JC-010.** For each task added to a job, Job Controller SHALL configure: planned start time, planned end time, assigned bay, and assigned user(s).
- **FR-JC-011.** The system SHALL display only users with roles eligible for the selected task and who have no conflicting task assignments in the specified time window (availability engine).
- **FR-JC-012.** The availability engine SHALL compute user availability by checking all existing task assignments for the requested time slot.
- **FR-JC-013.** The system SHALL display available bays for the selected shop and time window.
- **FR-JC-014.** Bay availability SHALL be computed by checking all existing task assignments occupying that bay in the requested time window.
- **FR-JC-015.** A single task MAY be assigned to multiple users simultaneously.
- **FR-JC-016.** Each task SHALL have an initial status of `Assigned` upon creation.

#### 7.4.4 Task Dependencies

- **FR-JC-017.** Job Controller SHALL be able to define dependency relationships between tasks within the same job. Supported type: Task B cannot start until Task A is complete (Finish-to-Start).
- **FR-JC-018.** The system SHALL prevent a dependent task from being started by an assigned user if its prerequisite task is not in `Completed` status.
- **FR-JC-019.** Job Controller SHALL be able to override a dependency block and manually unblock a dependent task with a mandatory reason, recorded in the audit trail.
- **FR-JC-020.** The job detail view SHALL clearly display the dependency chain and which tasks are currently blocked by a dependency.
- **FR-JC-021.** Tasks with no dependencies SHALL be immediately startable upon assignment.

#### 7.4.5 Gatepass Approval

- **FR-JC-022.** When all tasks in a job reach `Completed` status, the system SHALL notify the Job Controller that the job is ready for gatepass approval.
- **FR-JC-023.** Job Controller SHALL be able to review the job summary and approve the gatepass, which sets the job status to `Job Finished`.
- **FR-JC-024.** `Job Finished` status is the signal that allows the Guard to permit vehicle exit.
- **FR-JC-025.** Job Controller SHALL NOT be able to approve a gatepass while any task remains in a non-Completed status, unless they manually override with recorded reason.

#### 7.4.6 Test Drive Management

- **FR-JC-026.** Job Controller SHALL be able to initiate a Test Drive for a vehicle by creating a test drive record containing: driver full name, driver NID number, driver photo (upload), vehicle registration number, and expected return time.
- **FR-JC-027.** Initiating a test drive SHALL set the job status to `Test Drive Approved`.
- **FR-JC-028.** `Test Drive Approved` status is the signal that allows the Guard to permit vehicle exit for test drive purposes.
- **FR-JC-029.** When the vehicle returns from a test drive, Job Controller SHALL be able to log the return and reset the job status to its prior active state.

---

### 7.5 User Task Dashboard

#### Overview

The User Task Dashboard is the primary interface for all operational users — Technicians, Service Advisors, Engineers, and any custom role. It displays their assigned tasks, allows status updates, form submission, comments, and attachments. This interface is role-agnostic — the same dashboard serves all operational roles with data filtered to the logged-in user's assignments.

#### 7.5.1 Task List

- **FR-TSK-001.** The task dashboard SHALL display all tasks assigned to the logged-in user, grouped by status: Assigned, In Progress, Pending, Completed.
- **FR-TSK-002.** Each task card SHALL display: task name, vehicle registration number, shop name, bay name, planned start time, planned end time, and current status.
- **FR-TSK-003.** The system SHALL visually flag tasks where the planned end time has passed but status is not Completed (overdue indicator).

#### 7.5.2 Task Detail View

- **FR-TSK-004.** Opening a task SHALL display: full task information, vehicle details, customer name, shop name, bay, planned time, assigned users, current status, and dependency status (if blocked).
- **FR-TSK-005.** The task detail view SHALL render the dynamic form defined by the Task Template, with all configured field types displayed correctly.
- **FR-TSK-006.** The system SHALL allow the user to fill and save form field values. Partial saves SHALL be supported — the user does not need to complete all fields before saving progress.
- **FR-TSK-007.** Image upload fields SHALL allow the user to capture or upload photos directly from the task detail view.
- **FR-TSK-008.** Submitted form values SHALL be persisted and remain visible on subsequent views of the task.

#### 7.5.3 Task Status Actions

- **FR-TSK-009.** The following status transitions SHALL be available to assigned users from the task detail view:
  - `Assigned` → `In Progress` (Start action)
  - `In Progress` → `Pending` (Mark Pending action — requires reason)
  - `Pending` → `In Progress` (Resume action)
  - `In Progress` → `Completed` (Complete action)
- **FR-TSK-010.** The system SHALL validate that only allowed status transitions are available. Invalid transitions SHALL not be presented to the user.
- **FR-TSK-011.** Marking a task as Pending SHALL require the user to enter a reason (free text). This reason SHALL be recorded in the audit trail.
- **FR-TSK-012.** A task that is blocked by a dependency SHALL display the blocking task name and status. The Start action SHALL be disabled until the dependency is resolved or overridden by Job Controller.
- **FR-TSK-013.** Job Controller SHALL also be able to update any task's status from the job detail view, with the same validation rules applying.

#### 7.5.4 Comments and Attachments

- **FR-TSK-014.** Any assigned user SHALL be able to add comments to a task. Comments SHALL display author name, role, timestamp, and content.
- **FR-TSK-015.** Any assigned user SHALL be able to upload file attachments (images, documents) to a task, separate from form field image uploads.
- **FR-TSK-016.** All comments and attachments SHALL be visible to all users with access to the task, including Job Controller and Admin.

#### 7.5.5 Read-Only Calendar

- **FR-TSK-017.** Each user SHALL have access to a personal calendar view showing all tasks assigned to them displayed as time blocks.
- **FR-TSK-018.** The calendar SHALL support month view and week view.
- **FR-TSK-019.** Each calendar block SHALL display: task name, vehicle registration number, shop name, and bay name.
- **FR-TSK-020.** Clicking a calendar block SHALL navigate to the task detail view.
- **FR-TSK-021.** The calendar is read-only. Users cannot create, move, or resize calendar blocks.

---

### 7.6 Vehicle History

- **FR-VH-001.** The system SHALL maintain a full service history for every vehicle across all jobs.
- **FR-VH-002.** Vehicle history SHALL be searchable by registration number or VIN.
- **FR-VH-003.** The vehicle history view SHALL display: all past jobs in chronological order, each job's shops and tasks, task statuses and completion dates, assigned users per task, submitted form values, attachments, and F1 outcomes.
- **FR-VH-004.** Vehicle history SHALL be accessible to: Admin, Job Controller, and CRO.
- **FR-VH-005.** Vehicle history records are read-only. They cannot be edited except by Admin intervention with audit trail.

---

### 7.7 Employee Records

- **FR-EMP-001.** The system SHALL maintain a task history record for every user showing all tasks they have been assigned to across all jobs and shops.
- **FR-EMP-002.** The employee record SHALL display: task name, vehicle, shop, planned time, actual start time, actual end time, time taken vs planned time, final status, and F1 outcome for completed tasks.
- **FR-EMP-003.** Employee records SHALL be accessible to: Admin and Job Controller.
- **FR-EMP-004.** Each user SHALL be able to view their own employee record.
- **FR-EMP-005.** The employee record SHALL include summary metrics: total tasks assigned, total tasks completed, average time vs benchmark, and F1 rate contribution.

---

### 7.8 F1 Rate Tracking

F1 Rate measures whether a vehicle was serviced correctly the first time. An F1 value of **1** means the task was completed and the vehicle did not return for the same issue within the configured return window. An F1 value of **0** means the vehicle returned for the same issue within N days, indicating a first-fix failure.

- **FR-F1-001.** Every completed task SHALL be assigned an initial F1 value of 1 upon completion.
- **FR-F1-002.** When a vehicle returns and a new job is created containing the same task type within the Admin-configured N-day return window, Job Controller or Admin SHALL be able to link the new job's task to the original task and flag it as an F1 failure (value = 0).
- **FR-F1-003.** The system SHALL assist identification of potential F1 returns by alerting Job Controller when a vehicle arrives with a job created within N days of a prior completed job for the same vehicle.
- **FR-F1-004.** F1 records SHALL store: original task (link), return task (link), return date, flagging user, and F1 value.
- **FR-F1-005.** F1 reports SHALL be filterable by: date range, shop, and individual user.
- **FR-F1-006.** F1 reports SHALL display: total tasks, F1 successes (value = 1), F1 failures (value = 0), and F1 rate as a percentage.
- **FR-F1-007.** Admin SHALL be able to configure the return window (N days) globally. This configuration SHALL apply to all new F1 evaluations from the date of change.

---

## 8. Core Data Model Overview

All entities are implemented as Frappe DocTypes within the `continental_works` custom app. Frappe auto-generates REST CRUD endpoints for all DocTypes. Custom business logic is added via Frappe Controller classes and whitelisted API methods.

| DocType | Key Fields | Notes |
|---|---|---|
| `CW Shop` | name, type, description, status | Master config entity |
| `CW Bay` | name, shop (link), status | Child of Shop |
| `CW Task Template` | name, shop (link), description | Defines available tasks per shop |
| `CW Task Field` | task_template (link), label, field_type, options, required, order | Child table of Task Template |
| `CW Customer` | full_name, phone, email, whatsapp_number, comm_preference | — |
| `CW Vehicle` | registration_no, VIN, make, model, year, colour, customer (link), odometer | Unique on reg_no |
| `CW Appointment` | customer (link), vehicle (link), date, type, concerns, status | Status state machine |
| `CW Job` | vehicle (link), appointment (link), status, created_by | One active job per vehicle |
| `CW Job Task` | job (link), task_template (link), shop (link), bay (link), status, planned_start, planned_end, actual_start, actual_end, pending_reason | Core execution entity |
| `CW Task Assignment` | job_task (link), user (link), role_at_assignment | Many users per task |
| `CW Task Field Value` | job_task (link), task_field (link), value, file | Dynamic form responses |
| `CW Task Comment` | job_task (link), user (link), comment, timestamp | — |
| `CW Task Attachment` | job_task (link), file, uploaded_by, timestamp | Separate from form images |
| `CW Guard Log` | vehicle (link), job (link), action (Entry/Exit/Blocked), guard_user, timestamp | Immutable audit log |
| `CW Test Drive` | job (link), driver_name, driver_nid, driver_photo, expected_return, return_logged_at | — |
| `CW WhatsApp Log` | customer (link), sender_user, recipient_number, message, timestamp, delivery_status | — |
| `CW F1 Record` | original_task (link), return_task (link), f1_value (0/1), return_date, flagged_by | — |

---

## 9. Non-Functional Requirements

| ID | Requirement | Category |
|---|---|---|
| NFR-001 | All API endpoints SHALL enforce role-based access control at the server level. UI-level hiding is supplementary only. | Security |
| NFR-002 | The platform SHALL prevent cross-shop data access. A user assigned to Shop A cannot access Shop B data unless also assigned to Shop B. | Security |
| NFR-003 | Passwords SHALL be stored using Frappe's built-in hashing. Plain-text passwords SHALL never be stored. | Security |
| NFR-004 | The Guard exit check interface SHALL return a result within 2 seconds under normal network conditions. | Performance |
| NFR-005 | The Job Controller dashboard SHALL load active job data within 3 seconds under normal conditions. | Performance |
| NFR-006 | The platform SHALL function correctly on Chrome, Firefox, Safari, and Edge (latest two versions each). | Compatibility |
| NFR-007 | All operational interfaces SHALL be usable on tablet devices (minimum 768px width) without horizontal scrolling. | Usability |
| NFR-008 | The Guard interface SHALL be optimised for single-handed tablet use with large touch targets. | Usability |
| NFR-009 | Audit records SHALL be preserved indefinitely and SHALL NOT be purged by any automated process. | Data Integrity |
| NFR-010 | The system SHALL maintain data integrity when concurrent users update the same task simultaneously — last-write-wins with timestamp logging. | Data Integrity |
| NFR-011 | File uploads SHALL support JPEG, PNG, PDF, and DOCX formats. Maximum file size per upload: 10MB. | File Handling |
| NFR-012 | Email delivery failures SHALL be logged in Frappe's Email Queue and retried automatically per Frappe's retry policy. | Reliability |

---

## 10. Phase 2 — Parts Division (Separate Contract)

The Parts Division is explicitly out of scope for Phase 1 and will be delivered under a separate contract as Phase 2. The following is a high-level scope statement for planning purposes only. A detailed SRS for Phase 2 will be produced as a separate document before Phase 2 commences.

**Phase 2 Scope Summary:**

- Purchase Module — PO creation, vendor invoice preview, GRN-based receiving
- Vendor Management — vendor list, ratings, lead-time tracking, new vendor registration
- Counter Desk — requisition review, approve/reject handover, proof of handover capture
- Inventory Module — part records, stock states, supersession and interchangeability, search and filter
- Estimator Module — job-wise parts estimation, price comparison (OEM/Genuine/Aftermarket), Send to Advisor flow
- Parts Accounts Views — financial reports, General Ledger visibility, Chart of Accounts
- Parts readiness integration into job and task blocking logic

---

## Annex A — Role Matrix

| Role | Fixed / Created By | Can Create Jobs | Can Assign Tasks | Can Approve Gatepass | Can Configure System |
|---|---|---|---|---|---|
| Admin | Fixed / System | Yes | Yes | Yes | Yes — Full |
| Guard | Fixed / System | No | No | No | No |
| Job Controller | Fixed / System | Yes | Yes | Yes | No |
| CRO | Admin-created | No | No | No | No |
| Service Advisor | Admin-created (opt) | No | No | No | No |
| Technician | Admin-created (opt) | No | No | No | No |
| Service Engineer | Admin-created (opt) | No | No | No | No |
| Custom Role (any) | Admin-created | No | No | No | No |

---

## Annex B — State Machines

### B.1 Task Status State Machine

| From State | To State | Action | Who Can Trigger |
|---|---|---|---|
| (none) | Assigned | Task created by Job Controller | Job Controller |
| Assigned | In Progress | User starts the task | Assigned User, Job Controller |
| In Progress | Pending | User marks pending (reason required) | Assigned User, Job Controller |
| Pending | In Progress | User resumes task | Assigned User, Job Controller |
| In Progress | Completed | User marks complete | Assigned User, Job Controller |
| Any | Any | Admin override (reason required) | Admin only |

### B.2 Job Status State Machine

| From State | To State | Trigger |
|---|---|---|
| (none) | Active | Job Controller creates the job |
| Active | Test Drive Approved | Job Controller initiates test drive |
| Test Drive Approved | Active | Job Controller logs vehicle return |
| Active | Job Finished | Job Controller approves gatepass (all tasks Completed) |
| Job Finished | Active | Admin reopens job (audit trail required) |

### B.3 Appointment Status State Machine

| From State | To State | Trigger |
|---|---|---|
| Draft | Confirmed | CRO confirms appointment |
| Confirmed | Vehicle Arrived | Guard logs entry for matching vehicle |
| Vehicle Arrived | Job Created | Job Controller creates a job linked to this appointment |
| Any | Cancelled | CRO cancels with reason |

---

## Annex C — Dynamic Form Field Types

| Field Type | Description | Options Configurable | Stored Value |
|---|---|---|---|
| Text Input | Single-line free text | No | String |
| Text Area | Multi-line free text | No | String |
| Number | Numeric input only | No | Number |
| Checkbox | Single true/false toggle | No | Boolean |
| Checkbox Group | Multiple selection from defined options | Yes | Array of selected values |
| Radio Button Group | Single selection from defined options | Yes | Single selected value |
| Dropdown | Single selection from dropdown list | Yes | Single selected value |
| Date Picker | Date selection | No | Date string (ISO 8601) |
| Image Upload | One or more image file uploads | No | File reference(s) |
| File Upload | Any file type upload (PDF, DOCX, etc.) | No | File reference(s) |

---

## Annex D — Custom API Endpoint Overview

> Frappe auto-generates standard CRUD REST endpoints for all DocTypes. The following are custom whitelisted API methods required beyond standard CRUD. Full API contract (request payloads, response shapes, error codes) will be produced as a separate API specification document during Sprint 1.

| Endpoint | Method | Module | Description |
|---|---|---|---|
| `get_available_users_for_slot` | GET | Job Controller | Returns users available (no conflicting task) for a role, shop, and time window |
| `get_available_bays_for_slot` | GET | Job Controller | Returns bays available in a shop for a given time window |
| `create_job_with_tasks` | POST | Job Controller | Creates job and all its tasks in a single transaction |
| `approve_gatepass` | POST | Job Controller | Sets job status to Job Finished after all task validation |
| `initiate_test_drive` | POST | Job Controller | Creates test drive record and sets job status to Test Drive Approved |
| `log_test_drive_return` | POST | Job Controller | Logs vehicle return and resets job status |
| `guard_entry` | POST | Guard | Logs vehicle entry, matches to appointment if exists |
| `guard_exit_check` | GET | Guard | Returns exit eligibility and status details for a registration number |
| `send_whatsapp_message` | POST | CRO | Sends message via client WhatsApp API and logs the event |
| `update_task_status` | POST | Task Dashboard | Validates and applies task status transition with audit logging |
| `submit_task_field_values` | POST | Task Dashboard | Saves dynamic form field values for a job task |
| `get_my_tasks` | GET | Task Dashboard | Returns tasks assigned to logged-in user grouped by status |
| `get_my_calendar` | GET | Task Dashboard | Returns task assignments for logged-in user in a date range |
| `get_vehicle_history` | GET | History | Returns full job and task history for a vehicle |
| `get_employee_record` | GET | Records | Returns full task history and metrics for a user |
| `flag_f1_return` | POST | F1 | Links a return task to original task and sets F1 value to 0 |
| `get_f1_report` | GET | F1 | Returns F1 summary and drill-down data with filters |

---

*This document defines the complete functional and non-functional requirements baseline for Continental Works Phase 1. It supersedes all earlier drafts, verbal agreements, and flow diagrams. Any feature not described in this document is out of scope for Phase 1 unless a formal written change request is agreed by both parties. This document should be used by all product, engineering, QA, and implementation team members as the working point of truth until a formally revised version is issued.*
