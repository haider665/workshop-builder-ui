import { Paper, Typography } from '@mui/material'
import { Page } from '../../components/Page'

export function TasksHome() {
  return (
    <Page title="My Tasks" subtitle="Assigned tasks and execution forms.">
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Placeholder. Milestone 6 will implement the task list, task detail, dynamic forms, and calendar.
        </Typography>
      </Paper>
    </Page>
  )
}
