import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
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
import { Add, DirectionsCar, Search, Visibility } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatCard } from '../../components/StatCard'
import { tableSectionSx, headerCellSx, bodyCellSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import { colors, radii } from '../../theme/tokens'
import { useCwStore } from '../../store/cwStore'
import { useCREData } from '../../hooks/useCREData'


function includesLoose(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function statusChipColor(status: string): 'success' | 'default' {
  return status === 'Active' ? 'success' : 'default'
}

export function VehiclesPage() {
  useCREData()
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

  const activeCount = useMemo(() => vehicles.filter((v) => v.status === 'Active').length, [vehicles])

  const uniqueMakes = useMemo(() => new Set(vehicles.map((v) => v.make).filter(Boolean)).size, [vehicles])

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Vehicles
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Manage all registered vehicles</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/cre/vehicles/new')}
            sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
          >
            Create New Vehicle
          </Button>
        </Stack>

        {/* Stat Cards */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <StatCard
            icon={<DirectionsCar fontSize="small" />}
            title="TOTAL VEHICLES"
            value={vehicles.length}
            gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)"
          />
          <StatCard
            icon={<DirectionsCar fontSize="small" />}
            title="ACTIVE"
            value={activeCount}
            gradient="linear-gradient(135deg, #065f46 0%, #10b981 100%)"
          />
          <StatCard
            icon={<DirectionsCar fontSize="small" />}
            title="UNIQUE MAKES"
            value={uniqueMakes}
            gradient="linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)"
          />
        </Stack>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search by registration, customer, make, model, VIN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: '1.1rem', color: colors.slate[400] }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem', bgcolor: colors.bg.page } }}
        />

        {/* Table */}
        <Box sx={tableSectionSx}>
          <Box sx={tableHeaderSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={tableHeaderIconSx}><DirectionsCar sx={{ fontSize: '1rem' }} /></Box>
              <Typography sx={tableHeaderTitleSx}>VEHICLES</Typography>
              <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>
                {filtered.length}
              </Box>
            </Stack>
          </Box>

          {filtered.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[500] }}>No vehicles found.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Model</TableCell>
                  <TableCell>VIN</TableCell>
                  <TableCell>Registration</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">View</TableCell>
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
                      sx={{ cursor: 'pointer', '& .MuiTableCell-body': bodyCellSx }}
                      onClick={() => navigate(`/cre/vehicles/${v.id}`)}
                    >
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: colors.slate[900] }}>{modelDisplay}</Typography>
                        {brandDisplay && (
                          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>{brandDisplay}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700], fontFamily: 'monospace' }}>{v.vin ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: colors.slate[800] }}>{v.registrationNo}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: colors.slate[800] }}>{c?.fullName ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={v.status}
                          color={statusChipColor(v.status)}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); navigate(`/cre/vehicles/${v.id}`) }}
                          sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}
                        >
                          <Visibility sx={{ fontSize: '1rem', color: colors.slate[600] }} />
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
        </Box>

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
      </Stack>
    </Box>
  )
}
