import {
  Alert,

  Button,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Add, Edit, Groups } from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import type { CWRole, CWTeam, CWTeamStatus, CWUser } from '../../types/cw'
import { rolesService } from '../../services/admin/rolesService'
import { teamsService } from '../../services/admin/teamsService'
import { usersService } from '../../services/admin/usersService'
import { colors } from '../../theme/tokens'

/* ─────────────────────── Helpers ─────────────────────────── */

type TeamDraft = {
  name: string
  seUserId: string
  technicianUserIds: string[]
  status: CWTeamStatus
}

function emptyDraft(): TeamDraft {
  return { name: '', seUserId: '', technicianUserIds: [], status: 'Active' }
}

function toDraft(team?: CWTeam): TeamDraft {
  return {
    name: team?.name ?? '',
    seUserId: team?.seUserId ?? '',
    technicianUserIds: team ? [...team.technicianUserIds] : [],
    status: team?.status ?? 'Active',
  }
}

function statusChip(status: CWTeamStatus) {
  if (status === 'Active') return <Chip size="small" color="success" label="Active" />
  return <Chip size="small" color="default" label="Inactive" />
}

/* ─────────────────────── Component ─────────────────────────── */

export function TeamsPage() {
  const [teams, setTeams] = useState<CWTeam[]>([])
  const [users, setUsers] = useState<CWUser[]>([])
  const [roles, setRoles] = useState<CWRole[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<CWTeam | null>(null)

  const [createDraft, setCreateDraft] = useState<TeamDraft>(emptyDraft())
  const [editDraft, setEditDraft] = useState<TeamDraft>(emptyDraft())

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [teamData, userData, roleData] = await Promise.all([
          teamsService.list(),
          usersService.list(),
          rolesService.list(false),
        ])
        if (!active) return
        setTeams(teamData)
        setUsers(userData)
        setRoles(roleData)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load teams')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const seRoleId = useMemo(() => roles.find((r) => r.name === 'Service Engineer' || r.name === 'SE')?.id, [roles])
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

  /* ── CRUD Operations ── */

  function openCreate() {
    setCreateDraft(emptyDraft())
    setCreateOpen(true)
  }

  function openEdit(team: CWTeam) {
    setEditTeam(team)
    setEditDraft(toDraft(team))
  }

  async function submitCreate() {
    if (!createDraft.name.trim() || !createDraft.seUserId) return
    setSaving(true)
    setError(null)
    try {
      const created = await teamsService.create({
        name: createDraft.name.trim(),
        seUserId: createDraft.seUserId,
        technicianUserIds: createDraft.technicianUserIds,
        status: createDraft.status,
      })
      setTeams((current) => [created, ...current.filter((team) => team.id !== created.id)])
      setCreateOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit() {
    if (!editTeam || !editDraft.name.trim() || !editDraft.seUserId) return
    setSaving(true)
    setError(null)
    try {
      const updated = await teamsService.update(editTeam.id, {
        name: editDraft.name.trim(),
        seUserId: editDraft.seUserId,
        technicianUserIds: editDraft.technicianUserIds,
        status: editDraft.status,
      })
      setTeams((current) => current.map((team) => (team.id === updated.id ? updated : team)))
      setEditTeam(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team')
    } finally {
      setSaving(false)
    }
  }

  /* ── Table Columns ── */

  const columns: Column<CWTeam>[] = [
    {
      key: 'name',
      header: 'Team Name',
      minWidth: 180,
      render: (team) => (
        <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
          {team.name}
        </Typography>
      ),
    },
    {
      key: 'se',
      header: 'Service Engineer',
      render: (team) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
          {userNameById.get(team.seUserId) ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'technicians',
      header: 'Technicians',
      minWidth: 200,
      render: (team) => (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          {team.technicianUserIds.length === 0 ? (
            <Typography sx={{ fontSize: '0.875rem', color: colors.slate[500] }}>None</Typography>
          ) : (
            team.technicianUserIds.map((tid) => (
              <Chip key={tid} size="small" label={userNameById.get(tid) ?? tid} />
            ))
          )}
        </Stack>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (team) => statusChip(team.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (team) => (
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => openEdit(team)} disabled={saving}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ]

  function renderTeamFormFields(
    draft: TeamDraft,
    setDraft: React.Dispatch<React.SetStateAction<TeamDraft>>,
  ) {
    return (
      <>
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
      </>
    )
  }

  /* ── Render ── */

  return (
    <Page
      title="Admin / Teams"
      subtitle="Manage teams with SE and Technician assignments."
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
          New Team
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
        rows={teams}
        keyExtractor={(team) => team.id}
        loading={loading}
        emptyIcon={<Groups />}
        emptyTitle="No teams yet"
        emptyDescription="Create teams to group Service Engineers with Technicians for assignment."
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
            Create Team
          </Button>
        }
      />

      {/* ── Create Dialog ── */}
      <FormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create team"
        icon={<Groups />}
        onSubmit={() => void submitCreate()}
        submitLabel="Create"
        submitDisabled={!createDraft.name.trim() || !createDraft.seUserId || saving}
      >
        {renderTeamFormFields(createDraft, setCreateDraft)}
      </FormDialog>

      {/* ── Edit Dialog ── */}
      <FormDialog
        open={!!editTeam}
        onClose={() => setEditTeam(null)}
        title="Edit team"
        icon={<Edit />}
        onSubmit={() => void submitEdit()}
        submitLabel="Save"
        submitDisabled={!editDraft.name.trim() || !editDraft.seUserId || saving}
      >
        {renderTeamFormFields(editDraft, setEditDraft)}
      </FormDialog>
    </Page>
  )
}
