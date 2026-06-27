import {
  Alert,
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
import { useEffect, useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import type { CWRole, CWRoleStatus } from '../../types/cw'
import { rolesService } from '../../services/admin/rolesService'

type RoleDraft = {
  name: string
}

function toDraft(role?: CWRole): RoleDraft {
  return { name: role?.name ?? '' }
}

function statusChip(status: CWRoleStatus) {
  if (status === 'Active') return <Chip size="small" color="success" label="Active" />
  return <Chip size="small" color="default" label="Inactive" />
}

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
        const data = await rolesService.list(true)
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

  return (
    <Page
      title="Admin / Roles"
      subtitle="Create and manage roles from the backend."
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={openCreate} disabled={saving}>
          New Role
        </Button>
      }
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Paper sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
          <Typography color="text.secondary">Loading roles from backend...</Typography>
        </Paper>
      ) : null}

      <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRoles.map((role) => (
              <TableRow key={role.id} hover>
                <TableCell>
                  <Typography sx={{ fontWeight: 700 }}>{role.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {role.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  {role.isSystem ? (
                    <Chip size="small" label="System" />
                  ) : (
                    <Chip size="small" label="Custom" />
                  )}
                </TableCell>
                <TableCell>{statusChip(role.status)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                    <Tooltip title="Edit">
                      <span>
                        <IconButton onClick={() => openEdit(role)} disabled={saving}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </span>
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
                        <IconButton onClick={() => void toggleStatus(role)} disabled={role.isSystem || saving}>
                          {role.status === 'Active' ? (
                            <ToggleOn fontSize="small" />
                          ) : (
                            <ToggleOff fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create role</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Role name"
              value={createDraft.name}
              onChange={(e) => setCreateDraft({ name: e.target.value })}
              required
              fullWidth
              autoFocus
            />
            <Box>
              <Typography variant="body2" color="text.secondary">
                System roles are managed by the backend. Custom roles created here will be editable.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitCreate()} disabled={!createDraft.name.trim() || saving}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editRole} onClose={() => setEditRole(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit role</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
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
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditRole(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void submitEdit()}
            disabled={!editDraft.name.trim() || saving}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
