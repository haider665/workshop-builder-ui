import {
  Box,
  Button,
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
import { DirectionsCar, Search, WorkHistory } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatCard } from '../../components/StatCard'
import { tableSectionSx, headerCellSx, bodyCellSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import { colors, radii } from '../../theme/tokens'
import { useCwStore } from '../../store/cwStore'
import type { CWJob, CWTask } from '../../types/cw'

function lastActivityIsoForRegistration(reg: string, tasks: CWTask[], jobs: CWJob[]) {
  const taskLatest = tasks
    .filter((t) => t.registrationNo === reg)
    .map((t) => t.updatedAt)
    .sort()
    .at(-1)
  const jobLatest = jobs
    .filter((j) => j.registrationNo === reg)
    .map((j) => j.updatedAt)
    .sort()
    .at(-1)
  return [taskLatest, jobLatest].filter(Boolean).sort().at(-1) ?? null
}

export function VehicleHistoryPage() {
  const navigate = useNavigate()
  const tasks = useCwStore((s) => s.tasks)
  const jobs = useCwStore((s) => s.jobs)
  const pendingVehicles = useCwStore((s) => s.pendingVehicles)

  const [query, setQuery] = useState('')

  const allRegs = useMemo(() => {
    const set = new Set<string>()
    for (const t of tasks) if (t.registrationNo) set.add(t.registrationNo)
    for (const j of jobs) if (j.registrationNo) set.add(j.registrationNo)
    for (const p of pendingVehicles) if (p.registrationNo) set.add(p.registrationNo)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [tasks, jobs, pendingVehicles])

  const filteredRegs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allRegs
    return allRegs.filter((r) => r.toLowerCase().includes(q))
  }, [allRegs, query])

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Vehicle History
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Search registration number and view read-only service history.</Typography>
          </Box>
          <Button
            variant="contained"
            disabled={!query.trim()}
            onClick={() => navigate(`/vehicle-history/${encodeURIComponent(query.trim())}`)}
            sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
          >
            Open
          </Button>
        </Stack>

        {/* Stat cards */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <StatCard icon={<DirectionsCar fontSize="small" />} title="TOTAL VEHICLES" value={allRegs.length} gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" />
          <StatCard icon={<WorkHistory fontSize="small" />} title="MATCHING" value={filteredRegs.length} gradient="linear-gradient(135deg, #334155 0%, #475569 100%)" />
        </Stack>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search registration number, e.g. CWA-1001..."
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

        {/* Vehicles table */}
        <Box sx={tableSectionSx}>
          <Box sx={tableHeaderSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={tableHeaderIconSx}><DirectionsCar sx={{ fontSize: '1rem' }} /></Box>
              <Typography sx={tableHeaderTitleSx}>KNOWN VEHICLES</Typography>
              <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>
                {filteredRegs.length}
              </Box>
            </Stack>
          </Box>

          {filteredRegs.length ? (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Registration</TableCell>
                  <TableCell>Last Activity</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRegs.map((reg) => {
                  const lastIso = lastActivityIsoForRegistration(reg, tasks, jobs)
                  return (
                    <TableRow key={reg} hover sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>{reg}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                          {lastIso ? new Date(lastIso).toLocaleString() : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => navigate(`/vehicle-history/${encodeURIComponent(reg)}`)}
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
              <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No vehicles match.</Typography>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  )
}
