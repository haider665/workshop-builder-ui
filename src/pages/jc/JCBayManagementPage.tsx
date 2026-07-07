import {
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useMemo } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

function fmtTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function JCBayManagementPage() {
  const bays = useCwStore((s) => s.bays)
  const shops = useCwStore((s) => s.shops)
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const users = useCwStore((s) => s.users)

  const shopNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of shops) m.set(s.id, s.name)
    return m
  }, [shops])

  const vehicleRegById = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of vehicles) m.set(v.id, v.registrationNo)
    return m
  }, [vehicles])

  const userNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of users) m.set(u.id, u.fullName)
    return m
  }, [users])

  // Group bays by shop
  const baysByShop = useMemo(() => {
    const map = new Map<string, typeof bays>()
    for (const b of bays) {
      const list = map.get(b.shopId) ?? []
      list.push(b)
      map.set(b.shopId, list)
    }
    return map
  }, [bays])

  // Build bay occupancy: items currently assigned to each bay
  const bayOccupancy = useMemo(() => {
    const map = new Map<string, { vehicleReg: string; label: string; status: string; seName: string; startAt?: string; endAt?: string }[]>()
    for (const appt of appointments) {
      if (appt.status === 'Released' || appt.status === 'Payment Done') continue
      const vReg = vehicleRegById.get(appt.vehicleId) ?? '?'

      for (const c of appt.concernItems) {
        if (!c.bayId) continue
        const items = map.get(c.bayId) ?? []
        items.push({
          vehicleReg: vReg,
          label: c.concernName,
          status: c.workStatus ?? 'Pending',
          seName: c.assignedSEUserId ? (userNameById.get(c.assignedSEUserId) ?? '—') : '—',
          startAt: c.plannedStartAt,
          endAt: c.plannedEndAt,
        })
        map.set(c.bayId, items)
      }

      for (const s of appt.serviceItems) {
        // Stage-level bay assignments
        if (s.stageItems?.length) {
          for (const st of s.stageItems) {
            if (!st.bayId) continue
            const items = map.get(st.bayId) ?? []
            items.push({
              vehicleReg: vReg,
              label: `${s.serviceDescription} → ${st.stageName}`,
              status: st.workStatus,
              seName: st.assignedSEUserId ? (userNameById.get(st.assignedSEUserId) ?? '—') : '—',
              startAt: st.plannedStartAt,
              endAt: st.plannedEndAt,
            })
            map.set(st.bayId, items)
          }
        } else if (s.bayId) {
          const items = map.get(s.bayId) ?? []
          items.push({
            vehicleReg: vReg,
            label: s.serviceDescription,
            status: s.workStatus ?? 'Pending',
            seName: s.assignedSEUserId ? (userNameById.get(s.assignedSEUserId) ?? '—') : '—',
            startAt: s.plannedStartAt,
            endAt: s.plannedEndAt,
          })
          map.set(s.bayId, items)
        }
      }
    }
    return map
  }, [appointments, vehicleRegById, userNameById])

  const activeBays = bays.filter((b) => b.status !== 'Inactive')
  const occupiedCount = activeBays.filter((b) => (bayOccupancy.get(b.id)?.length ?? 0) > 0).length

  return (
    <Page title="Bay Management" subtitle="View all bays and their current occupancy">
      <Stack spacing={2.5}>
        {/* Stats */}
        <Stack direction="row" spacing={2}>
          <Paper sx={{ p: 2, flex: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>{activeBays.length}</Typography>
            <Typography variant="body2" color="text.secondary">Total Bays</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: 'warning.main' }}>{occupiedCount}</Typography>
            <Typography variant="body2" color="text.secondary">Occupied</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: 'success.main' }}>{activeBays.length - occupiedCount}</Typography>
            <Typography variant="body2" color="text.secondary">Available</Typography>
          </Paper>
        </Stack>

        {/* Bays grouped by shop */}
        {Array.from(baysByShop.entries()).map(([shopId, shopBays]) => (
          <Paper key={shopId} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography sx={{ fontWeight: 900 }}>{shopNameById.get(shopId) ?? 'Unknown Shop'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {shopBays.length} bay{shopBays.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Stack direction="row" sx={{ p: 2, flexWrap: 'wrap', gap: 2 }}>
              {shopBays.map((bay) => {
                const items = bayOccupancy.get(bay.id) ?? []
                const isOccupied = items.length > 0
                return (
                  <Paper
                    key={bay.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      minWidth: 240,
                      flex: '1 1 240px',
                      maxWidth: 360,
                      borderColor: bay.status === 'Inactive' ? 'grey.300' : isOccupied ? 'warning.main' : 'success.main',
                      borderWidth: 2,
                      bgcolor: bay.status === 'Inactive' ? 'grey.50' : isOccupied ? 'warning.50' : 'success.50',
                    }}
                  >
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography sx={{ fontWeight: 800 }}>{bay.name}</Typography>
                      <Chip
                        size="small"
                        label={bay.status === 'Inactive' ? 'Inactive' : isOccupied ? 'Occupied' : 'Available'}
                        color={bay.status === 'Inactive' ? 'default' : isOccupied ? 'warning' : 'success'}
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>

                    {items.length > 0 ? (
                      <Stack spacing={1}>
                        {items.slice(0, 3).map((item, idx) => (
                          <Box key={idx} sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.vehicleReg}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, alignItems: 'center' }}>
                              <Chip size="small" label={item.status}
                                color={item.status === 'Completed' ? 'success' : item.status === 'In Progress' ? 'primary' : 'default'}
                                sx={{ fontWeight: 600, fontSize: 10 }} />
                              <Typography variant="caption" color="text.secondary">
                                {fmtTime(item.startAt)} – {fmtTime(item.endAt)}
                              </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">SE: {item.seName}</Typography>
                          </Box>
                        ))}
                        {items.length > 3 && (
                          <Typography variant="caption" color="text.secondary">+{items.length - 3} more</Typography>
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No active assignments
                      </Typography>
                    )}
                  </Paper>
                )
              })}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Page>
  )
}
