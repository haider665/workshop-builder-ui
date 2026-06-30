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
import { Add, Edit, Garage, ToggleOff, ToggleOn } from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Page } from '../../components/Page'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import type { CWBay, CWBayStatus, CWShop } from '../../types/cw'
import { baysService } from '../../services/admin/baysService'
import { shopsService } from '../../services/admin/shopsService'
import { colors, radii, shadows } from '../../theme/tokens'

/* ─────────────────────── Helpers ─────────────────────────── */

function statusChip(status: CWBayStatus) {
  if (status === 'Available') return <Chip size="small" color="success" label="Available" />
  if (status === 'Occupied') return <Chip size="small" color="warning" label="Occupied" />
  return <Chip size="small" color="default" label="Inactive" />
}

type BayDraft = {
  name: string
  status: CWBayStatus
}

function toDraft(bay?: CWBay): BayDraft {
  return {
    name: bay?.name ?? '',
    status: bay?.status ?? 'Available',
  }
}

/* ─────────────────────── Component ─────────────────────────── */

export function BaysPage() {
  const [shops, setShops] = useState<CWShop[]>([])
  const [bays, setBays] = useState<CWBay[]>([])
  const [shopId, setShopId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [loadingBays, setLoadingBays] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editBay, setEditBay] = useState<CWBay | null>(null)
  const [createDraft, setCreateDraft] = useState<BayDraft>(toDraft())
  const [editDraft, setEditDraft] = useState<BayDraft>(toDraft())

  useEffect(() => {
    let active = true
    async function loadShops() {
      setLoading(true)
      setError(null)
      try {
        const data = await shopsService.list()
        if (!active) return
        setShops(data)
        if (!shopId && data.length) setShopId(data[0]!.id)
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
    // We intentionally only load shops once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let active = true
    if (!shopId) return

    async function loadBays() {
      setLoadingBays(true)
      setError(null)
      try {
        const data = await baysService.list({ shopId })
        if (active) setBays(data)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load bays')
      } finally {
        if (active) setLoadingBays(false)
      }
    }

    void loadBays()
    return () => {
      active = false
    }
  }, [shopId])

  const selectedShop = shops.find((s) => s.id === shopId) ?? null

  const baysForShop = useMemo(() => {
    return [...bays].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Available' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [bays])

  const hasShops = shops.length > 0

  /* ── CRUD Operations ── */

  function openCreate() {
    setCreateDraft({ name: '', status: 'Available' })
    setCreateOpen(true)
  }

  function openEdit(bay: CWBay) {
    setEditBay(bay)
    setEditDraft(toDraft(bay))
  }

  async function submitCreate() {
    if (!selectedShop) return
    if (!createDraft.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const created = await baysService.create({
        shopId: selectedShop.id,
        name: createDraft.name,
        status: createDraft.status,
      })
      setBays((current) => [created, ...current.filter((bay) => bay.id !== created.id)])
      setCreateOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bay')
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit() {
    if (!editBay) return
    if (!editDraft.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const updated = await baysService.update(editBay.id, {
        name: editDraft.name,
        status: editDraft.status,
      })
      setBays((current) => current.map((bay) => (bay.id === updated.id ? updated : bay)))
      setEditBay(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bay')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(bay: CWBay) {
    const next: CWBayStatus = bay.status === 'Inactive' ? 'Available' : 'Inactive'
    setSaving(true)
    setError(null)
    try {
      const updated = await baysService.setStatus(bay.id, next)
      setBays((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bay status')
    } finally {
      setSaving(false)
    }
  }

  /* ── Table Columns ── */

  const columns: Column<CWBay>[] = [
    {
      key: 'name',
      header: 'Name',
      minWidth: 180,
      render: (bay) => (
        <Box>
          <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
            {bay.name}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400], mt: 0.25 }}>
            {bay.id}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (bay) => statusChip(bay.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (bay) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title="Edit">
            <span>
              <IconButton size="small" onClick={() => openEdit(bay)} disabled={saving}>
                <Edit fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={bay.status === 'Inactive' ? 'Activate' : 'Deactivate'}>
            <span>
              <IconButton size="small" onClick={() => void toggleStatus(bay)} disabled={saving}>
                {bay.status === 'Inactive' ? (
                  <ToggleOn fontSize="small" />
                ) : (
                  <ToggleOff fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  /* ── Render ── */

  return (
    <Page
      title="Bays"
      subtitle="Create, edit, and manage bays within a shop."
      actions={
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreate}
          disabled={!selectedShop || saving}
          sx={{
            bgcolor: colors.slate[900],
            fontWeight: 600,
            borderRadius: '10px',
            px: 2.5,
            '&:hover': { bgcolor: colors.slate[800] },
          }}
        >
          New Bay
        </Button>
      }
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      ) : null}

      {loading ? null : !hasShops ? (
        <Box
          sx={{
            p: 4,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border.default}`,
            background: colors.bg.card,
            boxShadow: shadows.card,
            textAlign: 'center',
          }}
        >
          <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: colors.slate[900] }}>
              Create a shop first
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
              Bays belong to a shop. Go to Shops and create at least one shop.
            </Typography>
            <Button
              variant="contained"
              component={RouterLink}
              to="/admin/shops"
              sx={{
                bgcolor: colors.slate[900],
                fontWeight: 600,
                borderRadius: '10px',
                mt: 1,
                '&:hover': { bgcolor: colors.slate[800] },
              }}
            >
              Go to Shops
            </Button>
          </Stack>
        </Box>
      ) : (
        <Stack spacing={2}>
          {/* Shop filter */}
          <Box
            sx={{
              p: 2,
              borderRadius: radii.lg,
              border: `1px solid ${colors.border.default}`,
              background: colors.bg.card,
              boxShadow: shadows.card,
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { sm: 'center' } }}
            >
              <TextField
                label="Shop"
                select
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                sx={{ minWidth: 260 }}
              >
                {shops.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
              <Box sx={{ flexGrow: 1 }} />
              <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500] }}>
                Occupancy is derived from backend scheduling records.
              </Typography>
            </Stack>
          </Box>

          <DataTable
            columns={columns}
            rows={baysForShop}
            keyExtractor={(bay) => bay.id}
            loading={loadingBays}
            emptyIcon={<Garage />}
            emptyTitle="No bays yet"
            emptyDescription={`Create your first bay for ${selectedShop?.name ?? 'this shop'}.`}
            emptyAction={
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={openCreate}
                disabled={!selectedShop}
                sx={{
                  bgcolor: colors.slate[900],
                  fontWeight: 600,
                  borderRadius: '10px',
                  '&:hover': { bgcolor: colors.slate[800] },
                }}
              >
                Create Bay
              </Button>
            }
          />
        </Stack>
      )}

      {/* ── Create Dialog ── */}
      <FormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create bay"
        icon={<Garage />}
        onSubmit={() => void submitCreate()}
        submitLabel="Create"
        submitDisabled={!createDraft.name.trim() || !selectedShop || saving}
      >
        <TextField label="Shop" value={selectedShop?.name ?? ''} disabled fullWidth />
        <TextField
          label="Bay name"
          value={createDraft.name}
          onChange={(e) => setCreateDraft((d) => ({ ...d, name: e.target.value }))}
          required
          fullWidth
        />
        <TextField
          label="Status"
          select
          value={createDraft.status}
          onChange={(e) =>
            setCreateDraft((d) => ({ ...d, status: e.target.value as CWBayStatus }))
          }
          fullWidth
        >
          <MenuItem value="Available">Available</MenuItem>
          <MenuItem value="Inactive">Inactive</MenuItem>
        </TextField>
      </FormDialog>

      {/* ── Edit Dialog ── */}
      <FormDialog
        open={!!editBay}
        onClose={() => setEditBay(null)}
        title="Edit bay"
        icon={<Edit />}
        onSubmit={() => void submitEdit()}
        submitLabel="Save"
        submitDisabled={!editDraft.name.trim() || saving}
      >
        <TextField
          label="Bay name"
          value={editDraft.name}
          onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
          required
          fullWidth
          autoFocus
        />
        <TextField
          label="Status"
          select
          value={editDraft.status}
          onChange={(e) =>
            setEditDraft((d) => ({ ...d, status: e.target.value as CWBayStatus }))
          }
          fullWidth
        >
          <MenuItem value="Available">Available</MenuItem>
          <MenuItem value="Occupied">Occupied</MenuItem>
          <MenuItem value="Inactive">Inactive</MenuItem>
        </TextField>
      </FormDialog>
    </Page>
  )
}
