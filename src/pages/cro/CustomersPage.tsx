import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { Add, Info } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWCustomerType } from '../../types/cw'

function includesLoose(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function CustomersPage() {
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const createCustomer = useCwStore((s) => s.createCustomer)
  const navigate = useNavigate()

  const [typeFilter, setTypeFilter] = useState<CWCustomerType>('Individual')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Quick-create form (inline)
  const [showCreate, setShowCreate] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const individualCount = useMemo(
    () => customers.filter((c) => (c.type ?? 'Individual') === 'Individual').length,
    [customers],
  )
  const corporateCount = useMemo(
    () => customers.filter((c) => c.type === 'Corporate').length,
    [customers],
  )

  const filtered = useMemo(() => {
    const q = query.trim()
    return customers
      .filter((c) => (c.type ?? 'Individual') === typeFilter)
      .filter((c) => {
        if (!q) return true
        if (includesLoose(c.fullName, q)) return true
        if (includesLoose(c.phone, q)) return true
        if (c.email && includesLoose(c.email, q)) return true
        return false
      })
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [customers, typeFilter, query])

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
      setShowCreate(false)
      setSuccessMessage(`Customer created: ${created.fullName}`)
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Page
      title="Customers"
      subtitle="Registered Customer list"
      actions={
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowCreate((v) => !v)}
          sx={{ fontWeight: 700, borderRadius: 2, px: 3 }}
        >
          Create New Customer
        </Button>
      }
    >
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
        {/* Type tabs + search */}
        <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
          <ToggleButtonGroup
            value={typeFilter}
            exclusive
            onChange={(_, v) => v && setTypeFilter(v as CWCustomerType)}
            size="small"
          >
            <ToggleButton value="Individual" sx={{ fontWeight: 700, textTransform: 'none', px: 2.5 }}>
              Individual
              <Chip label={individualCount} size="small" sx={{ ml: 1, fontWeight: 700 }} />
            </ToggleButton>
            <ToggleButton value="Corporate" sx={{ fontWeight: 700, textTransform: 'none', px: 2.5 }}>
              Corporate
              <Chip label={corporateCount} size="small" sx={{ ml: 1, fontWeight: 700 }} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <TextField
          size="small"
          placeholder="Type to Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fullWidth
        />

        {/* Inline create form */}
        {showCreate && (
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
            <Stack spacing={2}>
              <Typography sx={{ fontWeight: 900 }}>New customer</Typography>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} fullWidth />
                <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
                <TextField label="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={submit} sx={{ fontWeight: 700 }}>Create</Button>
                <Button variant="text" onClick={() => setShowCreate(false)}>Cancel</Button>
              </Stack>
            </Stack>
          </Paper>
        )}

        {/* Table */}
        <Paper variant="outlined">
          {filtered.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No {typeFilter.toLowerCase()} customers found.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Number of vehicles</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cre/customers/${c.id}`)}>
                    <TableCell sx={{ fontWeight: 700 }}>{c.fullName}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: (c.type ?? 'Individual') === 'Individual' ? 'warning.main' : 'primary.main' }}
                      >
                        {c.type ?? 'Individual'}
                      </Typography>
                    </TableCell>
                    <TableCell>{c.email ?? '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {String(vehicleCount(c.id)).padStart(2, '0')}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/cre/customers/${c.id}`) }}>
                        <Info fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Stack>
    </Page>
  )
}
