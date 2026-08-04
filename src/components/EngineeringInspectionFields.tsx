import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material'
import type {
  CWInspectionCheck,
  CWInspectionGrade,
  CWInspectionResult,
  CWInspectionSeverity,
  CWInspectionUrgency,
} from '../types/cw'

type Props = {
  check: CWInspectionCheck
  readonly?: boolean
  onChange: (patch: Partial<CWInspectionCheck>) => void
}

const results: CWInspectionResult[] = ['Pass', 'Advisory', 'Fail', 'Not Applicable']
const grades: CWInspectionGrade[] = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical']
const severities: CWInspectionSeverity[] = ['Low', 'Medium', 'High', 'Critical']
const urgencies: CWInspectionUrgency[] = ['Immediate', 'Within 7 Days', 'Within 30 Days', 'Monitor']

function optionalNumber(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function EngineeringInspectionFields({ check, readonly, onChange }: Props) {
  const fieldProps = { size: 'small' as const, disabled: readonly, fullWidth: true }

  return (
    <Box sx={{ mt: 1.5, p: { xs: 1.25, sm: 1.75 }, borderRadius: 2, bgcolor: 'rgba(15, 23, 42, 0.035)' }}>
      <Typography sx={{ fontWeight: 800, fontSize: '0.78rem', mb: 1.25 }}>Engineering details</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.25 }}>
        <TextField {...fieldProps} select label="Result" value={check.result ?? ''} onChange={(e) => onChange({ result: (e.target.value || undefined) as CWInspectionResult | undefined })}>
          <MenuItem value="">Not set</MenuItem>{results.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
        </TextField>
        <TextField {...fieldProps} select label="Condition grade" value={check.conditionGrade ?? ''} onChange={(e) => onChange({ conditionGrade: (e.target.value || undefined) as CWInspectionGrade | undefined })}>
          <MenuItem value="">Not set</MenuItem>{grades.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
        </TextField>
        <TextField {...fieldProps} select label="Severity" value={check.severity ?? ''} onChange={(e) => onChange({ severity: (e.target.value || undefined) as CWInspectionSeverity | undefined })}>
          <MenuItem value="">Not set</MenuItem>{severities.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
        </TextField>
        <TextField {...fieldProps} select label="Urgency" value={check.estimatedUrgency ?? ''} onChange={(e) => onChange({ estimatedUrgency: (e.target.value || undefined) as CWInspectionUrgency | undefined })}>
          <MenuItem value="">Not set</MenuItem>{urgencies.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
        </TextField>
        <TextField {...fieldProps} label="Component code" value={check.componentCode ?? ''} onChange={(e) => onChange({ componentCode: e.target.value })} />
        <TextField {...fieldProps} label="Defect type" value={check.defectType ?? ''} onChange={(e) => onChange({ defectType: e.target.value })} />
        <TextField {...fieldProps} type="number" label="Measured value" value={check.measurementValue ?? ''} onChange={(e) => onChange({ measurementValue: optionalNumber(e.target.value) })} />
        <TextField {...fieldProps} label="Unit" placeholder="mm, psi, V, °C" value={check.measurementUnit ?? ''} onChange={(e) => onChange({ measurementUnit: e.target.value })} />
        <TextField {...fieldProps} type="number" label="Minimum allowed" value={check.minimumAllowed ?? ''} onChange={(e) => onChange({ minimumAllowed: optionalNumber(e.target.value) })} />
        <TextField {...fieldProps} type="number" label="Maximum allowed" value={check.maximumAllowed ?? ''} onChange={(e) => onChange({ maximumAllowed: optionalNumber(e.target.value) })} />
        <TextField {...fieldProps} label="Recommended value" value={check.recommendedValue ?? ''} onChange={(e) => onChange({ recommendedValue: e.target.value })} />
        <TextField {...fieldProps} label="Action required" value={check.actionRequired ?? ''} onChange={(e) => onChange({ actionRequired: e.target.value })} />
      </Box>
      <Stack spacing={1.25} sx={{ mt: 1.25 }}>
        <TextField {...fieldProps} multiline minRows={2} label="Repair recommendation" value={check.repairRecommendation ?? ''} onChange={(e) => onChange({ repairRecommendation: e.target.value })} />
        {check.result === 'Not Applicable' && (
          <TextField {...fieldProps} required multiline minRows={2} label="Not applicable reason" value={check.notApplicableReason ?? ''} onChange={(e) => onChange({ notApplicableReason: e.target.value })} />
        )}
      </Stack>
    </Box>
  )
}

