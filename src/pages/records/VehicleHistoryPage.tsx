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
    <Page
      title="Vehicle History"
      subtitle="Search registration number and view read-only service history."
      actions={
        <Button
          variant="outlined"
          disabled={!query.trim()}
          onClick={() => navigate(`/vehicle-history/${encodeURIComponent(query.trim())}`)}
        >
          Open
        </Button>
      }
    >
      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={2}>
          <TextField
            label="Registration No"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. CWA-1001"
            fullWidth
          />

          <Divider />

          <Box>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Known vehicles</Typography>
            {filteredRegs.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Registration</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Last activity</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRegs.map((reg) => {
                    const lastIso = lastActivityIsoForRegistration(reg, tasks, jobs)
                    return (
                      <TableRow key={reg} hover>
                        <TableCell sx={{ fontWeight: 800 }}>{reg}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {lastIso ? new Date(lastIso).toLocaleString() : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="contained" onClick={() => navigate(`/vehicle-history/${encodeURIComponent(reg)}`)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <Typography color="text.secondary">No vehicles match.</Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip size="small" label={`Vehicles: ${allRegs.length}`} />
            <Chip size="small" label="F1 outcomes tracked in Milestone 9" />
          </Stack>
        </Stack>
      </Paper>
    </Page>
  )
}
