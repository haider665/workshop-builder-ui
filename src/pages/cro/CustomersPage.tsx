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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Add,
  DirectionsCar,
  Groups,
  Person,
  Search,
  Visibility,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { workshopApi } from '../../services/workshopApi'
import { useCwStore } from '../../store/cwStore'
import { useCREData } from '../../hooks/useCREData'
import { colors, radii, shadows } from '../../theme/tokens'
import type { CWCustomerType } from '../../types/cw'

/* ─────────────────────── Helpers ─────────────────────────── */

function includesLoose(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

/* ── Premium Stat Card ── */

const cardShine = {
  '@keyframes cardShine': {
    '0%': { transform: 'translateX(-100%) skewX(-15deg)' },
    '100%': { transform: 'translateX(200%) skewX(-15deg)' },
  },
} as const

function StatCard({
  icon, title, value, gradient, onClick,
}: {
  icon: React.ReactNode; title: string; value: number; gradient: string; onClick?: () => void
}) {
  return (
    <Box role="button" tabIndex={0} onClick={onClick} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && onClick) { event.preventDefault(); onClick() } }} sx={{
      flex: 1, minWidth: 180, borderRadius: radii.lg, background: gradient,
      color: '#fff', p: 2.5, position: 'relative', overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)',
      transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1), box-shadow 0.3s cubic-bezier(0.32,0.72,0,1)',
      cursor: onClick ? 'pointer' : 'default', '&:focus-visible': { outline: '3px solid rgba(59,130,246,.55)', outlineOffset: 3 },
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 36px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.12)',
        '& .card-shine': { animation: 'cardShine 0.6s ease forwards' },
      },
      '&::before': {
        content: '""', position: 'absolute', top: -30, right: -30,
        width: 120, height: 120, borderRadius: '50%',
        background: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
      },
      '&::after': {
        content: '""', position: 'absolute', bottom: -40, left: -20,
        width: 100, height: 100, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
      },
      ...cardShine,
    }}>
      <Box className="card-shine" sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
      }} />
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5, position: 'relative', zIndex: 2 }}>
        <Box sx={{
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
          p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, position: 'relative', zIndex: 2, letterSpacing: '-0.02em' }}>
        {value}
      </Typography>
    </Box>
  )
}

/* ── Styled table tokens ── */

const sectionSx = {
  borderRadius: radii.lg,
  border: `1px solid ${colors.border.default}`,
  background: colors.bg.card,
  boxShadow: shadows.card,
  overflow: 'hidden',
} as const

const headerCellSx = {
  background: colors.bg.subtle,
  borderBottom: `1px solid ${colors.border.default}`,
  color: colors.slate[600],
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  py: 1.5,
  '&:first-of-type': { pl: 3 },
  '&:last-of-type': { pr: 3 },
} as const

const bodyCellSx = {
  borderBottom: `1px solid ${colors.border.subtle}`,
  py: 1.5,
  '&:first-of-type': { pl: 3 },
  '&:last-of-type': { pr: 3 },
} as const

/* ═══════════════════════ Main Component ═══════════════════ */

export function CustomersPage() {
  useCREData()
  const customers = useCwStore((s) => s.customers)
  const vehicles = useCwStore((s) => s.vehicles)
  const navigate = useNavigate()

  const [typeFilter, setTypeFilter] = useState<CWCustomerType>('Individual')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

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
  const totalVehicles = useMemo(
    () => vehicles.length,
    [vehicles],
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

  // Reset page when filter changes
  const prevFilterRef = `${typeFilter}|${query}`
  const [prevFilter, setPrevFilter] = useState(prevFilterRef)
  if (prevFilterRef !== prevFilter) {
    setPrevFilter(prevFilterRef)
    if (page !== 0) setPage(0)
  }

  const paginatedCustomers = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage],
  )

  function vehicleCount(customerId: string) {
    return vehicles.filter((v) => v.customerId === customerId).length
  }

  async function submit() {
    try {
      setError(null)
      const created = await workshopApi.createCustomer({ fullName, phone, email })
      // Push into store so list updates immediately
      useCwStore.setState((s) => ({ customers: [created, ...s.customers] }))
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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* ── Page Header ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{
              fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' },
              color: colors.slate[900], letterSpacing: '-0.02em',
            }}>
              Customer Information
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
              Registered customer list — {customers.length} total
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/cre/customers/new')}
            sx={{
              bgcolor: colors.slate[900], fontWeight: 600,
              borderRadius: '10px', px: 2.5,
              alignSelf: { xs: 'flex-start', md: 'center' },
              '&:hover': { bgcolor: colors.slate[800] },
            }}
          >
            Create New Customer
          </Button>
        </Stack>

        {/* ── Stat Cards ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <StatCard
            icon={<Person fontSize="small" />}
            title="Individual"
            value={individualCount}
            onClick={() => { setTypeFilter('Individual'); setQuery(''); window.requestAnimationFrame(() => document.getElementById('customer-records')?.scrollIntoView({ behavior: 'smooth' })) }}
            gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)"
          />
          <StatCard
            icon={<Groups fontSize="small" />}
            title="Corporate"
            value={corporateCount}
            onClick={() => { setTypeFilter('Corporate'); setQuery(''); window.requestAnimationFrame(() => document.getElementById('customer-records')?.scrollIntoView({ behavior: 'smooth' })) }}
            gradient="linear-gradient(135deg, #9333EA 0%, #A855F7 100%)"
          />
          <StatCard
            icon={<DirectionsCar fontSize="small" />}
            title="Total Vehicles"
            value={totalVehicles}
            onClick={() => navigate('/cre/vehicles')}
            gradient="linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)"
          />
        </Stack>

        {/* ── Snackbar ── */}
        <Snackbar open={successOpen} onClose={() => setSuccessOpen(false)} autoHideDuration={2500} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled" sx={{ width: '100%', borderRadius: '10px' }}>
            {successMessage}
          </Alert>
        </Snackbar>

        {/* ── Inline create form ── */}
        {showCreate && (
          <Box sx={{ ...sectionSx, p: 2.5 }}>
            <Stack spacing={2}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: colors.slate[900] }}>New customer</Typography>
              {error ? <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert> : null}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} fullWidth size="small" />
                <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth size="small" />
                <TextField label="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth size="small" />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={submit}
                  sx={{ fontWeight: 600, borderRadius: '10px', bgcolor: colors.slate[900], '&:hover': { bgcolor: colors.slate[800] } }}>
                  Create
                </Button>
                <Button variant="text" onClick={() => setShowCreate(false)}
                  sx={{ fontWeight: 600, color: colors.slate[600] }}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        {/* ── Table Section ── */}
        <Box id="customer-records" sx={sectionSx}>
          {/* Header: tabs + search */}
          <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${colors.border.default}` }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
              <ToggleButtonGroup
                value={typeFilter}
                exclusive
                onChange={(_, v) => v && setTypeFilter(v as CWCustomerType)}
                size="small"
              >
                <ToggleButton value="Individual" sx={{
                  fontWeight: 700, textTransform: 'none', px: 2, borderRadius: '10px 0 0 10px',
                  '&.Mui-selected': { bgcolor: colors.slate[900], color: '#fff', '&:hover': { bgcolor: colors.slate[800] } },
                }}>
                  Individual
                  <Chip label={individualCount} size="small" sx={{ ml: 1, fontWeight: 700, height: 20, fontSize: '0.72rem' }} />
                </ToggleButton>
                <ToggleButton value="Corporate" sx={{
                  fontWeight: 700, textTransform: 'none', px: 2, borderRadius: '0 10px 10px 0',
                  '&.Mui-selected': { bgcolor: colors.slate[900], color: '#fff', '&:hover': { bgcolor: colors.slate[800] } },
                }}>
                  Corporate
                  <Chip label={corporateCount} size="small" sx={{ ml: 1, fontWeight: 700, height: 20, fontSize: '0.72rem' }} />
                </ToggleButton>
              </ToggleButtonGroup>

              <Box sx={{ flexGrow: 1 }} />

              <TextField
                size="small"
                placeholder="Search name, phone, email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: '1.1rem', color: colors.slate[400] }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  minWidth: 240,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: radii.sm,
                    fontSize: '0.85rem',
                    bgcolor: colors.bg.page,
                  },
                }}
              />

              <Box sx={{
                bgcolor: colors.slate[100], borderRadius: radii.full,
                px: 1.5, py: 0.3, fontSize: '0.75rem', fontWeight: 700, color: colors.slate[600],
                whiteSpace: 'nowrap',
              }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </Box>
            </Stack>
          </Box>

          {/* Table */}
          {filtered.length === 0 ? (
            <Box sx={{ p: 5, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
                No {typeFilter.toLowerCase()} customers found.
              </Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Customer</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Vehicles</TableCell>
                  <TableCell align="right">View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCustomers.map((c) => (
                  <TableRow
                    key={c.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '& .MuiTableCell-body': bodyCellSx,
                      '&:hover': { background: colors.bg.cardHover },
                    }}
                    onClick={() => navigate(`/cre/customers/${c.id}`)}
                  >
                    <TableCell>
                      <Stack>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>
                          {c.fullName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                          {c.phone}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={c.type ?? 'Individual'}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          bgcolor: (c.type ?? 'Individual') === 'Individual'
                            ? 'rgba(245,158,11,0.1)'
                            : 'rgba(99,102,241,0.1)',
                          color: (c.type ?? 'Individual') === 'Individual'
                            ? '#B45309'
                            : '#4F46E5',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: c.email ? colors.slate[700] : colors.slate[400] }}>
                        {c.email ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                        <DirectionsCar sx={{ fontSize: '0.9rem', color: colors.slate[400] }} />
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[700] }}>
                          {String(vehicleCount(c.id)).padStart(2, '0')}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View customer">
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); navigate(`/cre/customers/${c.id}`) }}
                        >
                          <Visibility fontSize="small" sx={{ color: colors.slate[500] }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
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
            sx={{ borderTop: `1px solid ${colors.border.subtle}` }}
          />
        </Box>
      </Stack>
    </Box>
  )
}
