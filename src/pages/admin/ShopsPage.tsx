import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Add, Edit, ToggleOff, ToggleOn } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWShop, CWShopStatus, CWShopType } from '../../types/cw'
import { shopsService } from '../../services/admin/shopsService'

const SHOP_TYPES: CWShopType[] = [
  'Auto',
  'Paint',
  'Body',
  'Quick Service',
  'Diagnostics',
  'Custom',
]

function statusChip(status: CWShopStatus) {
  if (status === 'Active') return <Chip size="small" color="success" label="Active" />
  return <Chip size="small" color="default" label="Inactive" />
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

export function ShopsPage() {
  const shops = useCwStore((s) => s.shops)

  const [createOpen, setCreateOpen] = useState(false)
  const [editShop, setEditShop] = useState<CWShop | null>(null)

  const [createDraft, setCreateDraft] = useState<ShopDraft>(toDraft())
  const [editDraft, setEditDraft] = useState<ShopDraft>(toDraft())

  const hasShops = shops.length > 0

  const sortedShops = useMemo(() => {
    return [...shops].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Active' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [shops])

  function openCreate() {
    setCreateDraft(toDraft())
    setCreateOpen(true)
  }

  function submitCreate() {
    if (!createDraft.name.trim()) return
    shopsService.create({
      name: createDraft.name,
      type: createDraft.type,
      description: createDraft.description,
      status: 'Active',
    })
    setCreateOpen(false)
  }

  function openEdit(shop: CWShop) {
    setEditShop(shop)
    setEditDraft(toDraft(shop))
  }

  function submitEdit() {
    if (!editShop) return
    if (!editDraft.name.trim()) return
    shopsService.update(editShop.id, {
      name: editDraft.name,
      type: editDraft.type,
      description: editDraft.description,
    })
    setEditShop(null)
  }

  function toggleStatus(shop: CWShop) {
    shopsService.setStatus(shop.id, shop.status === 'Active' ? 'Inactive' : 'Active')
  }

  return (
    <Page
      title="Admin / Shops"
      subtitle="Create, edit, activate, and deactivate shops (in-memory MVP)."
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          New Shop
        </Button>
      }
    >
      {!hasShops ? (
        <Paper sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              No shops yet
            </Typography>
            <Typography color="text.secondary">
              Create your first Shop to begin configuring bays and task templates.
            </Typography>
            <Box>
              <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
                Create Shop
              </Button>
            </Box>
          </Stack>
        </Paper>
      ) : (
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Description</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedShops.map((shop) => (
                <TableRow key={shop.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{shop.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {shop.id}
                    </Typography>
                  </TableCell>
                  <TableCell>{shop.type}</TableCell>
                  <TableCell>{statusChip(shop.status)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
                      {shop.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => openEdit(shop)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={shop.status === 'Active' ? 'Deactivate' : 'Activate'}>
                        <IconButton onClick={() => toggleStatus(shop)}>
                          {shop.status === 'Active' ? (
                            <ToggleOn fontSize="small" />
                          ) : (
                            <ToggleOff fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create shop</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
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
              onChange={(e) =>
                setCreateDraft((d) => ({ ...d, description: e.target.value }))
              }
              multiline
              minRows={3}
              fullWidth
            />
            <Divider />
            <Typography variant="body2" color="text.secondary">
              MVP note: data is stored in-memory only. Refresh clears all shops.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitCreate} disabled={!createDraft.name.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editShop} onClose={() => setEditShop(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit shop</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
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
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditShop(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitEdit} disabled={!editDraft.name.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
