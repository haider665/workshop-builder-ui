import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Add, Category, ListAlt, ToggleOff, ToggleOn } from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import type { CWConcern, CWConcernCategory, CWShop } from '../../types/cw'
import { shopsService } from '../../services/admin/shopsService'
import { concernsService } from '../../services/admin/concernsService'
import { colors } from '../../theme/tokens'

/* ─────────────────────── Helpers ─────────────────────────── */

function statusChip(status: string) {
  if (status === 'Active') return <Chip size="small" color="success" label="Active" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  return <Chip size="small" color="default" label="Inactive" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
}

const btnSx = {
  bgcolor: colors.slate[900],
  fontWeight: 600,
  borderRadius: '10px',
  px: 2.5,
  '&:hover': { bgcolor: colors.slate[800] },
} as const

/* ─────────────────────── Component ─────────────────────────── */

export function ConcernsPage() {
  const [shops, setShops] = useState<CWShop[]>([])
  const [concernCategories, setConcernCategories] = useState<CWConcernCategory[]>([])
  const [concerns, setConcerns] = useState<CWConcern[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newCatName, setNewCatName] = useState('')
  const [newCatShopId, setNewCatShopId] = useState('')
  const [newConcernCatId, setNewConcernCatId] = useState('')
  const [newConcernCode, setNewConcernCode] = useState('')
  const [newConcernName, setNewConcernName] = useState('')
  const [newConcernSource, setNewConcernSource] = useState('Manual')
  const [newConcernExternalRef, setNewConcernExternalRef] = useState('')
  const [newConcernEstTime, setNewConcernEstTime] = useState('30')
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [concernDialogOpen, setConcernDialogOpen] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [shopData, categoryData, concernData] = await Promise.all([
          shopsService.list(),
          concernsService.listCategories(),
          concernsService.list(),
        ])
        if (!active) return
        setShops(shopData)
        setConcernCategories(categoryData)
        setConcerns(concernData)
        if (!newCatShopId && shopData.length) setNewCatShopId(shopData[0]!.id)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load concerns')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
    // one-time load on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const catById = useMemo(() => {
    return new Map(concernCategories.map((c) => [c.id, c]))
  }, [concernCategories])
  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops])
  const activeShops = shops.filter((s) => s.status === 'Active')

  /* ── CRUD Operations ── */

  function openCatDialog() {
    setNewCatName('')
    setNewCatShopId(activeShops.length ? activeShops[0]!.id : '')
    setCatDialogOpen(true)
  }

  function openConcernDialog() {
    setNewConcernCode('')
    setNewConcernName('')
    setNewConcernSource('Manual')
    setNewConcernExternalRef('')
    setNewConcernEstTime('30')
    setNewConcernCatId(
      concernCategories.filter((c) => c.status === 'Active').length
        ? concernCategories.filter((c) => c.status === 'Active')[0]!.id
        : '',
    )
    setConcernDialogOpen(true)
  }

  async function submitCategory() {
    try {
      setSaving(true)
      setError(null)
      if (!newCatShopId) throw new Error('Select a shop')
      const cat = await concernsService.createCategory({ name: newCatName, shopId: newCatShopId })
      setConcernCategories((current) => [cat, ...current.filter((item) => item.id !== cat.id)])
      setNewCatName('')
      setNewCatShopId('')
      setCatDialogOpen(false)
      setSuccessMessage(`Category created: ${cat.name}`)
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function submitConcern() {
    try {
      setSaving(true)
      setError(null)
      if (!newConcernCatId) throw new Error('Select a category')
      const estMins = newConcernEstTime.trim() ? Number(newConcernEstTime.trim()) : undefined
      const c = await concernsService.create({
        categoryId: newConcernCatId,
        code: newConcernCode.trim(),
        name: newConcernName,
        sourceSystem: newConcernSource.trim() || undefined,
        externalReference: newConcernExternalRef.trim() || undefined,
        processTimeMins: estMins,
      })
      setConcerns((current) => [c, ...current.filter((item) => item.id !== c.id)])
      setNewConcernCode('')
      setNewConcernName('')
      setNewConcernSource('Manual')
      setNewConcernExternalRef('')
      setNewConcernEstTime('30')
      setConcernDialogOpen(false)
      setSuccessMessage(`Concern created: ${c.name}`)
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleCatStatus(id: string, current: string) {
    const cat = concernCategories.find((c) => c.id === id)
    if (!cat) return
    try {
      setSaving(true)
      setError(null)
      const updated = await concernsService.setCategoryStatus(
        id,
        current === 'Active' ? 'Inactive' : 'Active',
      )
      setConcernCategories((items) => items.map((item) => (item.id === updated.id ? updated : item)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleConcernStatus(id: string, current: string) {
    const c = concerns.find((x) => x.id === id)
    if (!c) return
    try {
      setSaving(true)
      setError(null)
      const updated = await concernsService.setStatus(id, current === 'Active' ? 'Inactive' : 'Active')
      setConcerns((items) => items.map((item) => (item.id === updated.id ? updated : item)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  /* ── Category Table Columns ── */

  const categoryColumns: Column<CWConcernCategory>[] = [
    {
      key: 'name',
      header: 'Name',
      minWidth: 180,
      render: (cat) => (
        <Box>
          <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
            {cat.name}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400], mt: 0.25 }}>
            {cat.id}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'shop',
      header: 'Shop',
      render: (cat) => (
        <Chip size="small" label={shopById.get(cat.shopId)?.name ?? '—'} variant="outlined" />
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (cat) => (
        <Chip
          size="small"
          label={concerns.filter((c) => c.categoryId === cat.id).length}
          variant="outlined"
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (cat) => statusChip(cat.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (cat) => (
        <Tooltip title={cat.status === 'Active' ? 'Deactivate' : 'Activate'}>
          <IconButton
            size="small"
            onClick={() => void toggleCatStatus(cat.id, cat.status)}
            disabled={saving}
          >
            {cat.status === 'Active' ? (
              <ToggleOn fontSize="small" />
            ) : (
              <ToggleOff fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      ),
    },
  ]

  /* ── Concern Table Columns ── */

  const concernColumns: Column<CWConcern>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (c) => (
        <Typography
          sx={{ fontWeight: 700, fontFamily: 'monospace', color: colors.slate[900], fontSize: '0.875rem' }}
        >
          {c.code || '—'}
        </Typography>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (c) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[500] }}>
          {catById.get(c.categoryId)?.name ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'name',
      header: 'Concern',
      minWidth: 180,
      render: (c) => (
        <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
          {c.name}
        </Typography>
      ),
    },
    {
      key: 'processTime',
      header: 'Process Time',
      render: (c) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[500] }}>
          {typeof c.processTimeMins === 'number' ? `${c.processTimeMins}m` : '—'}
        </Typography>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (c) => (
        <Box>
          <Typography sx={{ fontSize: '0.8rem', color: colors.slate[600] }}>{c.sourceSystem ?? '—'}</Typography>
          {c.externalReference ? <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>{c.externalReference}</Typography> : null}
        </Box>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => statusChip(c.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <Tooltip title={c.status === 'Active' ? 'Deactivate' : 'Activate'}>
          <IconButton
            size="small"
            onClick={() => void toggleConcernStatus(c.id, c.status)}
            disabled={saving}
          >
            {c.status === 'Active' ? (
              <ToggleOn fontSize="small" />
            ) : (
              <ToggleOff fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      ),
    },
  ]

  /* ── Render ── */

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Concerns
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Manage concern categories and items used in appointments.</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCatDialog}
              disabled={saving}
              sx={btnSx}
            >
              New Category
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openConcernDialog}
              disabled={saving}
              sx={btnSx}
            >
              New Concern
            </Button>
          </Stack>
        </Stack>

        <Snackbar
          open={successOpen}
          onClose={() => setSuccessOpen(false)}
          autoHideDuration={2500}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled" sx={{ width: '100%', borderRadius: '10px' }}>
            {successMessage}
          </Alert>
        </Snackbar>

        {error ? (
          <Alert severity="error" sx={{ borderRadius: '10px' }}>
            {error}
          </Alert>
        ) : null}

        {/* ── Categories Table ── */}
        <Box>
          <Typography
            sx={{ fontWeight: 800, color: colors.slate[900], fontSize: '1rem', mb: 1.5 }}
          >
            Categories ({concernCategories.length})
          </Typography>
          <DataTable
            columns={categoryColumns}
            rows={concernCategories}
            keyExtractor={(cat) => cat.id}
            loading={loading}
            emptyIcon={<Category />}
            emptyTitle="No categories yet"
            emptyDescription="Create a concern category to start organizing concerns by shop."
            emptyAction={
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={openCatDialog}
                disabled={saving}
                sx={btnSx}
              >
                Create Category
              </Button>
            }
          />
        </Box>

        {/* ── Concerns Table ── */}
        <Box>
          <Typography
            sx={{ fontWeight: 800, color: colors.slate[900], fontSize: '1rem', mb: 1.5 }}
          >
            All Concerns ({concerns.length})
          </Typography>
          <DataTable
            columns={concernColumns}
            rows={concerns}
            keyExtractor={(c) => c.id}
            loading={loading}
            emptyIcon={<ListAlt />}
            emptyTitle="No concerns yet"
            emptyDescription="Add concern items under a category to use in appointments."
            emptyAction={
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={openConcernDialog}
                disabled={saving}
                sx={btnSx}
              >
                Create Concern
              </Button>
            }
          />
        </Box>
      </Stack>

      {/* ── Create Category Dialog ── */}
      <FormDialog
        open={catDialogOpen}
        onClose={() => setCatDialogOpen(false)}
        title="Create concern category"
        icon={<Category />}
        onSubmit={() => void submitCategory()}
        submitLabel="Create"
        submitDisabled={!newCatName.trim() || !newCatShopId || saving}
      >
        <FormControl fullWidth>
          <InputLabel>Shop</InputLabel>
          <Select label="Shop" value={newCatShopId} onChange={(e) => setNewCatShopId(e.target.value)}>
            {activeShops.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Category name"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          required
          fullWidth
        />
      </FormDialog>

      {/* ── Create Concern Dialog ── */}
      <FormDialog
        open={concernDialogOpen}
        onClose={() => setConcernDialogOpen(false)}
        title="Create concern"
        icon={<ListAlt />}
        onSubmit={() => void submitConcern()}
        submitLabel="Create"
        submitDisabled={!newConcernCatId || !newConcernName.trim() || saving}
      >
        <FormControl fullWidth>
          <InputLabel>Category</InputLabel>
          <Select
            label="Category"
            value={newConcernCatId}
            onChange={(e) => setNewConcernCatId(e.target.value)}
          >
            {concernCategories
              .filter((c) => c.status === 'Active')
              .map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
        <TextField
          label="Code"
          value={newConcernCode}
          onChange={(e) => setNewConcernCode(e.target.value)}
          placeholder="e.g. CC-BRK-001"
          fullWidth
        />
        <TextField
          label="Concern name"
          value={newConcernName}
          onChange={(e) => setNewConcernName(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Process Time (mins)"
          type="number"
          value={newConcernEstTime}
          onChange={(e) => setNewConcernEstTime(e.target.value)}
          fullWidth
        />
        <TextField
          label="Source system"
          value={newConcernSource}
          onChange={(e) => setNewConcernSource(e.target.value)}
          placeholder="e.g. Manual or Customer Concern Codes 0526"
          fullWidth
        />
        <TextField
          label="External reference"
          value={newConcernExternalRef}
          onChange={(e) => setNewConcernExternalRef(e.target.value)}
          placeholder="Optional source record ID"
          fullWidth
        />
      </FormDialog>
    </Box>
  )
}
