import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

function includesLoose(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function CustomersPage() {
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const createCustomer = useCwStore((s) => s.createCustomer)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return customers
    return customers.filter((c) => {
      if (includesLoose(c.fullName, q)) return true
      if (includesLoose(c.phone, q)) return true
      if (c.email && includesLoose(c.email, q)) return true
      return false
    })
  }, [customers, query])

  function vehicleCount(customerId: string) {
    return vehicles.filter((v) => v.customerId === customerId).length
  }

  function submit() {
    try {
      setError(null)
      const created = createCustomer({ fullName, phone, email })
      setFullName('')
      setPhone('')
      setEmail('')
      setSuccessMessage(`Customer created: ${created.fullName}`)
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Page title="CRO / Customers" subtitle="Register and search customers.">
      <Snackbar
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        autoHideDuration={2500}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Stack spacing={2}>
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 900 }}>New customer</Typography>
              <Typography variant="body2" color="text.secondary">
                Duplicate phone/email blocked.
              </Typography>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} fullWidth />
              <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
              <TextField label="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            </Stack>

            <Button variant="contained" size="large" onClick={submit} sx={{ fontWeight: 900 }}>
              Create
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 900 }}>Customers</Typography>
            <Typography variant="body2" color="text.secondary">
              Search by name, phone, or email.
            </Typography>
          </Box>
          <Divider />

          <Box sx={{ p: 2 }}>
            <TextField label="Search" value={query} onChange={(e) => setQuery(e.target.value)} fullWidth />
          </Box>

          <Divider />

          {filtered.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicles</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered
                  .slice()
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ fontWeight: 800 }}>{c.fullName}</TableCell>
                      <TableCell>{c.phone}</TableCell>
                      <TableCell>{c.email ?? '—'}</TableCell>
                      <TableCell>{vehicleCount(c.id)}</TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="contained" component={RouterLink} to={`/cro/customers/${c.id}`}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary">No customers found.</Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Page>
  )
}
