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
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWBay, CWBayStatus } from '../../types/cw'
import { baysService } from '../../services/admin/baysService'

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

export function BaysPage() {
  const shops = useCwStore((s) => s.shops)
  const bays = useCwStore((s) => s.bays)

  const [shopId, setShopId] = useState<string>('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editBay, setEditBay] = useState<CWBay | null>(null)
  const [createDraft, setCreateDraft] = useState<BayDraft>(toDraft())
  const [editDraft, setEditDraft] = useState<BayDraft>(toDraft())

  useEffect(() => {
    if (shopId) return
    if (shops.length) setShopId(shops[0]!.id)
  }, [shopId, shops])

  const selectedShop = shops.find((s) => s.id === shopId) ?? null

  const baysForShop = useMemo(() => {
    const list = bays.filter((b) => b.shopId === shopId)
    return list.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Available' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [bays, shopId])

  const hasShops = shops.length > 0
  const hasBays = baysForShop.length > 0

  function openCreate() {
    setCreateDraft({ name: '', status: 'Available' })
    setCreateOpen(true)
  }

  function submitCreate() {
    if (!selectedShop) return
    if (!createDraft.name.trim()) return
    baysService.create({
      shopId: selectedShop.id,
      name: createDraft.name,
      status: createDraft.status,
    })
    setCreateOpen(false)
  }

  function openEdit(bay: CWBay) {
    setEditBay(bay)
    setEditDraft(toDraft(bay))
  }

  function submitEdit() {
    if (!editBay) return
    if (!editDraft.name.trim()) return
    baysService.update(editBay.id, {
      name: editDraft.name,
      status: editDraft.status,
    })
    setEditBay(null)
  }

  function toggleStatus(bay: CWBay) {
    const next: CWBayStatus = bay.status === 'Inactive' ? 'Available' : 'Inactive'
    baysService.setStatus(bay.id, next)
  }

  return (
    <Page
      title="Admin / Bays"
      subtitle="Create, edit, and deactivate bays within a shop (in-memory MVP)."
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={openCreate} disabled={!selectedShop}>
          New Bay
        </Button>
      }
    >
      {!hasShops ? (
        <Paper sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Create a shop first
            </Typography>
            <Typography color="text.secondary">
              Bays belong to a shop. Go to Shops and create at least one shop.
            </Typography>
            <Box>
              <Button variant="contained" component={RouterLink} to="/admin/shops">
                Go to Shops
              </Button>
            </Box>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={2}>
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
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
              <Typography variant="body2" color="text.secondary">
                Occupied status will be derived from assignments later.
              </Typography>
            </Stack>
          </Paper>

          {!hasBays ? (
            <Paper sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  No bays yet
                </Typography>
                <Typography color="text.secondary">
                  Create your first bay for {selectedShop?.name ?? 'this shop'}.
                </Typography>
                <Box>
                  <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
                    Create Bay
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
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {baysForShop.map((bay) => (
                    <TableRow key={bay.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700 }}>{bay.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {bay.id}
                        </Typography>
                      </TableCell>
                      <TableCell>{statusChip(bay.status)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                          <Tooltip title="Edit">
                            <IconButton onClick={() => openEdit(bay)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={bay.status === 'Inactive' ? 'Activate' : 'Deactivate'}>
                            <IconButton onClick={() => toggleStatus(bay)}>
                              {bay.status === 'Inactive' ? (
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
        </Stack>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create bay</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
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
              onChange={(e) => setCreateDraft((d) => ({ ...d, status: e.target.value as CWBayStatus }))}
              fullWidth
            >
              <MenuItem value="Available">Available</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </TextField>
            <Divider />
            <Typography variant="body2" color="text.secondary">
              MVP note: data is stored in-memory only. Refresh clears all bays.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitCreate} disabled={!createDraft.name.trim() || !selectedShop}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editBay} onClose={() => setEditBay(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit bay</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Shop" value={selectedShop?.name ?? ''} disabled fullWidth />
            <TextField
              label="Bay name"
              value={editDraft.name}
              onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Status"
              select
              value={editDraft.status}
              onChange={(e) => setEditDraft((d) => ({ ...d, status: e.target.value as CWBayStatus }))}
              fullWidth
            >
              <MenuItem value="Available">Available</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditBay(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitEdit} disabled={!editDraft.name.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
