import {
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import type { CWTaskField, CWTaskFieldValue } from '../types/cw'

export type FieldRendererProps = {
  field: CWTaskField
  value: CWTaskFieldValue
  onChange: (value: CWTaskFieldValue) => void
  onUpload?: (file: File) => void
}

function asString(value: CWTaskFieldValue) {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

function asStringArray(value: CWTaskFieldValue): string[] {
  if (Array.isArray(value)) return value
  return []
}

function asBoolean(value: CWTaskFieldValue): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true'
  return false
}

export function FieldRenderer(props: FieldRendererProps) {
  const f = props.field
  const requiredSuffix = f.required ? ' *' : ''

  if (f.type === 'Text Input') {
    return (
      <TextField
        label={f.label + requiredSuffix}
        value={asString(props.value)}
        onChange={(e) => props.onChange(e.target.value)}
        fullWidth
      />
    )
  }

  if (f.type === 'Text Area') {
    return (
      <TextField
        label={f.label + requiredSuffix}
        value={asString(props.value)}
        onChange={(e) => props.onChange(e.target.value)}
        fullWidth
        multiline
        minRows={3}
      />
    )
  }

  if (f.type === 'Number') {
    return (
      <TextField
        label={f.label + requiredSuffix}
        value={props.value === null ? '' : asString(props.value)}
        onChange={(e) => {
          const raw = e.target.value
          if (!raw.trim()) {
            props.onChange(null)
            return
          }
          const n = Number(raw)
          props.onChange(Number.isFinite(n) ? n : null)
        }}
        fullWidth
        type="number"
      />
    )
  }

  if (f.type === 'Checkbox') {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={asBoolean(props.value)}
            onChange={(e) => props.onChange(e.target.checked)}
          />
        }
        label={f.label + requiredSuffix}
      />
    )
  }

  if (f.type === 'Checkbox Group') {
    const selected = new Set(asStringArray(props.value))
    const options = f.options ?? []

    return (
      <FormControl>
        <FormLabel sx={{ fontWeight: 800 }}>{f.label + requiredSuffix}</FormLabel>
        <FormGroup>
          {options.map((o) => {
            const checked = selected.has(o)
            return (
              <FormControlLabel
                key={o}
                control={
                  <Switch
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(selected)
                      if (e.target.checked) next.add(o)
                      else next.delete(o)
                      props.onChange(Array.from(next))
                    }}
                  />
                }
                label={o}
              />
            )
          })}
        </FormGroup>
        {options.length ? null : (
          <Typography variant="caption" color="text.secondary">
            No options configured.
          </Typography>
        )}
      </FormControl>
    )
  }

  if (f.type === 'Radio Button Group') {
    const options = f.options ?? []
    const current = typeof props.value === 'string' ? props.value : ''

    return (
      <FormControl>
        <FormLabel sx={{ fontWeight: 800 }}>{f.label + requiredSuffix}</FormLabel>
        <RadioGroup
          value={current}
          onChange={(e) => props.onChange(e.target.value)}
        >
          {options.map((o) => (
            <FormControlLabel key={o} value={o} control={<Radio />} label={o} />
          ))}
        </RadioGroup>
        {options.length ? null : (
          <Typography variant="caption" color="text.secondary">
            No options configured.
          </Typography>
        )}
      </FormControl>
    )
  }

  if (f.type === 'Dropdown') {
    const options = f.options ?? []
    const current = typeof props.value === 'string' ? props.value : ''

    return (
      <TextField
        label={f.label + requiredSuffix}
        value={current}
        onChange={(e) => props.onChange(e.target.value)}
        select
        fullWidth
      >
        {options.map((o) => (
          <MenuItem key={o} value={o}>
            {o}
          </MenuItem>
        ))}
      </TextField>
    )
  }

  if (f.type === 'Date Picker') {
    const current = typeof props.value === 'string' ? props.value : ''

    return (
      <TextField
        label={f.label + requiredSuffix}
        value={current}
        onChange={(e) => props.onChange(e.target.value)}
        fullWidth
        type="date"
        slotProps={{
          inputLabel: { shrink: true },
        }}
      />
    )
  }

  if (f.type === 'Image Upload' || f.type === 'File Upload') {
    const accept = f.type === 'Image Upload' ? 'image/*' : undefined

    return (
      <Stack spacing={1}>
        <Typography sx={{ fontWeight: 800 }}>{f.label + requiredSuffix}</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
          <Button variant="outlined" component="label">
            Choose file
            <input
              hidden
              type="file"
              accept={accept}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                props.onUpload?.(file)
                props.onChange(file.name)
                e.currentTarget.value = ''
              }}
            />
          </Button>
          {props.value ? (
            <Chip label={asString(props.value)} size="small" variant="outlined" />
          ) : (
            <Box />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Files are stored in-memory only in MVP mode.
        </Typography>
      </Stack>
    )
  }

  return (
    <Typography color="text.secondary">
      Unsupported field type: {f.type}
    </Typography>
  )
}
