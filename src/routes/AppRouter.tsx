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
import { RolesPage } from '../pages/admin/RolesPage'
import { ShopsPage } from '../pages/admin/ShopsPage'
import { TaskTemplatesPage } from '../pages/admin/TaskTemplatesPage'
import { UsersPage } from '../pages/admin/UsersPage'
import { GuardHome } from '../pages/guard/GuardHome'
import { JobControllerHome } from '../pages/jc/JobControllerHome'
import { JobDetailsPage } from '../pages/jc/JobDetailsPage'
import { NewJobPage } from '../pages/jc/NewJobPage'
import { PendingVehiclesPage } from '../pages/jc/PendingVehiclesPage'
import { CroHome } from '../pages/cro/CroHome'
import { AppointmentsPage } from '../pages/cro/AppointmentsPage'
import { NewAppointmentPage } from '../pages/cro/NewAppointmentPage'
import { AppointmentDetailPage } from '../pages/cro/AppointmentDetailPage'
import { CustomersPage } from '../pages/cro/CustomersPage'
import { CustomerDetailPage } from '../pages/cro/CustomerDetailPage'
import { VehiclesPage } from '../pages/cro/VehiclesPage'
import { VehicleDetailPage } from '../pages/cro/VehicleDetailPage'
import { WhatsappPage } from '../pages/cro/WhatsappPage'
import { SAAppointmentsPage } from '../pages/sa/SAAppointmentsPage'
import { TasksHome } from '../pages/tasks/TasksHome'
import { CalendarPage } from '../pages/tasks/CalendarPage'
import { TaskDetailPage } from '../pages/tasks/TaskDetailPage'
import { NotificationsPage } from '../pages/NotificationsPage'
import { EmployeeRecordDetailPage } from '../pages/records/EmployeeRecordDetailPage'
import { EmployeeRecordsPage } from '../pages/records/EmployeeRecordsPage'
import { VehicleHistoryDetailPage } from '../pages/records/VehicleHistoryDetailPage'
import { VehicleHistoryPage } from '../pages/records/VehicleHistoryPage'

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
          </Route>

          <Route element={<RequireRole anyOf={['Guard']} />}>
            <Route path="/guard" element={<GuardHome />} />
          </Route>

          <Route element={<RequireRole anyOf={['Job Creation']} />}>
            <Route path="/jc" element={<JobControllerHome />} />
            <Route path="/jc/pending-vehicles" element={<PendingVehiclesPage />} />
          </Route>

          {/* Job creation + detail: accessible to Job Creation, Service Advisor, and CRO */}
          <Route element={<RequireRole anyOf={['Job Creation', 'Service Advisor', 'CRO']} />}>
            <Route path="/jc/jobs/new" element={<NewJobPage />} />
            <Route path="/jc/jobs/:jobId" element={<JobDetailsPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['CRO']} />}>
            <Route path="/cro" element={<CroHome />} />
            <Route path="/cro/customers" element={<CustomersPage />} />
            <Route path="/cro/customers/:customerId" element={<CustomerDetailPage />} />
            <Route path="/cro/vehicles" element={<VehiclesPage />} />
            <Route path="/cro/vehicles/:vehicleId" element={<VehicleDetailPage />} />
            <Route path="/cro/appointments" element={<AppointmentsPage />} />
            <Route path="/cro/appointments/new" element={<NewAppointmentPage />} />
            <Route path="/cro/whatsapp" element={<WhatsappPage />} />
          </Route>

          {/* Appointment detail: accessible to both CRO and Service Advisor */}
          <Route element={<RequireRole anyOf={['CRO', 'Service Advisor']} />}>
            <Route path="/cro/appointments/:appointmentId" element={<AppointmentDetailPage />} />
          </Route>

          <Route element={<RequireRole anyOf={['Service Advisor']} />}>
            <Route path="/sa/appointments" element={<SAAppointmentsPage />} />
          </Route>

          <Route
            element={
              <RequireRole
                anyOf={[
                  'Technician',
                  'Service Advisor',
                  'Service Engineer',
                  'Custom Role',
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

          <Route element={<RequireRole anyOf={['Admin', 'Job Creation', 'CRO']} />}>
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
