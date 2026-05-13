import { Paper, Typography } from '@mui/material'
import { Page } from '../../components/Page'

export function CroHome() {
  return (
    <Page title="CRO" subtitle="Customers, vehicles, appointments, WhatsApp.">
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Placeholder. Milestone 3 will implement customer/vehicle/appointment screens.
        </Typography>
      </Paper>
    </Page>
  )
}
