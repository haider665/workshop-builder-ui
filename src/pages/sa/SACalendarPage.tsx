import { useMemo } from 'react'
import { Page } from '../../components/Page'
import { AppointmentCalendar } from '../../components/AppointmentCalendar'
import { useCwStore } from '../../store/cwStore'
import type { CWAppointmentStatus } from '../../types/cw'

const SA_STATUSES: CWAppointmentStatus[] = [
  'SA Inspection',
  'SA Reviewed',
  'Customer Notified',
  'Customer Approved',
  'Customer Rejected',
  'Diagnosis Assigned',
  'Diagnosis In Progress',
  'Diagnosis Complete',
  'Service Approval Pending',
  'Service Approved',
  'Service Assigned',
  'Service In Progress',
  'Service Complete',
  'QC Assigned',
  'QC Approved',
  'QC Rejected',
  'Payment Pending',
  'Payment Done',
]

export function SACalendarPage() {
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

  const relevant = useMemo(
    () => appointments.filter((a) => SA_STATUSES.includes(a.status as CWAppointmentStatus) && !!a.assignedSAUserId),
    [appointments],
  )

  const vehicleRegById = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of vehicles) m.set(v.id, v.registrationNo)
    return m
  }, [vehicles])

  const customerNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of customers) m.set(c.id, c.fullName)
    return m
  }, [customers])

  return (
    <Page title="SA Calendar" subtitle="Appointment calendar for Service Advisors">
      <AppointmentCalendar
        appointments={relevant}
        vehicleRegById={vehicleRegById}
        customerNameById={customerNameById}
        basePath="/sa/appointments"
        title="SA Appointment Calendar"
      />
    </Page>
  )
}
