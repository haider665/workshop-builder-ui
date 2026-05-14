#### **PHASE 0 — Environment & Foundation**

**Duration: 3 days** **Do not skip or rush this. Everything depends on it.**

**Day 1 — Backend Setup**

* Install Frappe Framework, create bench, create site  
* Create custom app: `continental_works`  
* Configure CORS so Next.js can talk to Frappe  
* Set up Frappe JWT authentication for API consumption  
* Create a test API endpoint, confirm Next.js can hit it and receive a response  
* Set up version control (Git) with two repos — one for Frappe app, one for Next.js

**Day 2 — Frontend Setup**

* Scaffold Next.js project with TypeScript  
* Set up folder structure: `/app` (pages), `/components`, `/lib` (API layer), `/hooks`, `/types`, `/store`  
* Configure Axios or Fetch wrapper with base URL, auth token injection, and error handling  
* Set up state management (Zustand or Context — keep it simple)  
* Set up Tailwind CSS  
* Build a login page that authenticates against Frappe and stores the session token  
* Confirm protected route works — unauthenticated user gets redirected to login

**Day 3 — Deployment Pipeline**

* Set up staging server (the client will need this for UAT)  
* Configure environment variables for both projects  
* Set up basic CI — push to main triggers deploy to staging  
* Document the local dev setup so you don't lose time later

---

#### **PHASE 1 — Core Data Model (DocTypes)**

**Duration: 2 days** **Build all DocTypes before building any UI. Schema changes mid-development are expensive.**

**Frappe DocTypes to create:**

*Master data:*

* `CW Shop` — name, type (Auto/Paint/Body/etc), status  
* `CW Bay` — name, shop (link), capacity, status  
* `CW Task Template` — name, shop (link), description  
* `CW Task Field` — task template (link), label, field type (Text/Checkbox/Radio/Image), options (for radio), required (checkbox), order  
* `CW Customer` — name, phone, email, whatsapp number, communication preference  
* `CW Vehicle` — registration number, VIN, make, model, year, colour, customer (link), odometer

*Operational data:*

* `CW Appointment` — customer (link), vehicle (link), date, type (Prebooked/Walkin), status, concerns (text), notes  
* `CW Job` — vehicle (link), appointment (link, optional), status (Active/Finished/Test Drive), created by, created date  
* `CW Job Task` — job (link), task template (link), shop (link), bay (link), assigned users (child table), status (Assigned/In Progress/Pending/Completed), planned start, planned end, actual start, actual end, pending reason  
* `CW Task Assignment` — job task (link), user (link), role at time of assignment  
* `CW Task Field Value` — job task (link), task field (link), value (text), file (attach, for images)  
* `CW Task Comment` — job task (link), user (link), comment, timestamp  
* `CW Task Attachment` — job task (link), file, uploaded by, timestamp  
* `CW Guard Log` — vehicle (link), job (link), action (Entry/Exit/Blocked), guard user, timestamp  
* `CW F1 Record` — job task (link), vehicle (link), status (1/0), return job (link, optional), flagged date

**After creating all DocTypes:**

* Set appropriate permissions per DocType (which roles can read/write/create)  
* Frappe auto-generates REST CRUD for all of these — test them in Postman before moving on

---

#### **PHASE 2 — Admin Module**

**Duration: 3 days**

This is the configuration layer everything else depends on. Build it first.

**Backend tasks:**

* Frappe user creation already exists — create a whitelisted API to wrap it with your role assignment logic  
* Write API: `create_shop` — creates CW Shop record  
* Write API: `create_bay` — creates CW Bay linked to shop  
* Write API: `create_task_template` — creates CW Task Template with its CW Task Fields as child records  
* Write API: `get_shop_config` — returns shop \+ its tasks \+ field definitions in one call  
* Leverage Frappe's Role and User DocTypes — you don't need to rebuild user management from scratch

**Next.js tasks (Admin UI):**

* Admin dashboard layout with sidebar navigation  
* Shop management page — create, list, edit shops  
* Bay management page — create bays, assign to shops, set status  
* Task Template builder page — this is the most complex Admin UI:  
  * Create task, add fields dynamically  
  * Field type selector (Text / Checkbox / Radio / Image)  
  * For Radio: add options inline  
  * Drag to reorder fields  
  * Preview mode showing how the form will look to a user  
* Role management page — create roles, list roles (wraps Frappe's role system)  
* User management page — create users, assign roles, assign to shops  
* This page needs an availability concept — when assigning a user to a shop, that's their home shop but they can be assigned to any shop's tasks

---

#### **PHASE 3 — CRO Module**

**Duration: 3 days**

**Backend tasks:**

* Write API: `create_customer` with duplicate phone/email check  
* Write API: `create_vehicle` with duplicate registration number check  
* Write API: `search_customer` — search by name or phone  
* Write API: `search_vehicle` — search by registration number  
* Write API: `create_appointment` — links customer, vehicle, date, concerns  
* Write API: `get_appointments` — filterable by date, status  
* Write API: `send_whatsapp_message` — wraps the client-provided WhatsApp API, logs the message

**Next.js tasks:**

* CRO dashboard  
* Customer registration form  
* Vehicle registration form with customer lookup  
* Appointment creation form — customer lookup → vehicle lookup → date, type, concerns  
* Appointment list with date filter and status indicator  
* WhatsApp message composer — template-based, sends via API, shows sent confirmation

---

#### **PHASE 4 — Guard Module**

**Duration: 1.5 days**

Simple module — build it fast.

**Backend tasks:**

* Write API: `guard_entry` — takes registration number, finds or creates a Guard Log entry record, links to active job if exists  
* Write API: `guard_exit_check` — takes registration number, returns: job status, car details, allowed (true/false), reason  
  * Allowed if job status is "Finished" or "Test Drive"  
  * Blocked otherwise with reason

**Next.js tasks:**

* Guard interface — single-purpose, big text input for registration number  
* Entry screen — type reg number, confirm entry, log created  
* Exit screen — type reg number, system shows large green ALLOWED or red BLOCKED with reason and car details  
* Keep this UI extremely simple — Guard is not technical, this screen may be used on a tablet at the gate

---

#### **PHASE 5 — Job Creation Module**

**Duration: 5 days — this is the most complex module**

**Backend tasks:**

* Write API: `get_pending_vehicles` — vehicles that have arrived (guard entry logged) but no active job yet  
* Write API: `create_job` — creates CW Job linked to vehicle/appointment  
* Write API: `add_job_task` — adds a CW Job Task to a job, with shop, task template, bay, planned time  
* Write API: `get_available_users_for_slot` — given a role, start time, and end time, returns users with no conflicting task assignments in that window. This is the availability engine.  
* Write API: `assign_users_to_task` — assigns one or more users to a job task  
* Write API: `get_bay_availability` — given a shop and time slot, returns bays that are free  
* Write API: `reorder_tasks` — updates task dependencies (Task B depends on Task A)  
* Write API: `approve_gatepass` — sets job status to Finished  
* Write API: `set_test_drive` — sets job status to Test Drive, captures driver info and expected return  
* Write API: `get_job_dashboard` — returns all active jobs with their tasks and statuses in one call

**Next.js tasks:**

* Job Creation dashboard — list of vehicles in workshop, status per vehicle  
* Create Job flow:  
  * Select vehicle from pending list  
  * Select shop(s)  
  * Task list auto-populates from shop's task templates  
  * For each task: select bay (shows availability), set planned time window, assign users (shows available users for that slot by role)  
  * Set task dependencies — drag or select "Task B starts after Task A"  
  * Submit creates the full job  
* Job detail view — see all tasks, their statuses, assigned users, bays  
* Task dependency management — ability to unblock a task and move to another  
* Test Drive initiation form — driver name, NID, expected return time  
* Gatepass approval button — appears when all tasks are Completed  
* Status update notifications panel — shows recent task status changes across all jobs

---

#### **PHASE 6 — User Task Dashboard**

**Duration: 3 days**

**Backend tasks:**

* Write API: `get_my_tasks` — returns tasks assigned to the logged-in user, grouped by status  
* Write API: `update_task_status` — changes status (In Progress / Pending / Completed), validates allowed transitions  
* Write API: `add_task_comment` — adds comment to a task  
* Write API: `upload_task_attachment` — uploads file/image against a task, uses Frappe's file upload  
* Write API: `submit_task_field_values` — saves the dynamic form field values for a task  
* Write API: `get_my_calendar` — returns all task assignments for the logged-in user across a date range, formatted for calendar display

**Next.js tasks:**

* User dashboard — tasks grouped into New, In Progress, Pending, Completed  
* Task detail page:  
  * Vehicle info, shop, bay, planned time  
  * Dynamic form rendered from field definitions — text inputs, checkboxes, radio buttons, image upload areas  
  * Status action buttons (Start, Mark Pending, Complete) — only valid transitions shown  
  * Pending reason input appears when marking Pending  
  * Comment thread  
  * Attachment gallery  
* Read-only calendar view (Google Calendar style):  
  * Month and week views  
  * Each task shows as a time block with task name, vehicle, bay  
  * Click block to go to task detail

---

#### **PHASE 7 — Notifications & Email**

**Duration: 1.5 days**

**Backend tasks:**

* Frappe has a built-in Email Queue — configure SMTP credentials from client  
* Write Frappe Document Event hooks:  
  * On CW Job Task `after_insert` → send email to assigned users  
  * On CW Job Task `on_update` (status change) → send email to Job Creation  
* Email templates — assignment notification, status change notification  
* These hooks go in `continental_works/hooks.py` and the controller files

**Next.js tasks:**

* In-app notification bell — polls for recent status changes relevant to logged-in user  
* Mark as read functionality

---

#### **PHASE 8 — Vehicle History & Employee Records**

**Duration: 1.5 days**

**Backend tasks:**

* Write API: `get_vehicle_history` — all jobs for a vehicle, with tasks, statuses, assigned users, dates  
* Write API: `get_employee_record` — all tasks a user has been assigned to, with completion status, time taken vs planned, F1 outcomes

**Next.js tasks:**

* Vehicle history page — searchable by registration number, timeline of all visits  
* Employee record page — accessible to Admin and Job Creation, shows task history per user with performance metrics

---

#### **PHASE 9 — F1 Rate**

**Duration: 1.5 days**

**Backend tasks:**

* Write API: `flag_f1_return` — when a vehicle comes back for the same issue, Job Creation or Admin links the new job to the original task, system sets F1 record to 0  
* Write API: `get_f1_report` — filterable by month, year, shop, user — returns F1 scores aggregated  
* Write a scheduled Frappe job that checks for jobs created within N days for the same vehicle and same task type and flags them for review

**Next.js tasks:**

* F1 report page in Admin — filter by date range, shop, technician  
* Summary cards: total tasks, F1 \= 1 count, F1 \= 0 count, F1 rate percentage  
* Drill-down table showing individual task records

