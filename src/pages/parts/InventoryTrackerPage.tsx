import {
  Box,
  Button,
  Chip,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  Add,
  CalendarToday,
  FilterList,
  Inventory,
  Search,
} from '@mui/icons-material'
import { useState } from 'react'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import { useCwStore } from '../../store/cwStore'
import type { CWPart, CWPartStatus } from '../../types/cw'
import { colors, pageLayout, shadows, radii } from '../../theme/tokens'

/* ─────────────────────── Constants ─────────────────────────── */

const CATEGORY_PRESETS = [
  'Engine Parts',
  'Brake System',
  'Transmission',
  'Suspension',
  'Electrical',
  'Cooling',
  'Exhaust',
  'Fuel System',
  'Lighting',
  'Interior',
  'Body Parts',
  'Filters',
] as const

/* ─────────────────────── Types ──────────────────────────────── */

type PartDraft = {
  name: string
  partNumber: string
  description: string
  category: string
  brand: string
  modelVariant: string
  rackLocation: string
  binNumber: string
  reorderLevel: string
  stockCount: string
  status: CWPartStatus
}

function emptyDraft(): PartDraft {
  return {
    name: '',
    partNumber: '',
    description: '',
    category: '',
    brand: '',
    modelVariant: '',
    rackLocation: '',
    binNumber: '',
    reorderLevel: '',
    stockCount: '',
    status: 'Active',
  }
}

/* ─────────────────────── Styles ─────────────────────────────── */

const btnSx = {
  bgcolor: colors.slate[900],
  fontWeight: 600,
  borderRadius: '10px',
  px: 2.5,
  '&:hover': { bgcolor: colors.slate[800] },
} as const

const cardSx = {
  background: colors.bg.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: radii.lg,
  boxShadow: shadows.card,
  p: 3,
} as const

/* ─────────────────────── Helpers ────────────────────────────── */

type StockLevel = 'In Stock' | 'Low Stock' | 'Out of Stock'

const stockChipProps: Record<StockLevel, { bg: string; color: string }> = {
  'In Stock': { bg: '#dcfce7', color: '#166534' },
  'Low Stock': { bg: '#fef3c7', color: '#92400e' },
  'Out of Stock': { bg: '#fee2e2', color: '#991b1b' },
}

function getDaysInStock(createdAt: string): number {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)))
}

/* ─────────────────────── Component ──────────────────────────── */

export function InventoryTrackerPage() {
  const parts = useCwStore((s) => s.parts)
  const createPart = useCwStore((s) => s.createPart)
  const getPartStockStatus = useCwStore((s) => s.getPartStockStatus)
  const getLowStockParts = useCwStore((s) => s.getLowStockParts)
  const getSlowMovers = useCwStore((s) => s.getSlowMovers)
  const vendors = useCwStore((s) => s.vendors)
  const vendorPartPrices = useCwStore((s) => s.vendorPartPrices)

  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [draft, setDraft] = useState<PartDraft>(emptyDraft())

  /* ── Derived data ── */

  const activeParts = parts.filter((p) => p.status === 'Active')

  const filteredParts = activeParts.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.partNumber.toLowerCase().includes(q) ||
      (p.category ?? '').toLowerCase().includes(q) ||
      (p.brand ?? '').toLowerCase().includes(q)
    )
  })

  const lowStockParts = getLowStockParts()
  const slowMovers = getSlowMovers()

  function getPreferredVendor(partId: string) {
    const prices = vendorPartPrices.filter((vp) => vp.partId === partId)
    if (!prices.length) return null
    const vendorId = prices[0].vendorId
    return vendors.find((v) => v.id === vendorId) ?? null
  }

  /* ── Dialog handlers ── */

  function openCreate() {
    setDraft(emptyDraft())
    setCreateOpen(true)
  }

  function submitCreate() {
    if (!draft.name.trim() || !draft.partNumber.trim()) return
    createPart({
      name: draft.name.trim(),
      partNumber: draft.partNumber.trim(),
      description: draft.description.trim() || undefined,
      category: draft.category || undefined,
      brand: draft.brand.trim() || undefined,
      modelVariant: draft.modelVariant.trim() || undefined,
      rackLocation: draft.rackLocation.trim() || undefined,
      binNumber: draft.binNumber.trim() || undefined,
      reorderLevel: draft.reorderLevel.trim() ? Number(draft.reorderLevel) : undefined,
      stockCount: draft.stockCount.trim() ? Number(draft.stockCount) : undefined,
      status: draft.status,
    })
    setCreateOpen(false)
  }

  /* ── Table Columns ── */

  const columns: Column<CWPart>[] = [
    {
      key: 'category',
      header: 'Category',
      minWidth: 140,
      render: (part) => (
        <Box>
          <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
            {part.category ?? '—'}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400] }}>
            {part.category ?? 'Uncategorized'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'partNumber',
      header: 'Part Number',
      minWidth: 130,
      render: (part) => (
        <Box>
          <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
            {part.partNumber}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400] }}>
            {part.category ?? 'General'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      minWidth: 160,
      render: (part) => (
        <Typography sx={{ fontWeight: 500, color: colors.slate[800], fontSize: '0.875rem' }}>
          {part.name}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      minWidth: 110,
      render: (part) => {
        const status = getPartStockStatus(part)
        const chip = stockChipProps[status]
        return (
          <Chip
            size="small"
            label={status}
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              bgcolor: chip.bg,
              color: chip.color,
              border: 'none',
            }}
          />
        )
      },
    },
    {
      key: 'brand',
      header: 'Brand',
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[600] }}>
          {part.brand ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'modelVariant',
      header: 'Model Variant',
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[600] }}>
          {part.modelVariant ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: colors.slate[700] }}>
          {part.stockCount ?? 0} units
        </Typography>
      ),
    },
  ]

  /* ── Render ── */

  return (
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
      <Stack spacing={3.5}>
        {/* ── Header ── */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.5rem', md: '1.85rem' },
                color: colors.slate[900],
                letterSpacing: '-0.02em',
              }}
            >
              Inventory Management
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
              Manage and track all vendors
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={btnSx}>
            + Add a Part
          </Button>
        </Stack>

        {/* ── Search & Filter Bar ── */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <TextField
            placeholder="Type to Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: colors.slate[400], fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: radii.sm,
                bgcolor: colors.bg.card,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.strong },
              },
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            endIcon={<CalendarToday sx={{ fontSize: 16 }} />}
            sx={{
              borderColor: colors.border.default,
              color: colors.slate[600],
              fontWeight: 600,
              borderRadius: radii.sm,
              px: 2.5,
              whiteSpace: 'nowrap',
              '&:hover': { borderColor: colors.border.strong, bgcolor: colors.bg.subtle },
            }}
          >
            Filter
          </Button>
        </Stack>

        {/* ── Inventory Table ── */}
        <DataTable
          columns={columns}
          rows={filteredParts}
          keyExtractor={(part) => part.id}
          emptyIcon={<Inventory />}
          emptyTitle="No parts found"
          emptyDescription="Add parts to start tracking inventory."
          emptyAction={
            <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={btnSx}>
              Add Part
            </Button>
          }
        />

        {/* ── Dashboard Cards ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {/* ── Low Stock Alerts Card ── */}
          <Box sx={{ ...cardSx, flex: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: colors.slate[900] }}>
                Low Stock Alerts
              </Typography>
              <Chip
                size="small"
                label={`${lowStockParts.length} items`}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  bgcolor: '#fff7ed',
                  color: '#9a3412',
                }}
              />
            </Stack>

            <Stack spacing={1.5}>
              {lowStockParts.slice(0, 6).map((part) => {
                const vendor = getPreferredVendor(part.id)
                const count = part.stockCount ?? 0
                return (
                  <Box
                    key={part.id}
                    sx={{
                      borderLeft: `4px solid ${colors.accent.amber}`,
                      borderRadius: radii.sm,
                      border: `1px solid ${colors.border.default}`,
                      borderLeftColor: colors.accent.amber,
                      borderLeftWidth: 4,
                      p: 2,
                    }}
                  >
                    <Stack
                      direction="row"
                      sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          sx={{ fontWeight: 700, fontSize: '0.875rem', color: colors.slate[900] }}
                        >
                          {part.name}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500], mt: 0.25 }}>
                          {part.partNumber}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500], mt: 0.25 }}>
                          Reorder: {part.reorderLevel ?? 0} units
                        </Typography>
                      </Box>
                      <Stack sx={{ alignItems: 'flex-end' }} spacing={0.5}>
                        <Chip
                          size="small"
                          label={`${count} left`}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            bgcolor: count === 0 ? '#fee2e2' : '#fff7ed',
                            color: count === 0 ? '#991b1b' : '#9a3412',
                            border: 'none',
                          }}
                        />
                        {vendor && (
                          <Typography
                            sx={{ fontSize: '0.72rem', color: colors.slate[400], textAlign: 'right' }}
                          >
                            {vendor.name}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                )
              })}

              {lowStockParts.length === 0 && (
                <Typography sx={{ fontSize: '0.875rem', color: colors.slate[400], py: 2, textAlign: 'center' }}>
                  No low stock alerts
                </Typography>
              )}
            </Stack>
          </Box>

          {/* ── Slow Moving Parts Card ── */}
          <Box sx={{ ...cardSx, flex: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: colors.slate[900] }}>
                Slow Moving Parts
              </Typography>
              <Chip
                size="small"
                label="Review Needed"
                variant="outlined"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  borderColor: colors.accent.orange,
                  color: colors.accent.orange,
                }}
              />
            </Stack>

            <Stack spacing={1.5}>
              {slowMovers.slice(0, 5).map((part) => {
                const days = getDaysInStock(part.createdAt)
                return (
                  <Box
                    key={part.id}
                    sx={{
                      borderRadius: radii.sm,
                      border: `1px solid ${colors.border.default}`,
                      p: 2,
                    }}
                  >
                    <Stack
                      direction="row"
                      sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
                    >
                      <Box>
                        <Typography
                          sx={{ fontWeight: 700, fontSize: '0.875rem', color: colors.slate[900] }}
                        >
                          {part.name}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500], mt: 0.25 }}>
                          {part.stockCount ?? 0} units in stock
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography
                          sx={{ fontWeight: 700, fontSize: '0.875rem', color: colors.accent.orange }}
                        >
                          {days} days
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>
                          in stock
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                )
              })}

              {slowMovers.length === 0 && (
                <Typography sx={{ fontSize: '0.875rem', color: colors.slate[400], py: 2, textAlign: 'center' }}>
                  No slow movers detected
                </Typography>
              )}
            </Stack>

            {slowMovers.length > 0 && (
              <Typography
                sx={{
                  mt: 2,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: colors.accent.blue,
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                View All Slow Movers →
              </Typography>
            )}
          </Box>
        </Stack>

        {/* ── Add Part Dialog ── */}
        <FormDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Add Part"
          icon={<Inventory />}
          onSubmit={submitCreate}
          submitLabel="Create"
          submitDisabled={!draft.name.trim() || !draft.partNumber.trim()}
        >
          <TextField
            label="Part Name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Part Number"
            value={draft.partNumber}
            onChange={(e) => setDraft((d) => ({ ...d, partNumber: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Description"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="Category"
            value={draft.category}
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
            select
            fullWidth
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {CATEGORY_PRESETS.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Brand"
            value={draft.brand}
            onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Model Variant"
            value={draft.modelVariant}
            onChange={(e) => setDraft((d) => ({ ...d, modelVariant: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Rack Location"
            value={draft.rackLocation}
            onChange={(e) => setDraft((d) => ({ ...d, rackLocation: e.target.value }))}
            placeholder="e.g. A-3-14"
            fullWidth
          />
          <TextField
            label="Bin Number"
            value={draft.binNumber}
            onChange={(e) => setDraft((d) => ({ ...d, binNumber: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Reorder Level"
            type="number"
            value={draft.reorderLevel}
            onChange={(e) => setDraft((d) => ({ ...d, reorderLevel: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Stock Count"
            type="number"
            value={draft.stockCount}
            onChange={(e) => setDraft((d) => ({ ...d, stockCount: e.target.value }))}
            fullWidth
          />
        </FormDialog>
      </Stack>
    </Box>
  )
}
