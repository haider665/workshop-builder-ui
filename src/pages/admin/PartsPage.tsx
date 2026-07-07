import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import { useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWPart, CWPartStatus } from '../../types/cw'

type PartDraft = {
  name: string
  partNumber: string
  price: string
  status: CWPartStatus
}

function emptyDraft(): PartDraft {
  return { name: '', partNumber: '', price: '', status: 'Active' }
}

function toDraft(part: CWPart): PartDraft {
  return {
    name: part.name,
    partNumber: part.partNumber ?? '',
    price: typeof part.price === 'number' ? String(part.price) : '',
    status: part.status,
  }
}

function fmtBDT(n?: number) {
  if (typeof n !== 'number') return '—'
  return `BDT ${n.toLocaleString('en-BD')}`
}

export function PartsPage() {
  const parts = useCwStore((s) => s.parts)
  const createPart = useCwStore((s) => s.createPart)
  const updatePart = useCwStore((s) => s.updatePart)

  const [createOpen, setCreateOpen] = useState(false)
  const [editPart, setEditPart] = useState<CWPart | null>(null)
  const [draft, setDraft] = useState<PartDraft>(emptyDraft())

  function openCreate() {
    setDraft(emptyDraft())
    setCreateOpen(true)
  }

  function openEdit(part: CWPart) {
    setEditPart(part)
    setDraft(toDraft(part))
  }

  function submitCreate() {
    if (!draft.name.trim()) return
    createPart({
      name: draft.name.trim(),
      partNumber: draft.partNumber.trim() || undefined,
      price: draft.price.trim() ? Number(draft.price.trim()) : undefined,
      status: draft.status,
    })
    setCreateOpen(false)
  }

  function submitEdit() {
    if (!editPart || !draft.name.trim()) return
    updatePart(editPart.id, {
      name: draft.name.trim(),
      partNumber: draft.partNumber.trim() || undefined,
      price: draft.price.trim() ? Number(draft.price.trim()) : undefined,
      status: draft.status,
    })
    setEditPart(null)
  }

  function toggleStatus(part: CWPart) {
    const next: CWPartStatus = part.status === 'Active' ? 'Inactive' : 'Active'
    updatePart(part.id, {
      name: part.name,
      partNumber: part.partNumber,
      price: part.price,
      status: next,
    })
  }

  const isDialogOpen = createOpen || !!editPart

  function closeDialog() {
    setCreateOpen(false)
    setEditPart(null)
  }

  return (
    <Page
      title="Admin / Parts"
      subtitle="Manage inventory parts for service and repair."
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={{ fontWeight: 700 }}>
          New Part
        </Button>
      }
    >
      <Stack spacing={2}>
        {parts.length === 0 ? (
          <Paper sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>No parts yet</Typography>
              <Typography color="text.secondary">
                Add parts to the inventory for SE part request workflow.
              </Typography>
              <Box>
                <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
                  Add Part
                </Button>
              </Box>
            </Stack>
          </Paper>
        ) : (
          <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Part Name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Part Number</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parts.map((part) => (
                  <TableRow key={part.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{part.name}</Typography>
                    </TableCell>
                    <TableCell>{part.partNumber ?? '—'}</TableCell>
                    <TableCell>{fmtBDT(part.price)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={part.status === 'Active' ? 'success' : 'default'}
                        label={part.status}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                        <Tooltip title="Edit">
                          <IconButton onClick={() => openEdit(part)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={part.status === 'Active' ? 'Deactivate' : 'Activate'}>
                          <IconButton onClick={() => toggleStatus(part)}>
                            {part.status === 'Inactive' ? (
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

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editPart ? 'Edit Part' : 'Create Part'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Part Name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Part Number (optional)"
              value={draft.partNumber}
              onChange={(e) => setDraft((d) => ({ ...d, partNumber: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Price (BDT, optional)"
              type="number"
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={editPart ? submitEdit : submitCreate}
            disabled={!draft.name.trim()}
          >
            {editPart ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
