import { Box, ButtonBase, Chip, Paper, Stack, Typography } from '@mui/material'
import type { KeyboardEvent } from 'react'
import type { CWInspectionCheck } from '../types/cw'

type BlueprintArea = {
  category: string
  title: string
  hint: string
}

const AREAS: BlueprintArea[] = [
  { category: 'Front View', title: 'Front body', hint: 'Bumper, lamps, grille, bonnet and glass' },
  { category: 'System Component', title: 'Engine & systems', hint: 'Powertrain, cooling, electrical and steering' },
  { category: 'Scheduled Maintenance', title: 'Maintenance', hint: 'Fluids, filters, belts and intervals' },
  { category: 'Left View', title: 'Left body', hint: 'Panels, doors, mirror, glass and paint' },
  { category: 'Right View', title: 'Right body', hint: 'Panels, doors, mirror, glass and paint' },
  { category: 'Interior View', title: 'Cabin', hint: 'Controls, restraint, HVAC, trim and safety' },
  { category: 'Rear View', title: 'Rear body', hint: 'Boot, lamps, bumper, glass and closures' },
  { category: 'Tyre/Brake Wire', title: 'Wheels & brakes', hint: 'Tyres, wheels, pads, rotors and wiring' },
  { category: 'Underbody', title: 'Underbody', hint: 'Frame, suspension, exhaust, lines and corrosion' },
]

type Props = {
  checks: CWInspectionCheck[]
  selectedCategory?: string
  onOpenCategory: (category: string) => void
}

function areaColor(items: CWInspectionCheck[], selected: boolean) {
  const inspected = items.filter((item) => item.checked)
  const findings = inspected.map((item) => (item.defectType ?? item.remark ?? '').toLowerCase())
  if (inspected.some((item) => item.condition === 'Bad' || item.result === 'Fail') || findings.some((value) => /body damage|broken|crack|collision|deform/.test(value))) return '#ef4444'
  if (findings.some((value) => /dent|dented/.test(value))) return '#f97316'
  if (findings.some((value) => /scratch|scrape|scuff|paint/.test(value))) return '#eab308'
  if (inspected.some((item) => item.condition === 'Warning' || item.result === 'Advisory' || item.actionRequired) || findings.some(Boolean)) return '#a855f7'
  if (inspected.length > 0) return '#22c55e'
  if (selected) return '#2563eb'
  return '#94a3b8'
}

export function VehicleInspectionBlueprint({ checks, selectedCategory, onOpenCategory }: Props) {
  function zoneProps(category: string) {
    const items = checks.filter((check) => check.category === category)
    const open = () => onOpenCategory(category)
    return {
      fill: areaColor(items, selectedCategory === category),
      onClick: open,
      role: 'button',
      tabIndex: 0,
      'aria-label': 'Inspect ' + category,
      onKeyDown: (event: KeyboardEvent<SVGElement>) => {
        if (event.key === 'Enter' || event.key === ' ') open()
      },
      style: { cursor: 'pointer', transition: 'fill 180ms ease, opacity 180ms ease' },
    }
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: '#f8fafc' }}>
      <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ fontWeight: 850 }}>Vehicle inspection blueprint</Typography>
        <Typography variant="caption" color="text.secondary">
          Complete zone map. Tap the drawing or any section to open its inspection checklist.
        </Typography>
        <Stack direction="row" sx={{ mt: 1, gap: 1.15, flexWrap: 'wrap' }}>
          {[
            ['Passed', '#22c55e'],
            ['Scratch', '#eab308'],
            ['Dent', '#f97316'],
            ['Body damage', '#ef4444'],
            ['Concern', '#a855f7'],
          ].map(([label, color]) => (
            <Stack key={label} direction="row" spacing={0.45} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color }} />
              <Typography sx={{ color: 'text.secondary', fontSize: '.61rem' }}>{label}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
      <Box sx={{ display: { xs: 'block', md: 'grid' }, gridTemplateColumns: 'minmax(300px, .95fr) minmax(330px, 1.05fr)', gap: 0 }}>
        <Box sx={{ p: { xs: 1.25, sm: 2 }, minWidth: 0, display: 'grid', placeItems: 'center', borderRight: { md: '1px solid' }, borderColor: { md: 'divider' } }}>
          <Box sx={{ width: '100%', maxWidth: 385 }}>
            <svg viewBox="0 0 420 660" width="100%" aria-label="Complete interactive top-view vehicle blueprint">
              <defs>
                <filter id="blueprint-shadow" x="-30%" y="-20%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="10" stdDeviation="12" floodOpacity=".16" />
                </filter>
                <pattern id="blueprint-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M20 0H0V20" fill="none" stroke="#cbd5e1" strokeWidth=".7" opacity=".35" />
                </pattern>
              </defs>
              <rect x="8" y="8" width="404" height="644" rx="22" fill="url(#blueprint-grid)" stroke="#cbd5e1" strokeDasharray="5 6" />
              <ellipse cx="210" cy="625" rx="142" ry="18" fill="#0f172a" opacity=".08" />
              <g filter="url(#blueprint-shadow)" stroke="#fff" strokeWidth="5" strokeLinejoin="round">
                <path {...zoneProps('Front View')} d="M116 118 Q128 46 210 30 Q292 46 304 118 L288 174 L132 174 Z" />
                <path {...zoneProps('System Component')} d="M132 174 L288 174 L302 272 L118 272 Z" />
                <path {...zoneProps('Left View')} d="M118 180 Q83 210 76 292 L78 454 Q82 500 112 526 L140 481 L140 222 Z" />
                <path {...zoneProps('Right View')} d="M302 180 Q337 210 344 292 L342 454 Q338 500 308 526 L280 481 L280 222 Z" />
                <path {...zoneProps('Interior View')} d="M140 222 L280 222 L280 481 L140 481 Z" />
                <path {...zoneProps('Rear View')} d="M140 481 L280 481 L304 548 Q286 610 210 628 Q134 610 116 548 Z" />
                <circle {...zoneProps('Tyre/Brake Wire')} cx="91" cy="235" r="22" />
                <circle {...zoneProps('Tyre/Brake Wire')} cx="329" cy="235" r="22" />
                <circle {...zoneProps('Tyre/Brake Wire')} cx="91" cy="470" r="22" />
                <circle {...zoneProps('Tyre/Brake Wire')} cx="329" cy="470" r="22" />
                <path {...zoneProps('Scheduled Maintenance')} d="M154 190 H266 V244 H154 Z" opacity=".88" />
                <path {...zoneProps('Underbody')} d="M164 455 H256 V518 H164 Z" opacity=".9" />
              </g>
              <g pointerEvents="none" fill="#fff" textAnchor="middle" fontFamily="inherit" fontWeight="750">
                <text x="210" y="101" fontSize="15">FRONT</text>
                <text x="210" y="211" fontSize="13">ENGINE</text>
                <text x="210" y="235" fontSize="10">MAINTENANCE</text>
                <text x="210" y="350" fontSize="17">CABIN</text>
                <text x="210" y="496" fontSize="10">UNDERBODY</text>
                <text x="210" y="565" fontSize="15">REAR</text>
                <text x="109" y="360" fontSize="12" transform="rotate(-90 109 360)">LEFT BODY</text>
                <text x="311" y="360" fontSize="12" transform="rotate(90 311 360)">RIGHT BODY</text>
              </g>
              <g pointerEvents="none" fill="none" stroke="#fff" strokeWidth="3" opacity=".42">
                <path d="M158 256 L262 256 L270 322 L150 322 Z" />
                <path d="M150 338 L270 338 L264 449 L156 449 Z" />
              </g>
            </svg>
          </Box>
        </Box>

        <Stack spacing={0} sx={{ bgcolor: 'background.paper' }}>
          {AREAS.map((area, index) => {
            const items = checks.filter((check) => check.category === area.category)
            const completed = items.filter((item) => item.checked).length
            const color = areaColor(items, selectedCategory === area.category)
            return (
              <ButtonBase
                key={area.category}
                onClick={() => onOpenCategory(area.category)}
                sx={{
                  px: { xs: 1.5, sm: 2 },
                  py: 1.35,
                  minHeight: 62,
                  gap: 1.25,
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  borderBottom: index < AREAS.length - 1 ? '1px solid' : 0,
                  borderColor: 'divider',
                  '&:hover': { bgcolor: '#f8fafc' },
                }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, boxShadow: '0 0 0 5px ' + color + '18', flexShrink: 0 }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 780, fontSize: '.8rem' }}>{area.title}</Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: '.68rem', mt: 0.15 }}>{area.hint}</Typography>
                </Box>
                <Chip size="small" label={completed + '/' + items.length} sx={{ height: 23, fontSize: '.65rem', fontWeight: 750 }} />
              </ButtonBase>
            )
          })}
        </Stack>
      </Box>
    </Paper>
  )
}
