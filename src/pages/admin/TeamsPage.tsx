import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { Add, Edit } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWTeam, CWTeamStatus } from '../../types/cw'

type TeamDraft = {
  name: string
  seUserId: string
  technicianUserIds: string[]
  status: CWTeamStatus
}

function emptyDraft(): TeamDraft {
  return { name: '', seUserId: '', technicianUserIds: [], status: 'Active' }
}

function toDraft(team: CWTeam): TeamDraft {
  return {
    name: team.name,
    seUserId: team.seUserId,
    technicianUserIds: [...team.technicianUserIds],
    status: team.status,
  }
}

export function TeamsPage() {
  const teams = useCwStore((s) => s.teams)
  const users = useCwStore((s) => s.users)
  const roles = useCwStore((s) => s.roles)
  const createTeam = useCwStore((s) => s.createTeam)
  const updateTeam = useCwStore((s) => s.updateTeam)

  const seRoleId = useMemo(() => roles.find((r) => r.name === 'SE')?.id, [roles])
  const techRoleId = useMemo(() => roles.find((r) => r.name === 'Technician')?.id, [roles])

  const seUsers = useMemo(
    () => users.filter((u) => u.status === 'Active' && seRoleId && u.roleIds.includes(seRoleId)),
    [users, seRoleId],
  )
  const techUsers = useMemo(
    () => users.filter((u) => u.status === 'Active' && techRoleId && u.roleIds.includes(techRoleId)),
    [users, techRoleId],
  )

  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of users) map.set(u.id, u.fullName)
    return map
  }, [users])

  const [createOpen, setCreateOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<CWTeam | null>(null)
  const [draft, setDraft] = useState<TeamDraft>(emptyDraft())

  function openCreate() {
    setDraft(emptyDraft())
    setCreateOpen(true)
  }

  function openEdit(team: CWTeam) {
    setEditTeam(team)
    setDraft(toDraft(team))
  }

  function submitCreate() {
    if (!draft.name.trim() || !draft.seUserId) return
    createTeam({
      name: draft.name.trim(),
      seUserId: draft.seUserId,
      technicianUserIds: draft.technicianUserIds,
      status: draft.status,
    })
    setCreateOpen(false)
  }

  function submitEdit() {
    if (!editTeam || !draft.name.trim() || !draft.seUserId) return
    updateTeam(editTeam.id, {
      name: draft.name.trim(),
      seUserId: draft.seUserId,
      technicianUserIds: draft.technicianUserIds,
      status: draft.status,
    })
    setEditTeam(null)
  }

  const isDialogOpen = createOpen || !!editTeam

  function closeDialog() {
    setCreateOpen(false)
    setEditTeam(null)
  }

  return (
    <Page
      title="Admin / Teams"
      subtitle="Manage teams with SE and Technician assignments."
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={{ fontWeight: 700 }}>
          New Team
        </Button>
      }
    >
      <Stack spacing={2}>
        {teams.length === 0 ? (
          <Paper sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>No teams yet</Typography>
              <Typography color="text.secondary">
                Create teams to group Service Engineers with Technicians for assignment.
              </Typography>
              <Box>
                <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
                  Create Team
                </Button>
              </Box>
            </Stack>
          </Paper>
        ) : (
          <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Team Name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Service Engineer</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Technicians</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{team.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{userNameById.get(team.seUserId) ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {team.technicianUserIds.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">None</Typography>
                        ) : (
                          team.technicianUserIds.map((tid) => (
                            <Chip key={tid} size="small" label={userNameById.get(tid) ?? tid} />
                          ))
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={team.status === 'Active' ? 'success' : 'default'}
                        label={team.status}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => openEdit(team)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
        <DialogTitle>{editTeam ? 'Edit Team' : 'Create Team'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Team Name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Service Engineer"
              select
              value={draft.seUserId}
              onChange={(e) => setDraft((d) => ({ ...d, seUserId: e.target.value }))}
              required
              fullWidth
            >
              <MenuItem value="">— Select SE —</MenuItem>
              {seUsers.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Technicians"
              select
              value={draft.technicianUserIds}
              onChange={(e) => {
                const val = e.target.value
                setDraft((d) => ({
                  ...d,
                  technicianUserIds: typeof val === 'string' ? val.split(',') : (val as string[]),
                }))
              }}
              slotProps={{
                select: { multiple: true },
              }}
              fullWidth
              helperText="Select multiple technicians for this team"
            >
              {techUsers.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Status"
              select
              value={draft.status}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as CWTeamStatus }))}
              fullWidth
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={editTeam ? submitEdit : submitCreate}
            disabled={!draft.name.trim() || !draft.seUserId}
          >
            {editTeam ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
