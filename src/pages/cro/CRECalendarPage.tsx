import { useMemo } from 'react'
import { Page } from '../../components/Page'
import { AppointmentCalendar } from '../../components/AppointmentCalendar'
import { useCwStore } from '../../store/cwStore'

export function CRECalendarPage() {
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)

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
    <Page title="Appointment Calendar" subtitle="View and manage scheduled appointments">
      <AppointmentCalendar
        appointments={appointments}
        vehicleRegById={vehicleRegById}
        customerNameById={customerNameById}
        basePath="/cre/appointments"
      />
    </Page>
  )
}
