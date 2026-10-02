import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { RequireAuth, RequireRole } from './ProtectedRoute'
import { AppShell } from '../components/AppShell'
const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const LandingRedirect = lazy(() => import('../pages/LandingRedirect').then((module) => ({ default: module.LandingRedirect })))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const AdminHome = lazy(() => import('../pages/admin/AdminHome').then((module) => ({ default: module.AdminHome })))
const ConcernsPage = lazy(() => import('../pages/admin/ConcernsPage').then((module) => ({ default: module.ConcernsPage })))
const ServicesPage = lazy(() => import('../pages/admin/ServicesPage').then((module) => ({ default: module.ServicesPage })))
const BaysPage = lazy(() => import('../pages/admin/BaysPage').then((module) => ({ default: module.BaysPage })))
const F1Page = lazy(() => import('../pages/admin/F1Page').then((module) => ({ default: module.F1Page })))
const PartsPage = lazy(() => import('../pages/admin/PartsPage').then((module) => ({ default: module.PartsPage })))
const PartRequestsPage = lazy(() => import('../pages/admin/PartRequestsPage').then((module) => ({ default: module.PartRequestsPage })))
const RolesPage = lazy(() => import('../pages/admin/RolesPage').then((module) => ({ default: module.RolesPage })))
const ShopsPage = lazy(() => import('../pages/admin/ShopsPage').then((module) => ({ default: module.ShopsPage })))
const AdminReportsPage = lazy(() => import('../pages/admin/AdminReportsPage').then((module) => ({ default: module.AdminReportsPage })))
const AdminDataRequestsPage = lazy(() => import('../pages/admin/AdminDataRequestsPage').then((module) => ({ default: module.AdminDataRequestsPage })))
const TaskTemplatesPage = lazy(() => import('../pages/admin/TaskTemplatesPage').then((module) => ({ default: module.TaskTemplatesPage })))
const TeamsPage = lazy(() => import('../pages/admin/TeamsPage').then((module) => ({ default: module.TeamsPage })))
const UsersPage = lazy(() => import('../pages/admin/UsersPage').then((module) => ({ default: module.UsersPage })))
const GuardHome = lazy(() => import('../pages/guard/GuardHome').then((module) => ({ default: module.GuardHome })))
const JobControllerHome = lazy(() => import('../pages/jc/JobControllerHome').then((module) => ({ default: module.JobControllerHome })))
const JCCalendarPage = lazy(() => import('../pages/jc/JCCalendarPage').then((module) => ({ default: module.JCCalendarPage })))
const JobDetailsPage = lazy(() => import('../pages/jc/JobDetailsPage').then((module) => ({ default: module.JobDetailsPage })))
const NewJobPage = lazy(() => import('../pages/jc/NewJobPage').then((module) => ({ default: module.NewJobPage })))
const PendingVehiclesPage = lazy(() => import('../pages/jc/PendingVehiclesPage').then((module) => ({ default: module.PendingVehiclesPage })))
const JCGanttFullPage = lazy(() => import('../pages/jc/JCGanttFullPage').then((module) => ({ default: module.JCGanttFullPage })))
const JCBayManagementPage = lazy(() => import('../pages/jc/JCBayManagementPage').then((module) => ({ default: module.JCBayManagementPage })))
const CroHome = lazy(() => import('../pages/cro/CroHome').then((module) => ({ default: module.CroHome })))
const AppointmentsPage = lazy(() => import('../pages/cro/AppointmentsPage').then((module) => ({ default: module.AppointmentsPage })))
const NewAppointmentPage = lazy(() => import('../pages/cro/NewAppointmentPage').then((module) => ({ default: module.NewAppointmentPage })))
const AppointmentDetailPage = lazy(() => import('../pages/cro/AppointmentDetailPage').then((module) => ({ default: module.AppointmentDetailPage })))
const CustomersPage = lazy(() => import('../pages/cro/CustomersPage').then((module) => ({ default: module.CustomersPage })))
const CustomerDetailPage = lazy(() => import('../pages/cro/CustomerDetailPage').then((module) => ({ default: module.CustomerDetailPage })))
const VehiclesPage = lazy(() => import('../pages/cro/VehiclesPage').then((module) => ({ default: module.VehiclesPage })))
const VehicleDetailPage = lazy(() => import('../pages/cro/VehicleDetailPage').then((module) => ({ default: module.VehicleDetailPage })))
const CreateVehiclePage = lazy(() => import('../pages/cro/CreateVehiclePage').then((module) => ({ default: module.CreateVehiclePage })))
const CreateCustomerPage = lazy(() => import('../pages/cro/CreateCustomerPage').then((module) => ({ default: module.CreateCustomerPage })))
const WhatsappPage = lazy(() => import('../pages/cro/WhatsappPage').then((module) => ({ default: module.WhatsappPage })))
const CRECalendarPage = lazy(() => import('../pages/cro/CRECalendarPage').then((module) => ({ default: module.CRECalendarPage })))
const CRECallPage = lazy(() => import('../pages/cro/CRECallPage').then((module) => ({ default: module.CRECallPage })))
const CRERemindersPage = lazy(() => import('../pages/cro/CRERemindersPage').then((module) => ({ default: module.CRERemindersPage })))
const SAAppointmentsPage = lazy(() => import('../pages/sa/SAAppointmentsPage').then((module) => ({ default: module.SAAppointmentsPage })))
const SAAppointmentDetailPage = lazy(() => import('../pages/sa/SAAppointmentDetailPage').then((module) => ({ default: module.SAAppointmentDetailPage })))
const SACalendarPage = lazy(() => import('../pages/sa/SACalendarPage').then((module) => ({ default: module.SACalendarPage })))
const SEAppointmentsPage = lazy(() => import('../pages/se/SEAppointmentsPage').then((module) => ({ default: module.SEAppointmentsPage })))
const SECalendarPage = lazy(() => import('../pages/se/SECalendarPage').then((module) => ({ default: module.SECalendarPage })))
const SEAppointmentDetailPage = lazy(() => import('../pages/se/SEAppointmentDetailPage').then((module) => ({ default: module.SEAppointmentDetailPage })))
const JCAppointmentPage = lazy(() => import('../pages/jc/JCAppointmentPage').then((module) => ({ default: module.JCAppointmentPage })))
const TasksHome = lazy(() => import('../pages/tasks/TasksHome').then((module) => ({ default: module.TasksHome })))
const CalendarPage = lazy(() => import('../pages/tasks/CalendarPage').then((module) => ({ default: module.CalendarPage })))
const TaskDetailPage = lazy(() => import('../pages/tasks/TaskDetailPage').then((module) => ({ default: module.TaskDetailPage })))
const NotificationsPage = lazy(() => import('../pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })))
const EmployeeRecordDetailPage = lazy(() => import('../pages/records/EmployeeRecordDetailPage').then((module) => ({ default: module.EmployeeRecordDetailPage })))
const EmployeeRecordsPage = lazy(() => import('../pages/records/EmployeeRecordsPage').then((module) => ({ default: module.EmployeeRecordsPage })))
const VehicleHistoryDetailPage = lazy(() => import('../pages/records/VehicleHistoryDetailPage').then((module) => ({ default: module.VehicleHistoryDetailPage })))
const VehicleHistoryPage = lazy(() => import('../pages/records/VehicleHistoryPage').then((module) => ({ default: module.VehicleHistoryPage })))
const TechnicianDashboardPage = lazy(() => import('../pages/technician/TechnicianDashboardPage').then((module) => ({ default: module.TechnicianDashboardPage })))
const TechnicianTaskPage = lazy(() => import('../pages/technician/TechnicianTaskPage').then((module) => ({ default: module.TechnicianTaskPage })))
const QCAppointmentsPage = lazy(() => import('../pages/qc/QCAppointmentsPage').then((module) => ({ default: module.QCAppointmentsPage })))
const QCAppointmentDetailPage = lazy(() => import('../pages/qc/QCAppointmentDetailPage').then((module) => ({ default: module.QCAppointmentDetailPage })))
const InventoryTrackerPage = lazy(() => import('../pages/parts/InventoryTrackerPage').then((module) => ({ default: module.InventoryTrackerPage })))
const PurchaseOrdersPage = lazy(() => import('../pages/parts/PurchaseOrdersPage').then((module) => ({ default: module.PurchaseOrdersPage })))
const VendorManagementPage = lazy(() => import('../pages/parts/VendorManagementPage').then((module) => ({ default: module.VendorManagementPage })))
const CounterDeskPage = lazy(() => import('../pages/parts/CounterDeskPage').then((module) => ({ default: module.CounterDeskPage })))
const EstimatorPage = lazy(() => import('../pages/parts/EstimatorPage').then((module) => ({ default: module.EstimatorPage })))
const TestDrivesPage = lazy(() => import('../pages/test-drives/TestDrivesPage').then((module) => ({ default: module.TestDrivesPage })))
const ServiceOrdersPage = lazy(() => import('../pages/service-orders/ServiceOrdersPage').then((module) => ({ default: module.ServiceOrdersPage })))
const FinanceWorkspacePage = lazy(() => import('../pages/operations/FinanceWorkspacePage').then((module) => ({ default: module.FinanceWorkspacePage })))

export function AppRouter() {
  return (
    <Suspense fallback={<Box sx={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}><CircularProgress size={28} /></Box>}>
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
            <Route path="/admin/data-requests" element={<AdminDataRequestsPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['Admin']} />}>
            <Route path="/admin/appointments" element={<AppointmentsPage />} />
            <Route path="/admin/appointments/:appointmentId" element={<AppointmentDetailPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['Parts', 'Parts Manager', 'Parts Buyer / Estimator', 'Store Keeper', 'Admin']} />}>
            <Route path="/parts/inventory" element={<InventoryTrackerPage />} />
            <Route path="/parts/counter-desk" element={<CounterDeskPage />} />
            <Route path="/parts/estimator" element={<EstimatorPage />} />
          </Route>
          <Route element={<RequireRole anyOf={['Parts', 'Parts Manager', 'Parts Buyer / Estimator', 'Store Keeper', 'Procurement', 'Procurement User', 'Procurement Manager', 'Admin']} />}>
            <Route path="/parts/part-requests" element={<PartRequestsPage />} />
          </Route>
          <Route element={<RequireRole anyOf={['Procurement', 'Procurement User', 'Procurement Manager', 'Admin']} />}>
            <Route path="/parts/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/parts/vendors" element={<VendorManagementPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['Parts', 'Parts Manager', 'Parts Buyer / Estimator', 'Store Keeper', 'Procurement', 'Procurement User', 'Procurement Manager', 'Accounts', 'Accounts User', 'Accounts Manager', 'Admin']} />}>
            <Route path="/procurement" element={<FinanceWorkspacePage workspace="procurement" initialTab="procurement" />} />
            <Route path="/accounting" element={<FinanceWorkspacePage workspace="accounting" initialTab="accounting" />} />
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
          <Route element={<RequireRole anyOf={['CRE', 'Service Advisor', 'Admin']} />}>
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

          <Route element={<RequireRole anyOf={['Admin', 'Job Creation', 'Guard', 'CRE', 'Service Advisor', 'Service Engineer']} />}>
            <Route path="/test-drives" element={<TestDrivesPage />} />
          </Route>
          <Route element={<RequireRole anyOf={["Admin", "Job Creation", "CRE", "Service Advisor", "Service Engineer", "Accounts", "Accounts User", "Accounts Manager", "Procurement", "Procurement User", "Procurement Manager"]} />}>
            <Route path="/service-orders" element={<ServiceOrdersPage />} />
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
    </Suspense>
  )
}
