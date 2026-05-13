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
import { useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWRole, CWRoleStatus } from '../../types/cw'
import { rolesService } from '../../services/admin/rolesService'

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

export function RolesPage() {
  const roles = useCwStore((s) => s.roles)

  const [createOpen, setCreateOpen] = useState(false)
  const [editRole, setEditRole] = useState<CWRole | null>(null)
  const [createDraft, setCreateDraft] = useState<RoleDraft>(toDraft())
  const [editDraft, setEditDraft] = useState<RoleDraft>(toDraft())
  const [error, setError] = useState<string | null>(null)

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

  function submitCreate() {
    try {
      setError(null)
      rolesService.create({ name: createDraft.name, status: 'Active' })
      setCreateOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function openEdit(role: CWRole) {
    setError(null)
    setEditRole(role)
    setEditDraft(toDraft(role))
  }

  function submitEdit() {
    if (!editRole) return
    try {
      setError(null)
      rolesService.update(editRole.id, { name: editDraft.name })
      setEditRole(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function toggleStatus(role: CWRole) {
    if (role.isSystem) return
    rolesService.setStatus(role.id, role.status === 'Active' ? 'Inactive' : 'Active')
  }

  return (
    <Page
      title="Admin / Roles"
      subtitle="Create and manage roles (in-memory MVP)."
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          New Role
        </Button>
      }
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
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
                  {role.isSystem ? <Chip size="small" label="System" /> : <Chip size="small" label="Custom" />}
                </TableCell>
                <TableCell>{statusChip(role.status)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => openEdit(role)}>
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
                        <IconButton onClick={() => toggleStatus(role)} disabled={role.isSystem}>
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
                System roles are always present: Admin, Guard, Job Controller.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitCreate} disabled={!createDraft.name.trim()}>
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
          <Button variant="contained" onClick={submitEdit} disabled={!editDraft.name.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
