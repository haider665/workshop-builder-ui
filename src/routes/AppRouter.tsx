import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireRole } from './ProtectedRoute'
import { AppShell } from '../components/AppShell'
import { LoginPage } from '../pages/LoginPage'
import { LandingRedirect } from '../pages/LandingRedirect'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AdminHome } from '../pages/admin/AdminHome'
import { ConcernsPage } from '../pages/admin/ConcernsPage'
import { ServicesPage } from '../pages/admin/ServicesPage'
import { BaysPage } from '../pages/admin/BaysPage'
import { F1Page } from '../pages/admin/F1Page'
import { PartsPage } from '../pages/admin/PartsPage'
import { PartRequestsPage } from '../pages/admin/PartRequestsPage'
import { RolesPage } from '../pages/admin/RolesPage'
import { ShopsPage } from '../pages/admin/ShopsPage'
import { AdminReportsPage } from '../pages/admin/AdminReportsPage'
import { TaskTemplatesPage } from '../pages/admin/TaskTemplatesPage'
import { TeamsPage } from '../pages/admin/TeamsPage'
import { UsersPage } from '../pages/admin/UsersPage'
import { GuardHome } from '../pages/guard/GuardHome'
import { JobControllerHome } from '../pages/jc/JobControllerHome'
import { JCCalendarPage } from '../pages/jc/JCCalendarPage'
import { JobDetailsPage } from '../pages/jc/JobDetailsPage'
import { NewJobPage } from '../pages/jc/NewJobPage'
import { PendingVehiclesPage } from '../pages/jc/PendingVehiclesPage'
import { JCGanttFullPage } from '../pages/jc/JCGanttFullPage'
import { JCBayManagementPage } from '../pages/jc/JCBayManagementPage'
import { CroHome } from '../pages/cro/CroHome'
import { AppointmentsPage } from '../pages/cro/AppointmentsPage'
import { NewAppointmentPage } from '../pages/cro/NewAppointmentPage'
import { AppointmentDetailPage } from '../pages/cro/AppointmentDetailPage'
import { CustomersPage } from '../pages/cro/CustomersPage'
import { CustomerDetailPage } from '../pages/cro/CustomerDetailPage'
import { VehiclesPage } from '../pages/cro/VehiclesPage'
import { VehicleDetailPage } from '../pages/cro/VehicleDetailPage'
import { CreateVehiclePage } from '../pages/cro/CreateVehiclePage'
import { CreateCustomerPage } from '../pages/cro/CreateCustomerPage'
import { WhatsappPage } from '../pages/cro/WhatsappPage'
import { CRECalendarPage } from '../pages/cro/CRECalendarPage'
import { CRECallPage } from '../pages/cro/CRECallPage'
import { CRERemindersPage } from '../pages/cro/CRERemindersPage'
import { SAAppointmentsPage } from '../pages/sa/SAAppointmentsPage'
import { SAAppointmentDetailPage } from '../pages/sa/SAAppointmentDetailPage'
import { SACalendarPage } from '../pages/sa/SACalendarPage'
import { SEAppointmentsPage } from '../pages/se/SEAppointmentsPage'
import { SECalendarPage } from '../pages/se/SECalendarPage'
import { SEAppointmentDetailPage } from '../pages/se/SEAppointmentDetailPage'
import { JCAppointmentPage } from '../pages/jc/JCAppointmentPage'
import { TasksHome } from '../pages/tasks/TasksHome'
import { CalendarPage } from '../pages/tasks/CalendarPage'
import { TaskDetailPage } from '../pages/tasks/TaskDetailPage'
import { NotificationsPage } from '../pages/NotificationsPage'
import { EmployeeRecordDetailPage } from '../pages/records/EmployeeRecordDetailPage'
import { EmployeeRecordsPage } from '../pages/records/EmployeeRecordsPage'
import { VehicleHistoryDetailPage } from '../pages/records/VehicleHistoryDetailPage'
import { VehicleHistoryPage } from '../pages/records/VehicleHistoryPage'
import { TechnicianDashboardPage } from '../pages/technician/TechnicianDashboardPage'
import { TechnicianTaskPage } from '../pages/technician/TechnicianTaskPage'
import { QCAppointmentsPage } from '../pages/qc/QCAppointmentsPage'
import { QCAppointmentDetailPage } from '../pages/qc/QCAppointmentDetailPage'
import { InventoryTrackerPage } from '../pages/parts/InventoryTrackerPage'
import { PurchaseOrdersPage } from '../pages/parts/PurchaseOrdersPage'
import { VendorManagementPage } from '../pages/parts/VendorManagementPage'
import { CounterDeskPage } from '../pages/parts/CounterDeskPage'
import { EstimatorPage } from '../pages/parts/EstimatorPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<LandingRedirect />} />

          <Route element={<RequireRole anyOf={['Admin']} />}>
            <Route path="/admin" element={<AdminHome />} />
            <Route path="/admin/shops" element={<ShopsPage />} />
            <Route path="/admin/bays" element={<BaysPage />} />
            <Route path="/admin/task-templates" element={<TaskTemplatesPage />} />
            <Route path="/admin/roles" element={<RolesPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/f1" element={<F1Page />} />
            <Route path="/admin/concerns" element={<ConcernsPage />} />
            <Route path="/admin/services" element={<ServicesPage />} />
            <Route path="/admin/teams" element={<TeamsPage />} />
            <Route path="/admin/parts" element={<PartsPage />} />
            <Route path="/admin/part-requests" element={<PartRequestsPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['Parts', 'Admin']} />}>
            <Route path="/parts/inventory" element={<InventoryTrackerPage />} />
            <Route path="/parts/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/parts/vendors" element={<VendorManagementPage />} />
            <Route path="/parts/counter-desk" element={<CounterDeskPage />} />
            <Route path="/parts/estimator" element={<EstimatorPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['Guard']} />}>
            <Route path="/guard" element={<GuardHome />} />
          </Route>

          <Route element={<RequireRole anyOf={['Job Creation']} />}>
            <Route path="/jc" element={<JobControllerHome />} />
            <Route path="/jc/pending-vehicles" element={<PendingVehiclesPage />} />
            <Route path="/jc/appointments/:appointmentId" element={<JCAppointmentPage />} />
            <Route path="/jc/calendar" element={<JCCalendarPage />} />
            <Route path="/jc/gantt" element={<JCGanttFullPage />} />
            <Route path="/jc/bays" element={<JCBayManagementPage />} />
          </Route>

          {/* Job creation + detail: accessible to Job Creation, Service Advisor, and CRO */}
          <Route element={<RequireRole anyOf={['Job Creation', 'Service Advisor', 'CRE']} />}>
            <Route path="/jc/jobs/new" element={<NewJobPage />} />
            <Route path="/jc/jobs/:jobId" element={<JobDetailsPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['CRE']} />}>
            <Route path="/cre" element={<CroHome />} />
            <Route path="/cre/customers" element={<CustomersPage />} />
            <Route path="/cre/customers/new" element={<CreateCustomerPage />} />
            <Route path="/cre/customers/:customerId" element={<CustomerDetailPage />} />
            <Route path="/cre/vehicles" element={<VehiclesPage />} />
            <Route path="/cre/vehicles/new" element={<CreateVehiclePage />} />
            <Route path="/cre/vehicles/:vehicleId" element={<VehicleDetailPage />} />
            <Route path="/cre/appointments" element={<AppointmentsPage />} />
            <Route path="/cre/appointments/new" element={<NewAppointmentPage />} />
            <Route path="/cre/whatsapp" element={<WhatsappPage />} />
            <Route path="/cre/calendar" element={<CRECalendarPage />} />
            <Route path="/cre/calls" element={<CRECallPage />} />
            <Route path="/cre/reminders" element={<CRERemindersPage />} />
          </Route>

          {/* Appointment detail: accessible to both CRO and Service Advisor */}
          <Route element={<RequireRole anyOf={['CRE', 'Service Advisor']} />}>
            <Route path="/cre/appointments/:appointmentId" element={<AppointmentDetailPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['Service Advisor']} />}>
            <Route path="/sa/appointments" element={<SAAppointmentsPage />} />
            <Route path="/sa/appointments/:appointmentId" element={<SAAppointmentDetailPage />} />
            <Route path="/sa/calendar" element={<SACalendarPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['Service Engineer']} />}>
            <Route path="/se/appointments" element={<SEAppointmentsPage />} />
            <Route path="/se/appointments/:appointmentId" element={<SEAppointmentDetailPage />} />
            <Route path="/se/calendar" element={<SECalendarPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['Technician']} />}>
            <Route path="/technician" element={<TechnicianDashboardPage />} />
            <Route path="/technician/task/:appointmentId/:itemType/:itemId" element={<TechnicianTaskPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['QC']} />}>
            <Route path="/qc/appointments" element={<QCAppointmentsPage />} />
            <Route path="/qc/appointments/:appointmentId" element={<QCAppointmentDetailPage />} />
          </Route>

          <Route
            element={
              <RequireRole
                anyOf={[
                  'Technician',
                  'Service Advisor',
                  'Service Engineer',
                  'Admin',
                  'Job Creation',
                ]}
              />
            }
          >
            <Route path="/tasks" element={<TasksHome />} />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['Admin', 'Job Creation', 'CRE']} />}>
            <Route path="/vehicle-history" element={<VehicleHistoryPage />} />
            <Route path="/vehicle-history/:registrationNo" element={<VehicleHistoryDetailPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['Admin', 'Job Creation']} />}>
            <Route path="/employee-records" element={<EmployeeRecordsPage />} />
            <Route path="/employee-records/:userId" element={<EmployeeRecordDetailPage />} />
          </Route>

          <Route path="/notifications" element={<NotificationsPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
