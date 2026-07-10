import { useMemo } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import { SectionCard } from '../../components/SectionCard'
import { AppointmentCalendar } from '../../components/AppointmentCalendar'
import { useCwStore } from '../../store/cwStore'
import { colors } from '../../theme/tokens'
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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
            SE Calendar
          </Typography>
          <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
            Appointment calendar for Service Engineers
          </Typography>
        </Box>

        <SectionCard title="SE Appointment Calendar" icon={<CalendarMonthRoundedIcon sx={{ fontSize: '1rem' }} />}>
          <AppointmentCalendar
            appointments={relevant}
            vehicleRegById={vehicleRegById}
            customerNameById={customerNameById}
            basePath="/se/appointments"
            title="SE Appointment Calendar"
          />
        </SectionCard>
      </Stack>
    </Box>
  )
}
