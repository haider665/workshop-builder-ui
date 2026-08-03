import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Add, Edit, Store, ToggleOff, ToggleOn } from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import { useToast } from '../../hooks/useToast'
import type { Column } from '../../components/DataTable'
import type { CWShop, CWShopStatus, CWShopType } from '../../types/cw'
import { shopsService } from '../../services/admin/shopsService'
import { colors } from '../../theme/tokens'

/* ─────────────────────── Constants ─────────────────────────── */

const SHOP_TYPES: CWShopType[] = [
  'Auto',
  'Paint',
  'Body',
  'Quick Service',
  'Diagnostics',
  'Custom',
]

/* ─────────────────────── Helpers ─────────────────────────── */

function statusChip(status: CWShopStatus) {
  if (status === 'Active') return <Chip size="small" color="success" label="Active" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  return <Chip size="small" color="default" label="Inactive" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
}

type ShopDraft = {
  name: string
  type: CWShopType
  description: string
}

function toDraft(shop?: CWShop): ShopDraft {
  return {
    name: shop?.name ?? '',
    type: shop?.type ?? 'Auto',
    description: shop?.description ?? '',
  }
}

/* ─────────────────────── Component ─────────────────────────── */

export function ShopsPage() {
  const toast = useToast()
  const [shops, setShops] = useState<CWShop[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editShop, setEditShop] = useState<CWShop | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createDraft, setCreateDraft] = useState<ShopDraft>(toDraft())
  const [editDraft, setEditDraft] = useState<ShopDraft>(toDraft())

  useEffect(() => {
    let active = true
    async function loadShops() {
      setLoading(true)
      setError(null)
      try {
        const data = await shopsService.list()
        if (active) setShops(data)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load shops')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadShops()
    return () => {
      active = false
    }
  }, [])

  const sortedShops = useMemo(() => {
    return [...shops].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Active' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [shops])

  /* ── CRUD Operations ── */

  function openCreate() {
    setCreateDraft(toDraft())
    setCreateOpen(true)
  }

  async function submitCreate() {
    if (!createDraft.name.trim()) {
      toast.warning('Enter a shop name before creating the shop.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const created = await shopsService.create({
        name: createDraft.name,
        type: createDraft.type,
        description: createDraft.description,
        status: 'Active',
      })
      setShops((current) => [created, ...current.filter((shop) => shop.id !== created.id)])
      setCreateOpen(false)
      toast.success(`${created.name} was created successfully.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shop')
      toast.error(err, 'Failed to create shop.')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(shop: CWShop) {
    setEditShop(shop)
    setEditDraft(toDraft(shop))
  }

  async function submitEdit() {
    if (!editShop) return
    if (!editDraft.name.trim()) {
      toast.warning('Enter a shop name before saving changes.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await shopsService.update(editShop.id, {
        name: editDraft.name,
        type: editDraft.type,
        description: editDraft.description,
      })
      setShops((current) => current.map((shop) => (shop.id === updated.id ? updated : shop)))
      setEditShop(null)
      toast.success(`${updated.name} was updated successfully.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shop')
      toast.error(err, 'Failed to update shop.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(shop: CWShop) {
    setSaving(true)
    setError(null)
    try {
      const updated = await shopsService.setStatus(
        shop.id,
        shop.status === 'Active' ? 'Inactive' : 'Active',
      )
      setShops((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(`${updated.name} is now ${updated.status.toLowerCase()}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shop status')
      toast.error(err, 'Failed to update shop status.')
    } finally {
      setSaving(false)
    }
  }

  /* ── Table Columns ── */

  const columns: Column<CWShop>[] = [
    {
      key: 'name',
      header: 'Name',
      minWidth: 180,
      render: (shop) => (
        <Box>
          <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
            {shop.name}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400], mt: 0.25 }}>
            {shop.id}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (shop) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
          {shop.type}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (shop) => statusChip(shop.status),
    },
    {
      key: 'description',
      header: 'Description',
      minWidth: 200,
      render: (shop) => (
        <Typography
          sx={{
            fontSize: '0.85rem',
            color: colors.slate[500],
            maxWidth: 520,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {shop.description || '—'}
        </Typography>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (shop) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(shop)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={shop.status === 'Active' ? 'Deactivate' : 'Activate'}>
            <IconButton size="small" onClick={() => void toggleStatus(shop)}>
              {shop.status === 'Active' ? (
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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Shops
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
              Create, edit, and manage workshop shop locations.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreate}
            disabled={saving}
            sx={{
              bgcolor: colors.slate[900],
              fontWeight: 600,
              borderRadius: '10px',
              px: 2.5,
              '&:hover': { bgcolor: colors.slate[800] },
            }}
          >
            New Shop
          </Button>
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ borderRadius: '10px' }}>
            {error}
          </Alert>
        ) : null}

        <DataTable
          columns={columns}
          rows={sortedShops}
          keyExtractor={(shop) => shop.id}
          loading={loading}
          emptyIcon={<Store />}
          emptyTitle="No shops yet"
          emptyDescription="Create your first Shop to begin configuring bays and task templates."
          emptyAction={
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreate}
              disabled={saving}
              sx={{
                bgcolor: colors.slate[900],
                fontWeight: 600,
                borderRadius: '10px',
                '&:hover': { bgcolor: colors.slate[800] },
              }}
            >
              Create Shop
            </Button>
          }
        />

        {/* ── Create Dialog ── */}
        <FormDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create shop"
          icon={<Store />}
          onSubmit={() => void submitCreate()}
          submitLabel="Create"
          submitDisabled={!createDraft.name.trim() || saving}
        >
          <TextField
            label="Shop name"
            value={createDraft.name}
            onChange={(e) => setCreateDraft((d) => ({ ...d, name: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Shop type"
            select
            value={createDraft.type}
            onChange={(e) =>
              setCreateDraft((d) => ({ ...d, type: e.target.value as CWShopType }))
            }
            fullWidth
          >
            {SHOP_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Description"
            value={createDraft.description}
            onChange={(e) => setCreateDraft((d) => ({ ...d, description: e.target.value }))}
            multiline
            minRows={3}
            fullWidth
          />
        </FormDialog>

        {/* ── Edit Dialog ── */}
        <FormDialog
          open={!!editShop}
          onClose={() => setEditShop(null)}
          title="Edit shop"
          icon={<Edit />}
          onSubmit={() => void submitEdit()}
          submitLabel="Save"
          submitDisabled={!editDraft.name.trim() || saving}
        >
          <TextField
            label="Shop name"
            value={editDraft.name}
            onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Shop type"
            select
            value={editDraft.type}
            onChange={(e) =>
              setEditDraft((d) => ({ ...d, type: e.target.value as CWShopType }))
            }
            fullWidth
          >
            {SHOP_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Description"
            value={editDraft.description}
            onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
            multiline
            minRows={3}
            fullWidth
          />
        </FormDialog>
      </Stack>
    </Box>
  )
}
