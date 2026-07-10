import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Add, Edit, Inventory, ToggleOff, ToggleOn } from '@mui/icons-material'
import { useState } from 'react'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import { useCwStore } from '../../store/cwStore'
import type { CWPart, CWPartStatus } from '../../types/cw'
import { colors, pageLayout } from '../../theme/tokens'

/* ─────────────────────── Helpers ─────────────────────────── */

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

const btnSx = {
  bgcolor: colors.slate[900],
  fontWeight: 600,
  borderRadius: '10px',
  px: 2.5,
  '&:hover': { bgcolor: colors.slate[800] },
} as const

/* ─────────────────────── Component ─────────────────────────── */

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

  /* ── Table Columns ── */

  const columns: Column<CWPart>[] = [
    {
      key: 'name',
      header: 'Part Name',
      minWidth: 180,
      render: (part) => (
        <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
          {part.name}
        </Typography>
      ),
    },
    {
      key: 'partNumber',
      header: 'Part Number',
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[600] }}>
          {part.partNumber ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700], fontWeight: 500 }}>
          {fmtBDT(part.price)}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (part) => (
        <Chip
          size="small"
          color={part.status === 'Active' ? 'success' : 'default'}
          label={part.status}
          sx={{ fontWeight: 700, fontSize: '0.72rem' }}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (part) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(part)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={part.status === 'Active' ? 'Deactivate' : 'Activate'}>
            <IconButton size="small" onClick={() => toggleStatus(part)}>
              {part.status === 'Inactive' ? (
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
              Parts
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Manage inventory parts for service and repair.</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreate}
            sx={btnSx}
          >
            New Part
          </Button>
        </Stack>

        {/* Table */}
        <DataTable
          columns={columns}
          rows={parts}
          keyExtractor={(part) => part.id}
          emptyIcon={<Inventory />}
          emptyTitle="No parts yet"
          emptyDescription="Add parts to the inventory for SE part request workflow."
          emptyAction={
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreate}
              sx={btnSx}
            >
              Add Part
            </Button>
          }
        />

        {/* ── Create / Edit Dialog ── */}
        <FormDialog
          open={isDialogOpen}
          onClose={closeDialog}
          title={editPart ? 'Edit Part' : 'Create Part'}
          icon={editPart ? <Edit /> : <Inventory />}
          onSubmit={editPart ? submitEdit : submitCreate}
          submitLabel={editPart ? 'Save' : 'Create'}
          submitDisabled={!draft.name.trim()}
        >
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
        </FormDialog>
      </Stack>
    </Box>
  )
}
