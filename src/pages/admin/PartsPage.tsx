import {
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
import { Add, Edit, Inventory, ToggleOff, ToggleOn } from '@mui/icons-material'
import { useState } from 'react'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import { useCwStore } from '../../store/cwStore'
import type { CWPart, CWPartStatus } from '../../types/cw'
import { colors, pageLayout } from '../../theme/tokens'

/* ─────────────────────── Helpers ─────────────────────────── */

const CATEGORY_PRESETS = [
  'Engine',
  'Brakes',
  'Body',
  'Electrical',
  'Cooling',
  'Transmission',
  'HVAC',
  'Paint',
  'Suspension',
  'Exhaust',
] as const

type PartDraft = {
  name: string
  partNumber: string
  description: string
  category: string
  rackLocation: string
  binNumber: string
  reorderLevel: string
  status: CWPartStatus
}

function emptyDraft(): PartDraft {
  return {
    name: '',
    partNumber: '',
    description: '',
    category: '',
    rackLocation: '',
    binNumber: '',
    reorderLevel: '',
    status: 'Active',
  }
}

function toDraft(part: CWPart): PartDraft {
  return {
    name: part.name,
    partNumber: part.partNumber,
    description: part.description ?? '',
    category: part.category ?? '',
    rackLocation: part.rackLocation ?? '',
    binNumber: part.binNumber ?? '',
    reorderLevel: typeof part.reorderLevel === 'number' ? String(part.reorderLevel) : '',
    status: part.status,
  }
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
    if (!draft.name.trim() || !draft.partNumber.trim()) return
    createPart({
      name: draft.name.trim(),
      partNumber: draft.partNumber.trim(),
      description: draft.description.trim() || undefined,
      category: draft.category || undefined,
      rackLocation: draft.rackLocation.trim() || undefined,
      binNumber: draft.binNumber.trim() || undefined,
      reorderLevel: draft.reorderLevel.trim() ? Number(draft.reorderLevel.trim()) : undefined,
      status: draft.status,
    })
    setCreateOpen(false)
  }

  function submitEdit() {
    if (!editPart || !draft.name.trim() || !draft.partNumber.trim()) return
    updatePart(editPart.id, {
      name: draft.name.trim(),
      partNumber: draft.partNumber.trim(),
      description: draft.description.trim() || undefined,
      category: draft.category || undefined,
      rackLocation: draft.rackLocation.trim() || undefined,
      binNumber: draft.binNumber.trim() || undefined,
      reorderLevel: draft.reorderLevel.trim() ? Number(draft.reorderLevel.trim()) : undefined,
      status: draft.status,
    })
    setEditPart(null)
  }

  function toggleStatus(part: CWPart) {
    const next: CWPartStatus = part.status === 'Active' ? 'Inactive' : 'Active'
    updatePart(part.id, {
      name: part.name,
      partNumber: part.partNumber,
      description: part.description,
      category: part.category,
      rackLocation: part.rackLocation,
      binNumber: part.binNumber,
      reorderLevel: part.reorderLevel,
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
          {part.partNumber}
        </Typography>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (part) =>
        part.category ? (
          <Chip
            size="small"
            label={part.category}
            sx={{ fontWeight: 600, fontSize: '0.72rem' }}
          />
        ) : (
          <Typography sx={{ fontSize: '0.875rem', color: colors.slate[400] }}>—</Typography>
        ),
    },
    {
      key: 'rackLocation',
      header: 'Rack Location',
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', fontFamily: 'monospace', color: colors.slate[600] }}>
          {part.rackLocation ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'reorderLevel',
      header: 'Reorder Level',
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700], fontWeight: 500 }}>
          {typeof part.reorderLevel === 'number' ? part.reorderLevel : '—'}
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
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Manage the part catalog for service and repair.</Typography>
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
          emptyDescription="Add parts to the catalog for SE part request workflow."
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
        </FormDialog>
      </Stack>
    </Box>
  )
}
