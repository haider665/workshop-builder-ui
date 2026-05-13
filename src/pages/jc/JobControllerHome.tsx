import { Paper, Typography } from '@mui/material'
import { Page } from '../../components/Page'

export function JobControllerHome() {
  return (
    <Page title="Job Controller" subtitle="Jobs, tasks, scheduling, dependencies.">
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Placeholder. Milestone 5 will implement the dashboards and job orchestration flows.
        </Typography>
      </Paper>
    </Page>
  )
}
