import { useMemo } from 'react'
import { Page } from '../../components/Page'
import { AppointmentCalendar } from '../../components/AppointmentCalendar'
import { useCwStore } from '../../store/cwStore'
import type { CWAppointmentStatus } from '../../types/cw'

const SE_STATUSES: CWAppointmentStatus[] = [
  'Diagnosis Assigned',
  'Diagnosis In Progress',
  'Diagnosis Complete',
  'Service Assigned',
  'Service In Progress',
  'Service Complete',
]

export function SECalendarPage() {
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

  const relevant = useMemo(
    () =>
      appointments.filter((a) => {
        if (!SE_STATUSES.includes(a.status as CWAppointmentStatus)) return false
        return a.concernItems.some((c) => c.assignedSEUserId) ||
          a.serviceItems.some((s) => s.assignedSEUserId || (s.stageItems && s.stageItems.some((st) => st.assignedSEUserId)))
      }),
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
    <Page title="SE Calendar" subtitle="Appointment calendar for Service Engineers">
      <AppointmentCalendar
        appointments={relevant}
        vehicleRegById={vehicleRegById}
        customerNameById={customerNameById}
        basePath="/se/appointments"
        title="SE Appointment Calendar"
      />
    </Page>
  )
}
