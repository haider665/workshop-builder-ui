import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

export function JobControllerHome() {
  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const jobs = useCwStore((s) => s.jobs)

  const pendingCount = pendingVehicles.filter((p) => p.status === 'Pending').length
  const activeCount = jobs.filter((j) => j.status === 'Active').length

  return (
    <Page title="Job Creation" subtitle="Jobs, tasks, scheduling, dependencies.">
      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <Box>
            <Typography sx={{ fontWeight: 900 }}>Overview</Typography>
            <Typography variant="body2" color="text.secondary">
              Pending vehicles and active jobs.
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/jc/pending-vehicles" variant="outlined">
              Pending Vehicles
            </Button>
            <Button component={RouterLink} to="/jc/jobs/new" variant="contained">
              Create Job
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Chip color={pendingCount ? 'warning' : 'default'} label={`Pending vehicles: ${pendingCount}`} />
          <Chip color={activeCount ? 'info' : 'default'} label={`Active jobs: ${activeCount}`} />
        </Stack>
      </Paper>
    </Page>
  )
}
