import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Add,
  Edit,
  Star,
  StarBorder,
  Storefront,
  ToggleOff,
  ToggleOn,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import { useCwStore } from '../../store/cwStore'
import type { CWVendor, CWVendorSourcingType, CWVendorStatus } from '../../types/cw'
import { colors, pageLayout } from '../../theme/tokens'

/* ─────────────────────── Helpers ─────────────────────────── */

type VendorDraft = {
  name: string
  code: string
  contactPerson: string
  phone: string
  email: string
  address: string
  sourcingType: CWVendorSourcingType
  preferred: boolean
  status: CWVendorStatus
}

function emptyDraft(): VendorDraft {
  return {
    name: '',
    code: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    sourcingType: 'Local',
    preferred: false,
    status: 'Active',
  }
}

function toDraft(v: CWVendor): VendorDraft {
  return {
    name: v.name,
    code: v.code,
    contactPerson: v.contactPerson ?? '',
    phone: v.phone ?? '',
    email: v.email ?? '',
    address: v.address ?? '',
    sourcingType: v.sourcingType,
    preferred: v.preferred,
    status: v.status,
  }
}

const SOURCING_FILTERS = ['All', 'Local', 'Foreign'] as const
type SourcingFilter = (typeof SOURCING_FILTERS)[number]

const btnSx = {
  bgcolor: colors.slate[900],
  fontWeight: 600,
  borderRadius: '10px',
  px: 2.5,
  '&:hover': { bgcolor: colors.slate[800] },
} as const

function ratingColor(val: number) {
  if (val > 80) return colors.status.success
  if (val > 50) return colors.status.warning
  return colors.status.error
}

function ratingBg(val: number) {
  if (val > 80) return '#dcfce7'
  if (val > 50) return '#fef3c7'
  return '#fef2f2'
}

/* ─────────────────────── Component ─────────────────────────── */

export function VendorManagementPage() {
  const vendors = useCwStore((s) => s.vendors)
  const createVendor = useCwStore((s) => s.createVendor)
  const updateVendor = useCwStore((s) => s.updateVendor)

  const [createOpen, setCreateOpen] = useState(false)
  const [editVendor, setEditVendor] = useState<CWVendor | null>(null)
  const [draft, setDraft] = useState<VendorDraft>(emptyDraft())
  const [search, setSearch] = useState('')
  const [sourcingFilter, setSourcingFilter] = useState<SourcingFilter>('All')

  /* ── Filtered rows ── */

  const filteredVendors = useMemo(() => {
    const q = search.toLowerCase().trim()
    return vendors.filter((v) => {
      if (sourcingFilter !== 'All' && v.sourcingType !== sourcingFilter) return false
      if (q) {
        const haystack = `${v.name} ${v.code} ${v.contactPerson ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [vendors, search, sourcingFilter])

  /* ── Dialog handlers ── */

  function openCreate() {
    setDraft(emptyDraft())
    setCreateOpen(true)
  }

  function openEdit(vendor: CWVendor) {
    setEditVendor(vendor)
    setDraft(toDraft(vendor))
  }

  function submitCreate() {
    if (!draft.name.trim() || !draft.code.trim()) return
    createVendor({
      name: draft.name.trim(),
      code: draft.code.trim(),
      contactPerson: draft.contactPerson.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      email: draft.email.trim() || undefined,
      address: draft.address.trim() || undefined,
      sourcingType: draft.sourcingType,
      preferred: draft.preferred,
    })
    setCreateOpen(false)
  }

  function submitEdit() {
    if (!editVendor || !draft.name.trim() || !draft.code.trim()) return
    updateVendor(editVendor.id, {
      name: draft.name.trim(),
      code: draft.code.trim(),
      contactPerson: draft.contactPerson.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      email: draft.email.trim() || undefined,
      address: draft.address.trim() || undefined,
      sourcingType: draft.sourcingType,
      preferred: draft.preferred,
      status: draft.status,
    })
    setEditVendor(null)
  }

  function toggleStatus(vendor: CWVendor) {
    const next: CWVendorStatus = vendor.status === 'Active' ? 'Inactive' : 'Active'
    updateVendor(vendor.id, {
      name: vendor.name,
      code: vendor.code,
      contactPerson: vendor.contactPerson,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
      sourcingType: vendor.sourcingType,
      preferred: vendor.preferred,
      status: next,
    })
  }

  function togglePreferred(vendor: CWVendor) {
    updateVendor(vendor.id, {
      name: vendor.name,
      code: vendor.code,
      contactPerson: vendor.contactPerson,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
      sourcingType: vendor.sourcingType,
      preferred: !vendor.preferred,
      status: vendor.status,
    })
  }

  const isDialogOpen = createOpen || !!editVendor

  function closeDialog() {
    setCreateOpen(false)
    setEditVendor(null)
  }

  /* ── Table Columns ── */

  const columns: Column<CWVendor>[] = [
    {
      key: 'code',
      header: 'Vendor Code',
      minWidth: 110,
      render: (v) => (
        <Typography sx={{ fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: 600, color: colors.slate[700] }}>
          {v.code}
        </Typography>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      minWidth: 160,
      render: (v) => (
        <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
          {v.name}
        </Typography>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Contact Person',
      render: (v) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[600] }}>
          {v.contactPerson ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (v) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[600] }}>
          {v.phone ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'sourcingType',
      header: 'Sourcing Type',
      render: (v) => (
        <Chip
          size="small"
          label={v.sourcingType}
          sx={{
            fontWeight: 600,
            fontSize: '0.72rem',
            bgcolor: v.sourcingType === 'Local' ? '#dcfce7' : '#dbeafe',
            color: v.sourcingType === 'Local' ? '#15803d' : '#1d4ed8',
          }}
        />
      ),
    },
    {
      key: 'qualityRating',
      header: 'Quality Rating',
      minWidth: 140,
      render: (v) => (
        <Stack spacing={0.5}>
          <LinearProgress
            variant="determinate"
            value={v.qualityRating}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: ratingBg(v.qualityRating),
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                bgcolor: ratingColor(v.qualityRating),
              },
            }}
          />
          <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500], fontWeight: 600 }}>
            {v.qualityRating}%
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'returns',
      header: 'Returns',
      align: 'center',
      render: (v) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700], fontWeight: 500 }}>
          {v.returnsHistory}
        </Typography>
      ),
    },
    {
      key: 'preferred',
      header: 'Preferred',
      align: 'center',
      render: (v) => (
        <Tooltip title={v.preferred ? 'Remove preferred' : 'Mark preferred'}>
          <IconButton size="small" onClick={() => togglePreferred(v)}>
            {v.preferred ? (
              <Star fontSize="small" sx={{ color: colors.accent.amber }} />
            ) : (
              <StarBorder fontSize="small" sx={{ color: colors.slate[300] }} />
            )}
          </IconButton>
        </Tooltip>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => (
        <Chip
          size="small"
          color={v.status === 'Active' ? 'success' : 'default'}
          label={v.status}
          sx={{ fontWeight: 700, fontSize: '0.72rem' }}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (v) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(v)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={v.status === 'Active' ? 'Deactivate' : 'Activate'}>
            <IconButton size="small" onClick={() => toggleStatus(v)}>
              {v.status === 'Inactive' ? (
                <ToggleOn fontSize="small" />
              ) : (
                <ToggleOff fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  /* ── Render ── */

  return (
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Vendor Management
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Manage vendor profiles, ratings, and sourcing.</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreate}
            sx={btnSx}
          >
            Add Vendor
          </Button>
        </Stack>

        {/* Search & Filter */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
          <TextField
            size="small"
            placeholder="Search by name, code, or contact…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 280 }}
          />
          <Stack direction="row" spacing={1}>
            {SOURCING_FILTERS.map((f) => (
              <Chip
                key={f}
                label={f}
                size="small"
                onClick={() => setSourcingFilter(f)}
                sx={{
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  bgcolor: sourcingFilter === f ? colors.slate[900] : colors.bg.subtle,
                  color: sourcingFilter === f ? '#fff' : colors.slate[600],
                  '&:hover': {
                    bgcolor: sourcingFilter === f ? colors.slate[800] : colors.slate[100],
                  },
                }}
              />
            ))}
          </Stack>
        </Stack>

        {/* Table */}
        <DataTable
          columns={columns}
          rows={filteredVendors}
          keyExtractor={(v) => v.id}
          emptyIcon={<Storefront />}
          emptyTitle="No vendors yet"
          emptyDescription="Add vendors to manage sourcing and pricing."
          emptyAction={
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreate}
              sx={btnSx}
            >
              Add Vendor
            </Button>
          }
        />

        {/* ── Create / Edit Dialog ── */}
        <FormDialog
          open={isDialogOpen}
          onClose={closeDialog}
          title={editVendor ? 'Edit Vendor' : 'Add Vendor'}
          icon={editVendor ? <Edit /> : <Storefront />}
          onSubmit={editVendor ? submitEdit : submitCreate}
          submitLabel={editVendor ? 'Save' : 'Create'}
          submitDisabled={!draft.name.trim() || !draft.code.trim()}
        >
          <TextField
            label="Name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Vendor Code"
            value={draft.code}
            onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
            required
            fullWidth
            placeholder="e.g. APB-001"
          />
          <TextField
            label="Contact Person"
            value={draft.contactPerson}
            onChange={(e) => setDraft((d) => ({ ...d, contactPerson: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Phone"
            value={draft.phone}
            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Email"
            value={draft.email}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Address"
            value={draft.address}
            onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="Sourcing Type"
            value={draft.sourcingType}
            onChange={(e) => setDraft((d) => ({ ...d, sourcingType: e.target.value as CWVendorSourcingType }))}
            select
            fullWidth
          >
            <MenuItem value="Local">Local</MenuItem>
            <MenuItem value="Foreign">Foreign</MenuItem>
          </TextField>
          <FormControlLabel
            control={
              <Checkbox
                checked={draft.preferred}
                onChange={(e) => setDraft((d) => ({ ...d, preferred: e.target.checked }))}
              />
            }
            label="Preferred Vendor"
          />
        </FormDialog>
      </Stack>
    </Box>
  )
}
