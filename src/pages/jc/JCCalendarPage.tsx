import { useMemo } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import { useBackendData } from '../../hooks/useCREData'
import { AppointmentCalendar } from '../../components/AppointmentCalendar'

export function JCCalendarPage() {
  const appointments = useCwStore((s) => s.appointments)
  useBackendData()
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
    <Page title="JC Calendar" subtitle="Appointment calendar view.">
      <AppointmentCalendar
        appointments={appointments}
        vehicleRegById={vehicleRegById}
        customerNameById={customerNameById}
        basePath="/jc/appointments"
        title="JC Appointment Calendar"
      />
    </Page>
  )
}
