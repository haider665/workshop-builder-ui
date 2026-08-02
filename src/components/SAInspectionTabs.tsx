import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { CameraAlt, Close, DirectionsCarFilledOutlined, EditNoteOutlined } from '@mui/icons-material'
import { useMemo, useRef, useState } from 'react'
import type { CWInspectionCheck, CWInspectionCondition } from '../types/cw'

const TABS = [
  'System Component',
  'Scheduled Maintenance',
  'Tyre/Brake Wire',
  'Underbody',
  'Front View',
  'Right View',
  'Left View',
  'Rear View',
  'Interior View',
  'Photos',
] as const

const CONDITIONS: CWInspectionCondition[] = ['Good', 'Warning', 'Bad']

type InspectionCategory = (typeof TABS)[number]

const VISUAL_AREAS: Array<{ category: InspectionCategory; title: string; hint: string }> = [
  { category: 'Front View', title: 'Front', hint: 'Lights, bumper, grille & windshield' },
  { category: 'System Component', title: 'Engine & systems', hint: 'Engine, battery, cooling & steering' },
  { category: 'Left View', title: 'Left side', hint: 'Doors, mirror, windows & body' },
  { category: 'Interior View', title: 'Cabin', hint: 'Interior controls, seats & safety' },
  { category: 'Right View', title: 'Right side', hint: 'Doors, mirror, windows & body' },
  { category: 'Rear View', title: 'Rear', hint: 'Tail lights, boot, bumper & glass' },
  { category: 'Tyre/Brake Wire', title: 'Wheels & brakes', hint: 'Tyres, pads, rotors & wiring' },
  { category: 'Underbody', title: 'Underbody', hint: 'Frame, exhaust, pans & suspension' },
  { category: 'Scheduled Maintenance', title: 'Maintenance', hint: 'Fluids, filters & belts' },
]

function areaColor(items: CWInspectionCheck[], selected: boolean) {
  if (selected) return '#2563eb'
  if (items.some((item) => item.checked && item.condition === 'Bad')) return '#dc2626'
  if (items.some((item) => item.checked && item.condition === 'Warning')) return '#d97706'
  if (items.length > 0 && items.every((item) => item.checked)) return '#16a34a'
  if (items.some((item) => item.checked)) return '#0891b2'
  return '#94a3b8'
}

function conditionColor(c?: CWInspectionCondition): 'success' | 'warning' | 'error' | 'default' {
  if (c === 'Good') return 'success'
  if (c === 'Warning') return 'warning'
  if (c === 'Bad') return 'error'
  return 'default'
}

type Props = {
  checks: CWInspectionCheck[]
  onChange: (checks: CWInspectionCheck[]) => void
  readonly?: boolean
}

export function SAInspectionTabs({ checks, onChange, readonly }: Props) {
  const [mode, setMode] = useState<'visual' | 'manual'>('visual')
  const [activeTab, setActiveTab] = useState(0)
  const [selectedArea, setSelectedArea] = useState<InspectionCategory>('Front View')
  const [visualDialogOpen, setVisualDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null)

  const tabName = TABS[activeTab] ?? TABS[0]

  const tabChecks = checks.filter((c) => c.category === tabName)
  const selectedChecks = checks.filter((c) => c.category === selectedArea)
  const selectedDetails = VISUAL_AREAS.find((area) => area.category === selectedArea) ?? VISUAL_AREAS[0]
  const visualCounts = useMemo(() => new Map(VISUAL_AREAS.map((area) => {
    const items = checks.filter((check) => check.category === area.category)
    return [area.category, { total: items.length, checked: items.filter((item) => item.checked).length }]
  })), [checks])

  function updateCheck(id: string, patch: Partial<CWInspectionCheck>) {
    onChange(checks.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function handlePhotoClick(checkId: string) {
    setPhotoTargetId(checkId)
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !photoTargetId) return

    const reader = new FileReader()
    reader.onload = () => {
      updateCheck(photoTargetId, { photoUrl: reader.result as string })
      setPhotoTargetId(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Count per tab
  const tabCounts = TABS.map((tab) => {
    const items = checks.filter((c) => c.category === tab)
    const checked = items.filter((c) => c.checked).length
    return { tab, total: items.length, checked }
  })

  const displayedChecks = mode === 'visual' ? selectedChecks : tabChecks

  function openVisualArea(category: InspectionCategory) {
    setSelectedArea(category)
    setVisualDialogOpen(true)
  }

  function zoneProps(category: InspectionCategory) {
    const items = checks.filter((check) => check.category === category)
    return {
      fill: areaColor(items, selectedArea === category),
      onClick: () => openVisualArea(category),
      role: 'button',
      tabIndex: 0,
      'aria-label': 'Inspect ' + category,
      onKeyDown: (event: React.KeyboardEvent<SVGElement>) => {
        if (event.key === 'Enter' || event.key === ' ') openVisualArea(category)
      },
      style: { cursor: 'pointer', transition: 'fill 180ms ease' },
    }
  }

  return (
    <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)' }}>
      <Box sx={{ p: 2.5, pb: 0 }}>
        <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: 'text.primary', mb: 1 }}>
          Vehicle Health Check Inspection
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {checks.filter((c) => c.checked).length} / {checks.length} items checked
        </Typography>
      </Box>

      <Tabs
        value={mode}
        onChange={(_, value: 'visual' | 'manual') => setMode(value)}
        sx={{
          px: { xs: 1, sm: 2 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 750 },
        }}
      >
        <Tab value="visual" icon={<DirectionsCarFilledOutlined />} iconPosition="start" label="Visual Inspection" />
        <Tab value="manual" icon={<EditNoteOutlined />} iconPosition="start" label="Manual Input" />
      </Tabs>

      {mode === 'visual' && (
        <Box sx={{ bgcolor: '#f8fafc', p: { xs: 1.5, sm: 2.5 }, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 0.9fr) minmax(320px, 1.1fr)' }, gap: 2.5, alignItems: 'center' }}>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 1.5 }}>
              <Typography sx={{ fontWeight: 800, px: 0.5 }}>Tap a vehicle area</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                Green is complete, amber is a warning and red needs attention.
              </Typography>
              <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
                <svg viewBox="0 0 420 660" width="100%" aria-label="Interactive top view of vehicle">
                  <defs>
                    <filter id="vehicle-shadow" x="-30%" y="-20%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="10" stdDeviation="12" floodOpacity="0.18" />
                    </filter>
                  </defs>
                  <ellipse cx="210" cy="625" rx="142" ry="18" fill="#0f172a" opacity="0.09" />
                  <g filter="url(#vehicle-shadow)" stroke="#fff" strokeWidth="5" strokeLinejoin="round">
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
                  </g>
                  <g pointerEvents="none" fill="#fff" textAnchor="middle" fontFamily="inherit" fontWeight="700">
                    <text x="210" y="101" fontSize="16">FRONT</text>
                    <text x="210" y="222" fontSize="15">ENGINE</text>
                    <text x="210" y="350" fontSize="18">CABIN</text>
                    <text x="210" y="555" fontSize="16">REAR</text>
                    <text x="110" y="356" fontSize="13" transform="rotate(-90 110 356)">LEFT SIDE</text>
                    <text x="310" y="356" fontSize="13" transform="rotate(90 310 356)">RIGHT SIDE</text>
                  </g>
                  <g pointerEvents="none" fill="none" stroke="#fff" strokeWidth="3" opacity="0.5">
                    <path d="M158 244 L262 244 L270 322 L150 322 Z" />
                    <path d="M150 338 L270 338 L264 449 L156 449 Z" />
                  </g>
                </svg>
              </Box>
            </Paper>

            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1 }}>
                {VISUAL_AREAS.map((area) => {
                  const count = visualCounts.get(area.category) ?? { checked: 0, total: 0 }
                  return (
                    <Button
                      key={area.category}
                      onClick={() => openVisualArea(area.category)}
                      variant={selectedArea === area.category ? 'contained' : 'outlined'}
                      sx={{ minWidth: 0, minHeight: 58, px: 1.25, borderRadius: 2, textTransform: 'none', textAlign: 'left' }}
                    >
                      <Box sx={{ width: '100%' }}>
                        <Typography component="span" sx={{ display: 'block', fontWeight: 750, fontSize: '0.76rem', lineHeight: 1.25 }}>
                          {area.title}
                        </Typography>
                        <Typography component="span" sx={{ display: 'block', opacity: 0.8, fontSize: '0.67rem', mt: 0.25 }}>
                          {count.checked}/{count.total}
                        </Typography>
                      </Box>
                    </Button>
                  )
                })}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                Choose an area to open its focused inspection checklist.
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {mode === 'manual' && (
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': { fontWeight: 700, minHeight: 48, textTransform: 'none', fontSize: '0.85rem' },
        }}
      >
        {TABS.map((tab, i) => (
          <Tab
            key={tab}
            label={
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <span>{tab}</span>
                <Chip
                  size="small"
                  label={`${tabCounts[i]!.checked}/${tabCounts[i]!.total}`}
                  color={tabCounts[i]!.checked === tabCounts[i]!.total && tabCounts[i]!.total > 0 ? 'success' : 'default'}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Stack>
            }
          />
        ))}
      </Tabs>
      )}

      {mode === 'manual' && (
      <Box sx={{ p: 2.5 }}>
        {displayedChecks.length === 0 ? (
          <Typography color="text.secondary">No items in this category.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {displayedChecks.map((check) => (
              <Box
                key={check.id}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: check.checked ? 'success.light' : 'divider',
                  bgcolor: check.checked ? 'success.50' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}>
                  <Checkbox
                    checked={check.checked}
                    onChange={() => !readonly && updateCheck(check.id, { checked: !check.checked })}
                    disabled={readonly}
                    sx={{ mt: -0.5 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: check.checked ? 700 : 500 }}>
                      {check.label}
                    </Typography>
                    {check.section && (
                      <Typography variant="caption" color="text.secondary">
                        {check.section}
                      </Typography>
                    )}

                    {!readonly && check.checked && (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
                        <TextField
                          select
                          size="small"
                          label="Condition"
                          value={check.condition ?? ''}
                          onChange={(e) => updateCheck(check.id, { condition: (e.target.value || undefined) as CWInspectionCondition | undefined })}
                          sx={{ minWidth: 120 }}
                        >
                          <MenuItem value="">—</MenuItem>
                          {CONDITIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </TextField>
                        <TextField
                          size="small"
                          label="Remark"
                          value={check.remark ?? ''}
                          onChange={(e) => updateCheck(check.id, { remark: e.target.value })}
                          sx={{ flex: 1 }}
                          placeholder="Add notes..."
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<CameraAlt />}
                          onClick={() => handlePhotoClick(check.id)}
                          sx={{ minWidth: 100 }}
                        >
                          {check.photoUrl ? 'Replace' : 'Photo'}
                        </Button>
                      </Stack>
                    )}

                    {/* Show condition chip and photo preview */}
                    {check.condition && (
                      <Box sx={{ mt: 0.5 }}>
                        <Chip size="small" label={check.condition} color={conditionColor(check.condition)} />
                      </Box>
                    )}
                    {check.remark && readonly && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Remark: {check.remark}
                      </Typography>
                    )}
                    {check.photoUrl && (
                      <Box
                        component="img"
                        src={check.photoUrl}
                        alt="Inspection photo"
                        sx={{ mt: 1, maxHeight: 120, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                      />
                    )}
                  </Box>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Dialog
        open={visualDialogOpen}
        onClose={() => setVisualDialogOpen(false)}
        fullWidth
        maxWidth="md"
        fullScreen={false}
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: 0, sm: 3 },
              m: { xs: 0, sm: 2 },
              width: { xs: '100%', sm: 'calc(100% - 32px)' },
              maxHeight: { xs: '100%', sm: 'calc(100% - 48px)' },
              height: { xs: '100%', sm: 'auto' },
            },
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pr: 7 }}>
          <Typography sx={{ fontWeight: 850, fontSize: '1.1rem' }}>{selectedDetails.title}</Typography>
          <Typography variant="body2" color="text.secondary">{selectedDetails.hint}</Typography>
          <Chip
            size="small"
            label={selectedChecks.filter((check) => check.checked).length + '/' + selectedChecks.length + ' checked'}
            color={selectedChecks.length > 0 && selectedChecks.every((check) => check.checked) ? 'success' : 'default'}
            sx={{ mt: 1 }}
          />
          <IconButton
            aria-label="Close inspection"
            onClick={() => setVisualDialogOpen(false)}
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#f8fafc' }}>
          {selectedChecks.length === 0 ? (
            <Typography color="text.secondary">No items in this category.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {selectedChecks.map((check) => (
                <Box
                  key={check.id}
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: check.checked ? 'success.light' : 'divider',
                    bgcolor: check.checked ? 'rgba(34, 197, 94, 0.06)' : 'background.paper',
                  }}
                >
                  <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}>
                    <Checkbox
                      checked={check.checked}
                      onChange={() => !readonly && updateCheck(check.id, { checked: !check.checked })}
                      disabled={readonly}
                      sx={{ mt: -0.5 }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: check.checked ? 700 : 500 }}>{check.label}</Typography>
                      {check.section && <Typography variant="caption" color="text.secondary">{check.section}</Typography>}
                      {!readonly && check.checked && (
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
                          <TextField
                            select
                            size="small"
                            label="Condition"
                            value={check.condition ?? ''}
                            onChange={(event) => updateCheck(check.id, {
                              condition: (event.target.value || undefined) as CWInspectionCondition | undefined,
                            })}
                            sx={{ minWidth: { md: 132 } }}
                          >
                            <MenuItem value="">—</MenuItem>
                            {CONDITIONS.map((condition) => <MenuItem key={condition} value={condition}>{condition}</MenuItem>)}
                          </TextField>
                          <TextField
                            size="small"
                            label="Remark"
                            value={check.remark ?? ''}
                            onChange={(event) => updateCheck(check.id, { remark: event.target.value })}
                            sx={{ flex: 1 }}
                            placeholder="Add notes..."
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CameraAlt />}
                            onClick={() => handlePhotoClick(check.id)}
                          >
                            {check.photoUrl ? 'Replace' : 'Photo'}
                          </Button>
                        </Stack>
                      )}
                      {check.condition && (
                        <Box sx={{ mt: 0.75 }}>
                          <Chip size="small" label={check.condition} color={conditionColor(check.condition)} />
                        </Box>
                      )}
                      {check.remark && readonly && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Remark: {check.remark}
                        </Typography>
                      )}
                      {check.photoUrl && (
                        <Box
                          component="img"
                          src={check.photoUrl}
                          alt="Inspection photo"
                          sx={{ mt: 1, maxWidth: '100%', maxHeight: 140, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                        />
                      )}
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  )
}
