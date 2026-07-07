import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Add, MoreVert } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

function includesLoose(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function VehiclesPage() {
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c] as const)), [customers])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return vehicles.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return vehicles
      .filter((v) => {
        if (includesLoose(v.registrationNo, q)) return true
        const c = customerById.get(v.customerId)
        if (c && (includesLoose(c.fullName, q) || includesLoose(c.phone, q) || (c.email && includesLoose(c.email, q)))) return true
        if (v.make && includesLoose(v.make, q)) return true
        if (v.model && includesLoose(v.model, q)) return true
        if (v.vin && includesLoose(v.vin, q)) return true
        if (v.modelVariant && includesLoose(v.modelVariant, q)) return true
        return false
      })
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [vehicles, query, customerById])

  const paginatedVehicles = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage],
  )

  return (
    <Page
      title="Vehicles"
      actions={
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/cre/vehicles/new')}
          sx={{ fontWeight: 700, borderRadius: 2, px: 3 }}
        >
          Create New Vehicles
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
        <TextField
          size="small"
          placeholder="Type to Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fullWidth
        />

        <Paper variant="outlined">
          {filtered.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No vehicles found.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Model</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>VIN</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Registration Number</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedVehicles.map((v) => {
                  const c = customerById.get(v.customerId)
                  const modelDisplay = v.model || v.modelVariant || '—'
                  const brandDisplay = v.make || ''
                  return (
                    <TableRow
                      key={v.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/cre/vehicles/${v.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{modelDisplay}</Typography>
                        {brandDisplay && (
                          <Typography variant="caption" color="text.secondary">{brandDisplay}</Typography>
                        )}
                      </TableCell>
                      <TableCell>{v.vin ?? '—'}</TableCell>
                      <TableCell>{v.registrationNo}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{c?.fullName ?? '—'}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); navigate(`/cre/vehicles/${v.id}`) }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </Paper>
      </Stack>
    </Page>
  )
}
