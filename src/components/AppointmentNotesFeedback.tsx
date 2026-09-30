import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { SectionCard } from './SectionCard'
import { useToast } from '../hooks/useToast'
import { workshopApi } from '../services/workshopApi'
import type { CWAppointmentComment, CWAppointmentFeedback } from '../types/cw'
import { colors, radii } from '../theme/tokens'

type Props = { appointmentId: string; customerName?: string; notes?: string }

export function AppointmentNotesFeedback({ appointmentId, customerName, notes = '' }: Props) {
  const toast = useToast()
  const [comments, setComments] = useState<CWAppointmentComment[]>([])
  const [feedback, setFeedback] = useState<CWAppointmentFeedback[]>([])
  const [noteText, setNoteText] = useState(notes)
  const [comment, setComment] = useState('')
  const [mentions, setMentions] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ overallRating: '', serviceAdvisorRating: '', serviceQualityRating: '', deliveryTimeRating: '', vehicleConditionRating: '', facilityRating: '', recommendation: '', comments: '' })
  useEffect(() => {
    setNoteText(notes)
    void Promise.all([workshopApi.listAppointmentComments(appointmentId), workshopApi.listAppointmentFeedback(appointmentId)]).then(([c, f]) => { setComments(c.data); setFeedback(f.data) }).catch((error) => toast.error(error, 'Could not load appointment notes and feedback.'))
  }, [appointmentId, notes, toast])
  async function postComment() {
    if (!comment.trim()) return
    try { const created = await workshopApi.addAppointmentComment(appointmentId, { comment: comment.trim(), mentions: mentions.split(',').map((v) => v.trim()).filter(Boolean) }); setComments((current) => [created, ...current]); setComment(''); setMentions(''); toast.success('Comment posted and mentions notified.') } catch (error) { toast.error(error, 'Could not post comment.') }
  }
  async function saveNotes() {
    try { await workshopApi.updateAppointment(appointmentId, { notes: noteText }); toast.success('Notes saved.') } catch (error) { toast.error(error, 'Could not save notes.') }
  }
  async function submitFeedback() {
    try {
      const numeric = (value: string) => value ? Number(value) : undefined
      const created = await workshopApi.addAppointmentFeedback(appointmentId, { feedbackSource: 'Customer', customerName, ...Object.fromEntries(Object.entries(form).filter(([key]) => key !== 'comments').map(([key, value]) => [key, numeric(value as string)])), recommendation: form.recommendation, comments: form.comments })
      setFeedback((current) => [created, ...current]); setDialogOpen(false); toast.success('Customer feedback saved.')
    } catch (error) { toast.error(error, 'Could not save feedback.') }
  }
  return <SectionCard title="Notes and Feedbacks">
    <Stack spacing={2}>
      <Box><Typography sx={{ fontWeight: 800, mb: 1 }}>Notes</Typography><TextField value={noteText} onChange={(e) => setNoteText(e.target.value)} fullWidth multiline minRows={2} placeholder="Internal handover or follow-up notes" /><Button size="small" variant="outlined" onClick={() => void saveNotes()} sx={{ mt: 1, fontWeight: 700 }}>Save Notes</Button></Box>
      <Box sx={{ pt: 1.5, borderTop: `1px solid ${colors.border.subtle}` }}><Typography sx={{ fontWeight: 800, mb: 1 }}>Comments and Mentions</Typography><TextField value={comment} onChange={(e) => setComment(e.target.value)} fullWidth multiline minRows={2} label="Comment" /><TextField value={mentions} onChange={(e) => setMentions(e.target.value)} fullWidth size="small" label="Tag users (emails or IDs, comma-separated)" helperText="Tagged users receive a realtime notification." sx={{ mt: 1 }} /><Button variant="contained" disabled={!comment.trim()} onClick={() => void postComment()} sx={{ mt: 1, fontWeight: 700 }}>Post Comment</Button>{comments.map((entry) => <Box key={entry.id} sx={{ mt: 1, p: 1.2, bgcolor: colors.bg.page, borderRadius: radii.sm }}><Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{entry.author} · {new Date(entry.createdAt).toLocaleString()}</Typography><Typography sx={{ fontSize: '0.84rem', whiteSpace: 'pre-wrap' }}>{entry.comment}</Typography></Box>)}</Box>
      <Box sx={{ pt: 1.5, borderTop: `1px solid ${colors.border.subtle}` }}><Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 1 }}><Box><Typography sx={{ fontWeight: 800 }}>Customer Feedback</Typography><Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>Multiple feedback submissions are retained.</Typography></Box><Button variant="outlined" onClick={() => setDialogOpen(true)} sx={{ fontWeight: 700 }}>Add Feedback</Button></Stack>{feedback.map((entry) => <Box key={entry.id} sx={{ mt: 1, p: 1.2, bgcolor: colors.bg.page, borderRadius: radii.sm }}><Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>{entry.feedbackSource} · Overall {entry.overallRating || '—'}/5</Typography>{entry.comments && <Typography sx={{ fontSize: '0.84rem' }}>{entry.comments}</Typography>}</Box>)}</Box>
    </Stack>
    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth><DialogTitle>Customer Feedback</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}><Typography sx={{ fontSize: '0.82rem', color: colors.slate[600] }}>Rate each area from 1 (poor) to 5 (excellent).</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ flexWrap: 'wrap' }} useFlexGap>{([['overallRating','Overall'],['serviceAdvisorRating','Service advisor'],['serviceQualityRating','Service quality'],['deliveryTimeRating','Delivery time'],['vehicleConditionRating','Vehicle condition'],['facilityRating','Facility']] as const).map(([key, label]) => <TextField key={key} select label={label} value={form[key]} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))} sx={{ minWidth: { xs: '100%', sm: 170 } }}><MenuItem value="">Not rated</MenuItem>{[1,2,3,4,5].map((value) => <MenuItem key={value} value={String(value)}>{value} / 5</MenuItem>)}</TextField>)}</Stack><TextField select label="Would you recommend us?" value={form.recommendation} onChange={(e) => setForm((current) => ({ ...current, recommendation: e.target.value }))}><MenuItem value="">Not answered</MenuItem><MenuItem value="Yes">Yes</MenuItem><MenuItem value="No">No</MenuItem><MenuItem value="Maybe">Maybe</MenuItem></TextField><TextField label="Comments / suggestions" value={form.comments} onChange={(e) => setForm((current) => ({ ...current, comments: e.target.value }))} multiline minRows={3} fullWidth /></Stack></DialogContent><DialogActions><Button onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="contained" onClick={() => void submitFeedback()}>Save Feedback</Button></DialogActions></Dialog>
  </SectionCard>
}
