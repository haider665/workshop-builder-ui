import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { Page } from '../components/Page'

export function NotFoundPage() {
  return (
    <Page title="Not Found" subtitle="That page doesn’t exist.">
      <Paper sx={{ p: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Typography color="text.secondary">Try going back to the home screen.</Typography>
          <Button variant="contained" component={RouterLink} to="/">
            Go Home
          </Button>
        </Stack>
      </Paper>
    </Page>
  )
}
