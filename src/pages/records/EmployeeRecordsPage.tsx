import {
  Box,
  Button,
  Chip,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { People, Search, Assignment } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatCard } from '../../components/StatCard'
import { tableSectionSx, headerCellSx, bodyCellSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import { colors, radii } from '../../theme/tokens'
import { useCwStore } from '../../store/cwStore'
import { useBackendData } from '../../hooks/useCREData'
import { useListPagination } from '../../components/ListPagination'

export function EmployeeRecordsPage() {
  const navigate = useNavigate()
  useBackendData()
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
  const { pageRows, pagination } = useListPagination(filteredUsers)

  function tasksAssignedTo(userFullName: string) {
    return tasks.filter((t) => {
      if (t.assignedToName === userFullName) return true
      return (t.assignedToNames ?? []).includes(userFullName)
    })
  }

  const totalAssigned = useMemo(() => {
    let count = 0
    for (const u of users) count += tasksAssignedTo(u.fullName).length
    return count
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, tasks])

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Employee Records
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Read-only user task history (in-memory MVP).</Typography>
          </Box>
        </Stack>

        {/* Stat cards */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <StatCard icon={<People fontSize="small" />} title="TOTAL USERS" value={users.length} gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" />
          <StatCard icon={<Assignment fontSize="small" />} title="TOTAL ASSIGNED" value={totalAssigned} gradient="linear-gradient(135deg, #334155 0%, #475569 100%)" />
        </Stack>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: '1.1rem', color: colors.slate[400] }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem', bgcolor: colors.bg.page } }}
        />

        {/* Users table */}
        <Box sx={tableSectionSx}>
          <Box sx={tableHeaderSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={tableHeaderIconSx}><People sx={{ fontSize: '1rem' }} /></Box>
              <Typography sx={tableHeaderTitleSx}>USERS</Typography>
              <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>
                {filteredUsers.length}
              </Box>
            </Stack>
          </Box>

          {filteredUsers.length ? (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>User</TableCell>
                  <TableCell>Roles</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assigned Tasks</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageRows.map((u) => {
                  const roleNames = (u.roleIds ?? []).map((id) => roleNameById.get(id)).filter(Boolean)
                  const assignedCount = tasksAssignedTo(u.fullName).length
                  return (
                    <TableRow key={u.id} hover sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>{u.fullName}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>{u.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                          {roleNames.length ? roleNames.join(', ') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={u.status} size="small" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[600], fontWeight: 600 }}>
                          {assignedCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => navigate(`/employee-records/${encodeURIComponent(u.id)}`)}
                          sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No users match.</Typography>
            </Box>
          )}
          {filteredUsers.length ? pagination : null}
        </Box>
      </Stack>
    </Box>
  )
}
