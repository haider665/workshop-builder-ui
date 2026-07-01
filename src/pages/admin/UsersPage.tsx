import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Add, Block, Edit, PersonAdd, ToggleOff, ToggleOn, Visibility, VisibilityOff } from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import type { CWRole, CWShop, CWUser, CWUserStatus } from '../../types/cw'
import { usersService } from '../../services/admin/usersService'
import { shopsService } from '../../services/admin/shopsService'
import { rolesService } from '../../services/admin/rolesService'
import { colors } from '../../theme/tokens'

/* ─────────────────────── Helpers ─────────────────────────── */

type UserDraft = {
  fullName: string
  email: string
  mobile: string
  roleIds: string[]
  shopIds: string[]
  status: CWUserStatus
  password: string
}

function toDraft(user?: CWUser): UserDraft {
  return {
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    mobile: user?.mobile ?? '',
    roleIds: user?.roleIds ?? [],
    shopIds: user?.shopIds ?? [],
    status: user?.status ?? 'Active',
    password: user?.password ?? '',
  }
}

function statusChip(status: CWUserStatus) {
  if (status === 'Active') return <Chip size="small" color="success" label="Active" />
  if (status === 'Suspended') return <Chip size="small" color="warning" label="Suspended" />
  return <Chip size="small" color="default" label="Inactive" />
}

/* ─────────────────────── Component ─────────────────────────── */

export function UsersPage() {
  const [shops, setShops] = useState<CWShop[]>([])
  const [roles, setRoles] = useState<CWRole[]>([])
  const [users, setUsers] = useState<CWUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<CWUser | null>(null)
  const [createDraft, setCreateDraft] = useState<UserDraft>(toDraft())
  const [editDraft, setEditDraft] = useState<UserDraft>(toDraft())
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    let active = true
    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const [shopData, roleData, userData] = await Promise.all([
          shopsService.list(),
          rolesService.list(false),
          usersService.list(),
        ])
        if (!active) return
        setShops(shopData)
        setRoles(roleData)
        setUsers(userData)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load users')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()
    return () => {
      active = false
    }
  }, [])

  const roleNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of roles) map.set(r.id, r.name)
    return map
  }, [roles])

  const shopNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of shops) map.set(s.id, s.name)
    return map
  }, [shops])

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Active' ? -1 : 1
      return a.fullName.localeCompare(b.fullName)
    })
  }, [users])

  const activeRoles = roles.filter((r) => r.status === 'Active')

  function preferredRoleLabel(roleIds: string[]) {
    const roleId = roleIds[0]
    return roleId ? roleNameById.get(roleId) ?? 'Unknown' : '—'
  }

  /* ── CRUD Operations ── */

  function openCreate() {
    setError(null)
    setCreateDraft({
      fullName: '',
      email: '',
      mobile: '',
      roleIds: [],
      shopIds: [],
      status: 'Active',
      password: '',
    })
    setCreateOpen(true)
  }

  function openEdit(user: CWUser) {
    setError(null)
    setEditUser(user)
    setEditDraft(toDraft(user))
  }

  async function submitCreate() {
    setSaving(true)
    setError(null)
    try {
      const created = await usersService.create({
        fullName: createDraft.fullName,
        email: createDraft.email,
        mobile: createDraft.mobile,
        roleIds: createDraft.roleIds,
        shopIds: createDraft.shopIds,
        status: createDraft.status,
        password: createDraft.password || undefined,
      })
      setUsers((current) => [created, ...current.filter((user) => user.id !== created.id)])
      setCreateOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit() {
    if (!editUser) return
    setSaving(true)
    setError(null)
    try {
      const updated = await usersService.update(editUser.id, {
        fullName: editDraft.fullName,
        email: editDraft.email,
        mobile: editDraft.mobile,
        roleIds: editDraft.roleIds,
        shopIds: editDraft.shopIds,
        status: editDraft.status,
        password: editDraft.password || undefined,
      })
      setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)))
      setEditUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(user: CWUser, status: CWUserStatus) {
    setSaving(true)
    setError(null)
    try {
      const updated = await usersService.setStatus(user.id, status)
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status')
    } finally {
      setSaving(false)
    }
  }

  /* ── Table Columns ── */

  const columns: Column<CWUser>[] = [
    {
      key: 'user',
      header: 'User',
      minWidth: 200,
      render: (u) => (
        <Box>
          <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
            {u.fullName}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500], mt: 0.25 }}>
            {u.email} • {u.mobile}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (u) => (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
          {preferredRoleLabel(u.roleIds) !== '—' ? (
            <Chip size="small" label={preferredRoleLabel(u.roleIds)} />
          ) : (
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>—</Typography>
          )}
        </Stack>
      ),
    },
    {
      key: 'shops',
      header: 'Shops',
      render: (u) => (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
          {u.shopIds.length ? (
            u.shopIds.map((id) => (
              <Chip key={id} size="small" label={shopNameById.get(id) ?? 'Unknown'} />
            ))
          ) : (
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>—</Typography>
          )}
        </Stack>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => statusChip(u.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (u) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title="Edit">
            <span>
              <IconButton size="small" onClick={() => openEdit(u)} disabled={saving}>
                <Edit fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={u.status === 'Active' ? 'Deactivate' : 'Activate'}>
            <span>
              <IconButton
                size="small"
                onClick={() => void setStatus(u, u.status === 'Active' ? 'Inactive' : 'Active')}
                disabled={saving}
              >
                {u.status === 'Active' ? (
                  <ToggleOn fontSize="small" />
                ) : (
                  <ToggleOff fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip
            title={u.status === 'Suspended' ? 'Unsuspend (set Active)' : 'Suspend'}
          >
            <span>
              <IconButton
                size="small"
                onClick={() => void setStatus(u, u.status === 'Suspended' ? 'Active' : 'Suspended')}
                disabled={saving}
              >
                <Block fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  function renderUserFormFields(
    draft: UserDraft,
    setDraft: React.Dispatch<React.SetStateAction<UserDraft>>,
    mode: 'create' | 'edit',
  ) {
    return (
      <>
        <TextField
          label="Full name"
          value={draft.fullName}
          onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))}
          required
          fullWidth
          autoFocus
        />
        <TextField
          label="Email"
          value={draft.email}
          onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
          required
          fullWidth
          autoComplete="off"
        />
        <TextField
          label="Mobile"
          value={draft.mobile}
          onChange={(e) => setDraft((d) => ({ ...d, mobile: e.target.value }))}
          required
          fullWidth
        />

        <FormControl fullWidth>
          <InputLabel id={`${mode}-roles-label`}>Preferred role</InputLabel>
          <Select
            labelId={`${mode}-roles-label`}
            value={draft.roleIds[0] ?? ''}
            onChange={(e) =>
              setDraft((d) => ({ ...d, roleIds: [e.target.value as string] }))
            }
            input={<OutlinedInput label="Preferred role" />}
            renderValue={(selected) => roleNameById.get(selected as string) ?? 'Unknown'}
          >
            {activeRoles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id={`${mode}-shops-label`}>Shops</InputLabel>
          <Select
            labelId={`${mode}-shops-label`}
            multiple
            value={draft.shopIds}
            onChange={(e) =>
              setDraft((d) => ({ ...d, shopIds: e.target.value as string[] }))
            }
            input={<OutlinedInput label="Shops" />}
            renderValue={(selected) =>
              (selected as string[])
                .map((id) => shopNameById.get(id) ?? 'Unknown')
                .join(', ')
            }
          >
            {shops.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Status"
          select
          value={draft.status}
          onChange={(e) =>
            setDraft((d) => ({ ...d, status: e.target.value as CWUserStatus }))
          }
          fullWidth
        >
          <MenuItem value="Active">Active</MenuItem>
          <MenuItem value="Inactive">Inactive</MenuItem>
          <MenuItem value="Suspended">Suspended</MenuItem>
        </TextField>

        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={draft.password}
          onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
          fullWidth
          autoComplete="new-password"
          helperText={
            mode === 'create'
              ? 'Optional. Sent to the backend as the initial Frappe password.'
              : 'Optional. Leave blank to keep the existing password.'
          }
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                    size="small"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </>
    )
  }

  /* ── Render ── */

  return (
    <Page
      title="Admin / Users"
      subtitle="Create users, assign roles and shops from the backend."
      actions={
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreate}
          disabled={!activeRoles.length || saving}
          sx={{
            bgcolor: colors.slate[900],
            fontWeight: 600,
            borderRadius: '10px',
            px: 2.5,
            '&:hover': { bgcolor: colors.slate[800] },
          }}
        >
          New User
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
        rows={sortedUsers}
        keyExtractor={(u) => u.id}
        loading={loading}
        emptyIcon={<PersonAdd />}
        emptyTitle="No users yet"
        emptyDescription="Create your first user to begin assigning roles and shops."
        emptyAction={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreate}
            disabled={!activeRoles.length || saving}
            sx={{
              bgcolor: colors.slate[900],
              fontWeight: 600,
              borderRadius: '10px',
              '&:hover': { bgcolor: colors.slate[800] },
            }}
          >
            Create User
          </Button>
        }
      />

      {/* ── Create Dialog ── */}
      <FormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create user"
        icon={<PersonAdd />}
        onSubmit={() => void submitCreate()}
        submitLabel="Create"
        submitDisabled={
          !createDraft.fullName.trim() ||
          !createDraft.email.trim() ||
          !createDraft.mobile.trim() ||
          !createDraft.roleIds.length ||
          saving
        }
      >
        {error && createOpen ? (
          <Alert severity="error" sx={{ borderRadius: '10px' }}>
            {error}
          </Alert>
        ) : null}
        {renderUserFormFields(createDraft, setCreateDraft, 'create')}
      </FormDialog>

      {/* ── Edit Dialog ── */}
      <FormDialog
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit user"
        icon={<Edit />}
        onSubmit={() => void submitEdit()}
        submitLabel="Save"
        submitDisabled={
          !editDraft.fullName.trim() ||
          !editDraft.email.trim() ||
          !editDraft.mobile.trim() ||
          !editDraft.roleIds.length ||
          saving
        }
      >
        {error && editUser ? (
          <Alert severity="error" sx={{ borderRadius: '10px' }}>
            {error}
          </Alert>
        ) : null}
        {renderUserFormFields(editDraft, setEditDraft, 'edit')}
      </FormDialog>
    </Page>
  )
}
