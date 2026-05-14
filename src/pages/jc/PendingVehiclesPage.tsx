import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Add } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

export function PendingVehiclesPage() {
  const navigate = useNavigate()

  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const createPendingVehicle = useCwStore((s) => s.createPendingVehicle)

  const [registrationNo, setRegistrationNo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sorted = useMemo(() => {
    return pendingVehicles.slice().sort((a, b) => b.arrivedAt.localeCompare(a.arrivedAt))
  }, [pendingVehicles])

  function statusChip(status: string) {
    if (status === 'Pending') return <Chip size="small" color="warning" label="Pending" />
    return <Chip size="small" color="success" label="Job Created" />
  }

  function addPending() {
    try {
      setError(null)
      createPendingVehicle({ registrationNo })
      setRegistrationNo('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Page title="Pending Vehicles" subtitle="Vehicles arrived at gate but not yet assigned a job.">
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Add pending vehicle</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <TextField
            fullWidth
            label="Registration No"
            value={registrationNo}
            onChange={(e) => setRegistrationNo(e.target.value)}
            placeholder="e.g., KL 01 AB 1234"
          />
          <Button variant="contained" startIcon={<Add />} onClick={addPending} disabled={!registrationNo.trim()}>
            Add
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          MVP note: this is temporary until the Guard module is implemented.
        </Typography>
      </Paper>

      <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 900 }}>Queue</Typography>
          <Typography variant="body2" color="text.secondary">
            Create a job for pending vehicles.
          </Typography>
        </Box>
        <Divider />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Registration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Arrived</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ fontWeight: 800 }}>{p.registrationNo}</TableCell>
                <TableCell>{statusChip(p.status)}</TableCell>
                <TableCell>{new Date(p.arrivedAt).toLocaleString()}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={p.status !== 'Pending'}
                    onClick={() => navigate(`/jc/jobs/new?pendingVehicleId=${encodeURIComponent(p.id)}`)}
                  >
                    Create Job
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length ? null : (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    No pending vehicles.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Page>
  )
}
