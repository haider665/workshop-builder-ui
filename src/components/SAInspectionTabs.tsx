import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { CameraAlt, Close, DirectionsCarFilledOutlined, EditNoteOutlined, FactCheckOutlined, KeyboardArrowDown, Search, ThreeDRotationRounded } from '@mui/icons-material'
import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import type { CWInspectionCheck, CWInspectionCondition, CWVehicle, CWVehicleViewCheck } from '../types/cw'
import { EngineeringInspectionFields } from './EngineeringInspectionFields'
import { VehicleInspectionBlueprint } from './VehicleInspectionBlueprint'

const EngineeringVehicleViews = lazy(() => import('./EngineeringVehicleViews').then((module) => ({
  default: module.EngineeringVehicleViews,
})))

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
  defaultCollapsed?: boolean
  vehicle?: CWVehicle | null
  vehicleViewChecks?: CWVehicleViewCheck[]
}

export function SAInspectionTabs({ checks, onChange, readonly, defaultCollapsed = false, vehicle, vehicleViewChecks = [] }: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [sectionCollapsed, setSectionCollapsed] = useState(defaultCollapsed)
  const [mode, setMode] = useState<'blueprint' | 'threeDimensional' | 'manual' | 'complete'>('blueprint')
  const [activeTab, setActiveTab] = useState(0)
  const [selectedArea, setSelectedArea] = useState<InspectionCategory>('Front View')
  const [visualDialogOpen, setVisualDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null)
  const [completeSearch, setCompleteSearch] = useState('')
  const [completeFilter, setCompleteFilter] = useState<'all' | 'incomplete' | 'attention' | 'failed'>('all')

  const tabName = TABS[activeTab] ?? TABS[0]

  const tabChecks = checks.filter((c) => c.category === tabName)
  const selectedChecks = checks.filter((c) => c.category === selectedArea)
  const selectedDetails = VISUAL_AREAS.find((area) => area.category === selectedArea) ?? VISUAL_AREAS[0]
  const completeChecks = useMemo(() => checks.filter((check) => {
    const query = completeSearch.trim().toLowerCase()
    if (query && ![check.label, check.section, check.category, check.componentCode, check.defectType]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(query))) return false
    if (completeFilter === 'incomplete') return !check.checked
    if (completeFilter === 'attention') return check.condition === 'Warning' || check.result === 'Advisory'
    if (completeFilter === 'failed') return check.condition === 'Bad' || check.result === 'Fail'
    return true
  }), [checks, completeFilter, completeSearch])
  const visualizationChecks = useMemo<CWInspectionCheck[]>(() => [
    ...checks,
    ...vehicleViewChecks.map((check) => ({
      id: 'vehicle-view-' + check.id,
      category: check.view === 'Interior' ? 'Interior View' : check.view + ' View',
      section: 'Vehicle visual inspection',
      label: check.label,
      checked: check.checked,
      condition: check.checked ? 'Good' : undefined,
      remark: check.remark,
      photoUrl: check.photoUrl,
    } as CWInspectionCheck)),
  ], [checks, vehicleViewChecks])

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
      const mediaUrl = reader.result as string
      const check = checks.find((item) => item.id === photoTargetId)
      updateCheck(photoTargetId, { photoUrl: mediaUrl, mediaUrls: [...(check?.mediaUrls ?? []), mediaUrl] })
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

  const displayedChecks = tabChecks

  function openVisualArea(category: InspectionCategory) {
    setSelectedArea(category)
    setVisualDialogOpen(true)
  }

  return (
    <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)' }}>
      <Box
        onClick={() => setSectionCollapsed((value) => !value)}
        role="button"
        tabIndex={0}
        aria-expanded={!sectionCollapsed}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setSectionCollapsed((value) => !value)
          }
        }}
        sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, cursor: 'pointer' }}
      >
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: 'text.primary', mb: 0.5 }}>
            Vehicle Health Check Inspection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {checks.filter((c) => c.checked).length} / {checks.length} items checked
          </Typography>
        </Box>
        <IconButton
          aria-label={sectionCollapsed ? 'Expand vehicle health inspection' : 'Collapse vehicle health inspection'}
          onClick={(event) => {
            event.stopPropagation()
            setSectionCollapsed((value) => !value)
          }}
          sx={{ transform: sectionCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }}
        >
          <KeyboardArrowDown />
        </IconButton>
      </Box>

      <Collapse in={!sectionCollapsed} timeout="auto" unmountOnExit>
      <Tabs
        value={mode}
        onChange={(_, value: 'blueprint' | 'threeDimensional' | 'manual' | 'complete') => setMode(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          px: { xs: 1, sm: 2 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 750 },
        }}
      >
        <Tab value="blueprint" icon={<DirectionsCarFilledOutlined />} iconPosition="start" label="Blueprint" />
        <Tab value="threeDimensional" icon={<ThreeDRotationRounded />} iconPosition="start" label="3D Vehicle" />
        <Tab value="manual" icon={<EditNoteOutlined />} iconPosition="start" label="Manual Input" />
        <Tab value="complete" icon={<FactCheckOutlined />} iconPosition="start" label="All Checks" />
      </Tabs>

      {mode === 'blueprint' && (
        <Box sx={{ bgcolor: '#f8fafc', p: { xs: 1.5, sm: 2.5 }, borderBottom: '1px solid', borderColor: 'divider' }}>
          <VehicleInspectionBlueprint
            checks={visualizationChecks}
            selectedCategory={selectedArea}
            onOpenCategory={(category) => openVisualArea(category as InspectionCategory)}
          />
        </Box>
      )}

      {mode === 'threeDimensional' && (
        <Box sx={{ bgcolor: '#f8fafc', p: { xs: 1.5, sm: 2.5 }, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Suspense fallback={
            <Paper variant="outlined" sx={{ minHeight: { xs: 350, sm: 460 }, borderRadius: 3, bgcolor: '#07111f', display: 'grid', placeItems: 'center' }}>
              <Typography sx={{ color: '#94a3b8', fontSize: '.8rem' }}>Loading interactive vehicle…</Typography>
            </Paper>
          }>
            <EngineeringVehicleViews
              checks={visualizationChecks}
              vehicle={vehicle}
              onOpenCategory={(category) => openVisualArea(category as InspectionCategory)}
            />
          </Suspense>
        </Box>
      )}

      {mode === 'complete' && (
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#f8fafc' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              value={completeSearch}
              onChange={(event) => setCompleteSearch(event.target.value)}
              placeholder="Search component, section, system or defect"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
            />
            <TextField select size="small" label="Show" value={completeFilter} onChange={(event) => setCompleteFilter(event.target.value as typeof completeFilter)} sx={{ minWidth: { sm: 170 } }}>
              <MenuItem value="all">All checks</MenuItem>
              <MenuItem value="incomplete">Incomplete</MenuItem>
              <MenuItem value="attention">Advisories</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </TextField>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {completeChecks.length} of {checks.length} checks shown. Open any item to inspect its complete engineering section.
          </Typography>
          <Stack spacing={1}>
            {completeChecks.map((check) => (
              <Button
                key={check.id}
                variant="outlined"
                onClick={() => openVisualArea(check.category as InspectionCategory)}
                sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none', px: 1.5, py: 1.25 }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 750, fontSize: '0.82rem' }}>{check.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{check.category}{check.section ? ` · ${check.section}` : ''}</Typography>
                </Box>
                <Stack direction="row" spacing={0.75} sx={{ ml: 1 }}>
                  {check.result && <Chip size="small" label={check.result} color={check.result === 'Fail' ? 'error' : check.result === 'Advisory' ? 'warning' : check.result === 'Pass' ? 'success' : 'default'} />}
                  <Chip size="small" label={check.checked ? 'Inspected' : 'Pending'} color={check.checked ? 'success' : 'default'} />
                </Stack>
              </Button>
            ))}
          </Stack>
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
                    {check.checked && (
                      <EngineeringInspectionFields
                        check={check}
                        readonly={readonly}
                        onChange={(patch) => updateCheck(check.id, { ...patch, inspectedAt: new Date().toISOString() })}
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
      </Collapse>

      <Dialog
        open={visualDialogOpen}
        onClose={() => setVisualDialogOpen(false)}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
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
                      {check.checked && (
                        <EngineeringInspectionFields
                          check={check}
                          readonly={readonly}
                          onChange={(patch) => updateCheck(check.id, { ...patch, inspectedAt: new Date().toISOString() })}
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
