import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Add, Edit, Security, ToggleOff, ToggleOn } from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import type { CWRole, CWRoleStatus } from '../../types/cw'
import { rolesService } from '../../services/admin/rolesService'
import { colors } from '../../theme/tokens'

/* ─────────────────────── Helpers ─────────────────────────── */

function statusChip(status: CWRoleStatus) {
  if (status === 'Active') return <Chip size="small" color="success" label="Active" />
  return <Chip size="small" color="default" label="Inactive" />
}

type RoleDraft = {
  name: string
}

function toDraft(role?: CWRole): RoleDraft {
  return { name: role?.name ?? '' }
}

/* ─────────────────────── Component ─────────────────────────── */

export function RolesPage() {
  const [roles, setRoles] = useState<CWRole[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editRole, setEditRole] = useState<CWRole | null>(null)
  const [createDraft, setCreateDraft] = useState<RoleDraft>(toDraft())
  const [editDraft, setEditDraft] = useState<RoleDraft>(toDraft())

  useEffect(() => {
    let active = true
    async function loadRoles() {
      setLoading(true)
      setError(null)
      try {
        const data = await rolesService.list(false)
        if (active) setRoles(data)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load roles')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadRoles()
    return () => {
      active = false
    }
  }, [])

  const sortedRoles = useMemo(() => {
    return [...roles].sort((a, b) => {
      if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1
      if (a.status !== b.status) return a.status === 'Active' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [roles])

  /* ── CRUD Operations ── */

  function openCreate() {
    setError(null)
    setCreateDraft(toDraft())
    setCreateOpen(true)
  }

  function openEdit(role: CWRole) {
    setError(null)
    setEditRole(role)
    setEditDraft(toDraft(role))
  }

  async function submitCreate() {
    if (!createDraft.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const created = await rolesService.create({ name: createDraft.name, status: 'Active' })
      setRoles((current) => [created, ...current.filter((role) => role.id !== created.id)])
      setCreateOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role')
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit() {
    if (!editRole) return
    if (!editDraft.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const updated = await rolesService.update(editRole.id, { name: editDraft.name })
      setRoles((current) => current.map((role) => (role.id === updated.id ? updated : role)))
      setEditRole(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(role: CWRole) {
    if (role.isSystem) return
    setSaving(true)
    setError(null)
    try {
      const updated = await rolesService.setStatus(
        role.id,
        role.status === 'Active' ? 'Inactive' : 'Active',
      )
      setRoles((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role status')
    } finally {
      setSaving(false)
    }
  }

  /* ── Table Columns ── */

  const columns: Column<CWRole>[] = [
    {
      key: 'name',
      header: 'Role',
      minWidth: 180,
      render: (role) => (
        <Box>
          <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
            {role.name}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400], mt: 0.25 }}>
            {role.id}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (role) => (
        <Chip
          size="small"
          label={role.isSystem ? 'System' : 'Custom'}
          sx={{
            fontWeight: 600,
            fontSize: '0.75rem',
            color: colors.slate[700],
          }}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (role) => statusChip(role.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (role) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(role)} disabled={saving}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={
              role.isSystem
                ? 'System roles cannot be deactivated'
                : role.status === 'Active'
                  ? 'Deactivate'
                  : 'Activate'
            }
          >
            <span>
              <IconButton
                size="small"
                onClick={() => void toggleStatus(role)}
                disabled={role.isSystem || saving}
              >
                {role.status === 'Active' ? (
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
      title="Admin / Roles"
      subtitle="Create and manage roles from the backend."
      actions={
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
          New Role
        </Button>
      }
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      ) : null}

      <DataTable
        columns={columns}
        rows={sortedRoles}
        keyExtractor={(role) => role.id}
        loading={loading}
        emptyIcon={<Security />}
        emptyTitle="No roles yet"
        emptyDescription="Create your first Role to begin assigning permissions to technicians."
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
            Create Role
          </Button>
        }
      />

      {/* ── Create Dialog ── */}
      <FormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create role"
        icon={<Security />}
        onSubmit={() => void submitCreate()}
        submitLabel="Create"
        submitDisabled={!createDraft.name.trim() || saving}
      >
        <>
          <TextField
            label="Role name"
            value={createDraft.name}
            onChange={(e) => setCreateDraft({ name: e.target.value })}
            required
            fullWidth
            autoFocus
          />
          <Box>
            <Typography variant="body2" sx={{ color: colors.slate[500] }}>
              Only workshop roles are shown here. Custom roles created here will be editable.
            </Typography>
          </Box>
        </>
      </FormDialog>

      {/* ── Edit Dialog ── */}
      <FormDialog
        open={!!editRole}
        onClose={() => setEditRole(null)}
        title="Edit role"
        icon={<Edit />}
        onSubmit={() => void submitEdit()}
        submitLabel="Save"
        submitDisabled={!editDraft.name.trim() || saving}
      >
        <TextField
          label="Role name"
          value={editDraft.name}
          onChange={(e) => setEditDraft({ name: e.target.value })}
          required
          fullWidth
          autoFocus
          disabled={!!editRole?.isSystem}
          helperText={editRole?.isSystem ? 'System roles cannot be renamed in the MVP.' : undefined}
        />
      </FormDialog>
    </Page>
  )
}
