import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  IconButton,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
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
import { Add, Block, Edit, ToggleOff, ToggleOn } from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import type { CWRole, CWShop, CWUser, CWUserStatus } from '../../types/cw'
import { usersService } from '../../services/admin/usersService'
import { shopsService } from '../../services/admin/shopsService'
import { rolesService } from '../../services/admin/rolesService'

const WORKSHOP_ROLE_NAMES = new Set([
  'Admin',
  'Guard',
  'Job Creation',
  'CRE',
  'Technician',
  'Service Advisor',
  'Service Engineer',
  'QC',
])

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

  const workshopRoleIds = useMemo(
    () => new Set(roles.filter((role) => WORKSHOP_ROLE_NAMES.has(role.name)).map((role) => role.id)),
    [roles],
  )

  const shopNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of shops) map.set(s.id, s.name)
    return map
  }, [shops])

  const sortedUsers = [...users].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'Active' ? -1 : 1
    return a.fullName.localeCompare(b.fullName)
  })

  const hasShops = shops.length > 0
  const activeRoles = roles.filter((r) => r.status === 'Active' && workshopRoleIds.has(r.id))

  function preferredRoleLabel(roleIds: string[]) {
    const roleId = roleIds.find((id) => workshopRoleIds.has(id))
    return roleId ? roleNameById.get(roleId) ?? 'Unknown' : '—'
  }

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

  return (
    <Page
      title="Admin / Users"
      subtitle="Create users, assign roles and shops from the backend."
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={openCreate} disabled={!hasShops || !activeRoles.length || saving}>
          New User
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
          <Typography color="text.secondary">Loading users, shops, and roles from backend...</Typography>
        </Paper>
      ) : null}

      {!hasShops ? (
        <Paper sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Create a shop first
            </Typography>
            <Typography color="text.secondary">
              Users must be assigned to at least one shop.
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Roles</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Shops</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedUsers.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{u.fullName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {u.email} • {u.mobile}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                      {preferredRoleLabel(u.roleIds) !== '—' ? (
                        <Chip size="small" label={preferredRoleLabel(u.roleIds)} />
                      ) : (
                        <Typography color="text.secondary">—</Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                      {u.shopIds.length ? (
                        u.shopIds.map((id) => (
                          <Chip key={id} size="small" label={shopNameById.get(id) ?? 'Unknown'} />
                        ))
                      ) : (
                        <Typography color="text.secondary">—</Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{statusChip(u.status)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title="Edit">
                        <span>
                          <IconButton onClick={() => openEdit(u)} disabled={saving}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title={u.status === 'Active' ? 'Deactivate' : 'Activate'}>
                        <span>
                          <IconButton
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
                            onClick={() => void setStatus(u, u.status === 'Suspended' ? 'Active' : 'Suspended')}
                            disabled={saving}
                          >
                            <Block fontSize="small" />
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
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create user</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Full name"
              value={createDraft.fullName}
              onChange={(e) => setCreateDraft((d) => ({ ...d, fullName: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Email"
              value={createDraft.email}
              onChange={(e) => setCreateDraft((d) => ({ ...d, email: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Mobile"
              value={createDraft.mobile}
              onChange={(e) => setCreateDraft((d) => ({ ...d, mobile: e.target.value }))}
              required
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="create-roles-label">Preferred role</InputLabel>
              <Select
                labelId="create-roles-label"
                value={createDraft.roleIds[0] ?? ''}
                onChange={(e) =>
                  setCreateDraft((d) => ({ ...d, roleIds: [e.target.value as string] }))
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
              <InputLabel id="create-shops-label">Shops</InputLabel>
              <Select
                labelId="create-shops-label"
                multiple
                value={createDraft.shopIds}
                onChange={(e) =>
                  setCreateDraft((d) => ({ ...d, shopIds: e.target.value as string[] }))
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
              value={createDraft.status}
              onChange={(e) =>
                setCreateDraft((d) => ({ ...d, status: e.target.value as CWUserStatus }))
              }
              fullWidth
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
              <MenuItem value="Suspended">Suspended</MenuItem>
            </TextField>

            <TextField
              label="Password"
              type="password"
              value={createDraft.password}
              onChange={(e) => setCreateDraft((d) => ({ ...d, password: e.target.value }))}
              fullWidth
              helperText="Optional. Sent to the backend as the initial Frappe password."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void submitCreate()}
            disabled={
              !createDraft.fullName.trim() ||
              !createDraft.email.trim() ||
              !createDraft.mobile.trim() ||
              !createDraft.roleIds.length ||
              !createDraft.shopIds.length ||
              saving
            }
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editUser} onClose={() => setEditUser(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit user</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Full name"
              value={editDraft.fullName}
              onChange={(e) => setEditDraft((d) => ({ ...d, fullName: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Email"
              value={editDraft.email}
              onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Mobile"
              value={editDraft.mobile}
              onChange={(e) => setEditDraft((d) => ({ ...d, mobile: e.target.value }))}
              required
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="edit-roles-label">Preferred role</InputLabel>
              <Select
                labelId="edit-roles-label"
                value={editDraft.roleIds[0] ?? ''}
                onChange={(e) =>
                  setEditDraft((d) => ({ ...d, roleIds: [e.target.value as string] }))
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
              <InputLabel id="edit-shops-label">Shops</InputLabel>
              <Select
                labelId="edit-shops-label"
                multiple
                value={editDraft.shopIds}
                onChange={(e) =>
                  setEditDraft((d) => ({ ...d, shopIds: e.target.value as string[] }))
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
              value={editDraft.status}
              onChange={(e) =>
                setEditDraft((d) => ({ ...d, status: e.target.value as CWUserStatus }))
              }
              fullWidth
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
              <MenuItem value="Suspended">Suspended</MenuItem>
            </TextField>

            <TextField
              label="Password"
              type="password"
              value={editDraft.password}
              onChange={(e) => setEditDraft((d) => ({ ...d, password: e.target.value }))}
              fullWidth
              helperText="Optional. Leave blank to keep the existing password."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditUser(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void submitEdit()}
            disabled={
              !editDraft.fullName.trim() ||
              !editDraft.email.trim() ||
              !editDraft.mobile.trim() ||
              !editDraft.roleIds.length ||
              !editDraft.shopIds.length ||
              saving
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
