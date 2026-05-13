import { Paper, Typography } from '@mui/material'
import { Page } from '../../components/Page'

export function GuardHome() {
  return (
    <Page title="Guard" subtitle="Gate entry & exit check (tablet-first).">
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Placeholder. Milestone 2 will implement the entry + exit check UI.
        </Typography>
      </Paper>
    </Page>
  )
}
