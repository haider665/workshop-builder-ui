import { Add, Send } from '@mui/icons-material'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { workshopApi } from '../services/workshopApi'
import { useToast } from '../hooks/useToast'

type Props = { targetDoctype: string; targetField: string; requestedValue?: string; company?: string; sourceRoute?: string; context?: Record<string, unknown>; label?: string; compact?: boolean; onRequested?: (requestId: string) => void }

/** Request a missing master value without navigating away or clearing the parent form. */
export function RequestMasterDataButton({ targetDoctype, targetField, requestedValue = '', company, sourceRoute, context, label = 'Request admin to add', compact, onRequested }: Props) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(requestedValue)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!value.trim()) return
    setSaving(true)
    try {
      const created = await workshopApi.createMasterDataRequest({ targetDoctype, targetField, requestedValue: value.trim(), company, sourceRoute: sourceRoute ?? window.location.pathname, context: { ...context, requesterNote: note } })
      toast.success(`Request sent to an administrator (${created.id}).`)
      setOpen(false); onRequested?.(created.id)
    } catch (error) { toast.error(error, 'The request could not be sent.') } finally { setSaving(false) }
  }
  return <>
    <Button size={compact ? 'small' : 'medium'} variant="text" startIcon={<Add fontSize="small" />} onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setValue(requestedValue); setOpen(true) }} sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</Button>
    <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="xs">
      <DialogTitle>Request missing master data</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>Your current form stays open. An administrator will add the value, then you can select it here.</Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{targetDoctype} · {targetField}</Typography>
        <TextField autoFocus fullWidth required label="Value to add" value={value} onChange={(event) => setValue(event.target.value)} sx={{ mb: 2 }} />
        <TextField fullWidth multiline minRows={2} label="Optional note or context" value={note} onChange={(event) => setNote(event.target.value)} />
        {company && <Box sx={{ mt: 1 }}><Typography variant="caption" color="text.secondary">Company: {company}</Typography></Box>}
      </DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)} disabled={saving}>Continue later</Button><Button variant="contained" startIcon={<Send />} onClick={() => void submit()} disabled={saving || !value.trim()}>Send request</Button></DialogActions>
    </Dialog>
  </>
}
