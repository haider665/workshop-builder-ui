import type { ReactNode } from 'react'
import { Component } from 'react'
import { Alert, AlertTitle, Box, Button, Container } from '@mui/material'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  message?: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error)
    return { hasError: true, message }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">
          <AlertTitle>Something went wrong</AlertTitle>
          {this.state.message ?? 'Unknown error'}
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </Box>
      </Container>
    )
  }
}
