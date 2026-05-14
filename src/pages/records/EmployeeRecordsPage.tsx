import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

export function EmployeeRecordsPage() {
  const navigate = useNavigate()
  const users = useCwStore((s) => s.users)
  const roles = useCwStore((s) => s.roles)
  const tasks = useCwStore((s) => s.tasks)

  const [query, setQuery] = useState('')

  const roleNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of roles) map.set(r.id, r.name)
    return map
  }, [roles])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = users.slice().sort((a, b) => a.fullName.localeCompare(b.fullName))
    if (!q) return base
    return base.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, query])

  function tasksAssignedTo(userFullName: string) {
    return tasks.filter((t) => {
      if (t.assignedToName === userFullName) return true
      return (t.assignedToNames ?? []).includes(userFullName)
    })
  }

  return (
    <Page title="Employee Records" subtitle="Read-only user task history (in-memory MVP).">
      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={2}>
          <TextField
            label="Search users"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or email"
            fullWidth
          />

          <Divider />

          <Box>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Users</Typography>
            {filteredUsers.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Roles</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Assigned tasks</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const roleNames = (u.roleIds ?? []).map((id) => roleNameById.get(id)).filter(Boolean)
                    const assignedCount = tasksAssignedTo(u.fullName).length
                    return (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 800 }}>{u.fullName}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {u.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {roleNames.length ? roleNames.join(', ') : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={u.status} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {assignedCount}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="contained" onClick={() => navigate(`/employee-records/${encodeURIComponent(u.id)}`)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <Typography color="text.secondary">No users match.</Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip size="small" label={`Users: ${users.length}`} />
            <Chip size="small" label="Performance metrics planned later" />
          </Stack>
        </Stack>
      </Paper>
    </Page>
  )
}
