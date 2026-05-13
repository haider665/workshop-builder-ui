import { Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Page } from './Page'

export function PlaceholderPage(props: {
  title: string
  subtitle?: string
  hint?: ReactNode
}) {
  return (
    <Page title={props.title} subtitle={props.subtitle}>
      <Paper sx={{ p: 3 }}>
        {props.hint ? (
          <Typography color="text.secondary">{props.hint}</Typography>
        ) : (
          <Typography color="text.secondary">
            Placeholder. This screen will be implemented in a later milestone.
          </Typography>
        )}
      </Paper>
    </Page>
  )
}
