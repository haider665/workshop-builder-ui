import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import { Dashboard, Store } from '@mui/icons-material'
import { useMemo } from 'react'
import { StatCard } from '../../components/StatCard'
import { SectionCard } from '../../components/SectionCard'
import { useCwStore } from '../../store/cwStore'
import { colors, radii } from '../../theme/tokens'

function fmtTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function bayChipColor(status: string, occupied: boolean): 'default' | 'warning' | 'success' {
  if (status === 'Inactive') return 'default'
  return occupied ? 'warning' : 'success'
}

function bayBorder(status: string, occupied: boolean): string {
  if (status === 'Inactive') return colors.slate[300]
  return occupied ? colors.status.warning : colors.status.success
}

function bayBg(status: string, occupied: boolean): string {
  if (status === 'Inactive') return colors.bg.subtle
  return occupied ? 'rgba(245,158,11,0.04)' : 'rgba(16,185,129,0.04)'
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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
            Bay Management
          </Typography>
          <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
            View all bays and their current occupancy
          </Typography>
        </Box>

        {/* Stats */}
        <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
          <StatCard icon={<Dashboard fontSize="small" />} title="Total Bays" value={activeBays.length} gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" />
          <StatCard icon={<Dashboard fontSize="small" />} title="Occupied" value={occupiedCount} gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" />
          <StatCard icon={<Dashboard fontSize="small" />} title="Available" value={activeBays.length - occupiedCount} gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)" />
        </Stack>

        {/* Bays grouped by shop */}
        {Array.from(baysByShop.entries()).map(([shopId, shopBays]) => (
          <SectionCard
            key={shopId}
            title={shopNameById.get(shopId) ?? 'Unknown Shop'}
            icon={<Store sx={{ fontSize: '1rem' }} />}
            actions={
              <Chip size="small" label={`${shopBays.length} bay${shopBays.length !== 1 ? 's' : ''}`}
                sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: colors.slate[100], color: colors.slate[600] }} />
            }
          >
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
              {shopBays.map((bay) => {
                const items = bayOccupancy.get(bay.id) ?? []
                const isOccupied = items.length > 0
                return (
                  <Box
                    key={bay.id}
                    sx={{
                      p: 2, minWidth: 240, flex: '1 1 240px', maxWidth: 360,
                      borderRadius: radii.sm,
                      border: `2px solid ${bayBorder(bay.status, isOccupied)}`,
                      bgcolor: bayBg(bay.status, isOccupied),
                    }}
                  >
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: colors.slate[900] }}>{bay.name}</Typography>
                      <Chip
                        size="small"
                        label={bay.status === 'Inactive' ? 'Inactive' : isOccupied ? 'Occupied' : 'Available'}
                        color={bayChipColor(bay.status, isOccupied)}
                        sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                      />
                    </Stack>

                    {items.length > 0 ? (
                      <Stack spacing={1}>
                        {items.slice(0, 3).map((item, idx) => (
                          <Box key={idx} sx={{
                            p: 1, bgcolor: colors.bg.card, borderRadius: radii.sm,
                            border: `1px solid ${colors.border.default}`,
                          }}>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: colors.slate[900] }}>{item.vehicleReg}</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>{item.label}</Typography>
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, alignItems: 'center' }}>
                              <Chip size="small" label={item.status}
                                color={item.status === 'Completed' ? 'success' : item.status === 'In Progress' ? 'primary' : 'default'}
                                sx={{ fontWeight: 600, fontSize: '0.65rem' }} />
                              <Typography sx={{ fontSize: '0.68rem', color: colors.slate[500] }}>
                                {fmtTime(item.startAt)} – {fmtTime(item.endAt)}
                              </Typography>
                            </Stack>
                            <Typography sx={{ fontSize: '0.68rem', color: colors.slate[500] }}>SE: {item.seName}</Typography>
                          </Box>
                        ))}
                        {items.length > 3 && (
                          <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>+{items.length - 3} more</Typography>
                        )}
                      </Stack>
                    ) : (
                      <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500], fontStyle: 'italic' }}>
                        No active assignments
                      </Typography>
                    )}
                  </Box>
                )
              })}
            </Stack>
          </SectionCard>
        ))}
      </Stack>
    </Box>
  )
}
