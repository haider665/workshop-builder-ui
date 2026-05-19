import {
  Box,
  Button,
  Checkbox,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { CameraAlt } from '@mui/icons-material'
import { useRef, useState } from 'react'
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
] as const

const CONDITIONS: CWInspectionCondition[] = ['Good', 'Warning', 'Bad']

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
  const [activeTab, setActiveTab] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null)

  const tabName = TABS[activeTab] ?? TABS[0]

  const tabChecks = checks.filter((c) => c.category === tabName)

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

  return (
    <Paper sx={{ border: '2px solid', borderColor: 'info.main', overflow: 'hidden' }}>
      <Box sx={{ p: 2.5, pb: 0 }}>
        <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: 'info.main', mb: 1 }}>
          Vehicle Health Check Inspection
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {checks.filter((c) => c.checked).length} / {checks.length} items checked
        </Typography>
      </Box>

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

      <Box sx={{ p: 2.5 }}>
        {tabChecks.length === 0 ? (
          <Typography color="text.secondary">No items in this category.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {tabChecks.map((check) => (
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </Paper>
  )
}
