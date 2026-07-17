import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowBack, Assignment, AttachFile, ChatBubbleOutlined, Info, Pause, PlayArrow, Save } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { FieldRenderer } from '../../components/FieldRenderer'
import { SectionCard } from '../../components/SectionCard'
import { colors, radii } from '../../theme/tokens'
import { useCwStore } from '../../store/cwStore'
import { useBackendData } from '../../hooks/useCREData'
import { useSessionStore } from '../../store/sessionStore'
import { tasksService } from '../../services/tasks/tasksService'
import type { CWTask, CWTaskField, CWTaskFieldValue, CWTaskStatus } from '../../types/cw'

function statusChip(status: CWTaskStatus) {
  const sx = { fontWeight: 700, fontSize: '0.72rem' }
  if (status === 'Assigned') return <Chip size="small" color="info" label="Assigned" sx={sx} />
  if (status === 'In Progress') return <Chip size="small" color="primary" label="In Progress" sx={sx} />
  if (status === 'Pending') return <Chip size="small" color="warning" label="Pending" sx={sx} />
  return <Chip size="small" color="success" label="Completed" sx={sx} />
}

function sortFields(fields: CWTaskField[]) {
  return fields.slice().sort((a, b) => a.order - b.order)
}

function validateRequired(fields: CWTaskField[], values: Record<string, CWTaskFieldValue>) {
  const missing: string[] = []
  for (const f of fields) {
    if (!f.required) continue
    const v = values[f.id]
    const ok =
      v !== null &&
      v !== undefined &&
      (typeof v === 'boolean' || typeof v === 'number' || (Array.isArray(v) ? v.length > 0 : String(v).trim().length > 0))
    if (!ok) missing.push(f.label)
  }
  return missing
}

/** Info row inside SectionCard */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
      <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{value}</Typography>
    </Stack>
  )
}

export function TaskDetailPage() {
  const { taskId } = useParams()
  useBackendData()

  const navigate = useNavigate()
  const user = useSessionStore((s) => s.user)

  const tasks = useCwStore((s) => s.tasks)
  const shops = useCwStore((s) => s.shops)
  const bays = useCwStore((s) => s.bays)
  const valuesByTask = useCwStore((s) => s.taskFieldValues)
  const comments = useCwStore((s) => s.taskComments)
  const attachments = useCwStore((s) => s.taskAttachments)

  const task: CWTask | null = tasks.find((t) => t.id === taskId) ?? null
  const shopName = task ? shops.find((s) => s.id === task.shopId)?.name ?? '—' : '—'
  const bayName = task?.bayId ? bays.find((b) => b.id === task.bayId)?.name ?? '—' : null

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t] as const)), [tasks])

  const dependencyBlockers = useMemo(() => {
    if (!task) return [] as CWTask[]
    if (task.dependencyOverrideReason) return [] as CWTask[]
    const deps = task.dependsOnTaskIds ?? []
    if (!deps.length) return [] as CWTask[]

    const blockers: CWTask[] = []
    for (const id of deps) {
      const dep = tasksById.get(id)
      if (!dep) continue
      if (dep.status !== 'Completed') blockers.push(dep)
    }
    return blockers
  }, [task, tasksById])

  const dependencyTasks = useMemo(() => {
    if (!task) return [] as CWTask[]
    const deps = task.dependsOnTaskIds ?? []
    if (!deps.length) return [] as CWTask[]
    return deps.map((id) => tasksById.get(id)).filter((t): t is CWTask => Boolean(t))
  }, [task, tasksById])

  const isBlocked = useMemo(() => {
    if (!task) return false
    if (task.dependencyOverrideReason) return false
    return dependencyBlockers.length > 0
  }, [task, dependencyBlockers.length])

  const [error, setError] = useState<string | null>(null)
  const [pendingOpen, setPendingOpen] = useState(false)
  const [pendingReason, setPendingReason] = useState('')
  const [commentDraft, setCommentDraft] = useState('')

  const fieldValues = (taskId && valuesByTask[taskId]) || {}

  const orderedFields = useMemo(() => (task ? sortFields(task.fields) : []), [task])
  const missingRequired = useMemo(
    () => validateRequired(orderedFields, fieldValues),
    [orderedFields, fieldValues],
  )

  const taskComments = useMemo(() => {
    if (!taskId) return []
    return comments
      .filter((c) => c.taskId === taskId)
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [comments, taskId])

  const taskAttachments = useMemo(() => {
    if (!taskId) return []
    return attachments
      .filter((a) => a.taskId === taskId)
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [attachments, taskId])

  function setStatus(status: CWTaskStatus, reason?: string) {
    if (!taskId) return
    try {
      setError(null)
      tasksService.setStatus(taskId, { status, pendingReason: reason })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function onFieldChange(fieldId: string, value: CWTaskFieldValue) {
    if (!taskId) return
    tasksService.setFieldValue(taskId, fieldId, value)
  }

  function addComment() {
    if (!taskId || !user) return
    try {
      setError(null)
      tasksService.addComment(taskId, user.name, commentDraft)
      setCommentDraft('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function uploadAttachment(file: File) {
    if (!taskId) return
    try {
      setError(null)
      tasksService.addAttachment(taskId, file)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (!taskId) {
    return (
      <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">Missing task id.</Alert>
      </Box>
    )
  }

  if (!task) {
    return (
      <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/tasks')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: colors.slate[900] }}>Task not found</Typography>
          </Stack>
          <Box>
            <Button
              variant="contained"
              component={RouterLink}
              to="/tasks"
              startIcon={<ArrowBack />}
              sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
            >
              Back to tasks
            </Button>
          </Box>
        </Stack>
      </Box>
    )
  }

  const canStart = task.status === 'Assigned' && !isBlocked
  const canPending = task.status === 'In Progress'
  const canComplete = task.status === 'In Progress'
  const canResume = task.status === 'Pending' && !isBlocked

  const canCompleteNow = canComplete && missingRequired.length === 0
  const vehiclePrefix = task.registrationNo ? `Vehicle: ${task.registrationNo} · ` : ''

  const actionBtnSx = { fontWeight: 600, borderRadius: '10px', px: 2.5 }

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/tasks')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                {task.title}
              </Typography>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
                {vehiclePrefix}Shop: {shopName}{bayName ? ` · Bay: ${bayName}` : ''} · Template: {task.templateName}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            {canStart ? (
              <Button variant="contained" startIcon={<PlayArrow />} onClick={() => setStatus('In Progress')} sx={{ ...actionBtnSx, bgcolor: colors.slate[900], '&:hover': { bgcolor: colors.slate[800] } }}>
                Start
              </Button>
            ) : null}
            {canResume ? (
              <Button variant="contained" startIcon={<PlayArrow />} onClick={() => setStatus('In Progress')} sx={{ ...actionBtnSx, bgcolor: colors.slate[900], '&:hover': { bgcolor: colors.slate[800] } }}>
                Resume
              </Button>
            ) : null}
            {canPending ? (
              <Button variant="outlined" startIcon={<Pause />} onClick={() => setPendingOpen(true)} sx={{ ...actionBtnSx, borderColor: colors.border.strong, color: colors.slate[700] }}>
                Pending
              </Button>
            ) : null}
            {canComplete ? (
              <Button
                variant="contained"
                color="success"
                startIcon={<Save />}
                disabled={!canCompleteNow}
                onClick={() => setStatus('Completed')}
                sx={actionBtnSx}
              >
                Complete
              </Button>
            ) : null}
          </Stack>
        </Stack>

        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : null}

        {isBlocked ? (
          <Alert severity="warning">
            <Typography sx={{ fontWeight: 800 }}>This task is blocked by dependencies.</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>
              Blocked by: {dependencyBlockers.map((d) => `${d.title} (${d.status})`).join(', ') || '—'}
            </Typography>
          </Alert>
        ) : null}
        {task.dependencyOverrideReason ? (
          <Alert severity="info">
            Dependency override: {task.dependencyOverrideReason}
          </Alert>
        ) : null}

        {/* ── Status & info ── */}
        <SectionCard title="Task Info" icon={<Info sx={{ fontSize: '1rem' }} />}>
          <InfoRow
            label="Status"
            value={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {statusChip(task.status)}
              </Stack>
            }
          />
          <InfoRow
            label="Assigned to"
            value={(task.assignedToNames?.length ? task.assignedToNames : [task.assignedToName]).join(', ')}
          />
          <InfoRow label="Last updated" value={`Auto-saved (in-memory) · ${new Date(task.updatedAt).toLocaleString()}`} />
          {dependencyTasks.length ? (
            <InfoRow
              label="Depends on"
              value={
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                  {dependencyTasks.map((d) => (
                    <Chip
                      key={d.id}
                      size="small"
                      variant="outlined"
                      color={d.status === 'Completed' ? 'success' : 'warning'}
                      label={`${d.title} · ${d.status}`}
                      sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                    />
                  ))}
                </Stack>
              }
            />
          ) : null}
          {task.plannedStartAt || task.plannedEndAt ? (
            <InfoRow
              label="Planned"
              value={`${task.plannedStartAt ? new Date(task.plannedStartAt).toLocaleString() : '—'} → ${task.plannedEndAt ? new Date(task.plannedEndAt).toLocaleString() : '—'}`}
            />
          ) : null}
          {task.status === 'Pending' && task.pendingReason ? (
            <InfoRow label="Pending reason" value={task.pendingReason} />
          ) : null}
        </SectionCard>

        {/* ── Task form ── */}
        <SectionCard title="Task Form" icon={<Assignment sx={{ fontSize: '1rem' }} />}>
          {!orderedFields.length ? (
            <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No fields configured for this task.</Typography>
          ) : (
            <Stack spacing={2}>
              {orderedFields.map((f) => (
                <FieldRenderer
                  key={f.id}
                  field={f}
                  value={fieldValues[f.id] ?? null}
                  onChange={(v) => onFieldChange(f.id, v)}
                  onUpload={(file) => uploadAttachment(file)}
                />
              ))}
            </Stack>
          )}
          {missingRequired.length ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Required fields missing: {missingRequired.join(', ')}
            </Alert>
          ) : null}
        </SectionCard>

        {/* ── Attachments ── */}
        <SectionCard title="Attachments" icon={<AttachFile sx={{ fontSize: '1rem' }} />}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, mb: 2 }}>
            <Button
              variant="outlined"
              component="label"
              sx={{ borderColor: colors.border.strong, color: colors.slate[700], fontWeight: 600, borderRadius: '10px' }}
            >
              Upload
              <input
                hidden
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  uploadAttachment(file)
                  e.currentTarget.value = ''
                }}
              />
            </Button>
            <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
              Files are tracked in-memory (name/type/size only).
            </Typography>
          </Stack>

          {!taskAttachments.length ? (
            <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No attachments yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {taskAttachments.map((a) => (
                <Stack key={a.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip label={a.fileName} variant="outlined" sx={{ fontWeight: 600, fontSize: '0.8rem' }} />
                  <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                    {Math.round(a.sizeBytes / 1024)} KB · {a.mimeType}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </SectionCard>

        {/* ── Comments ── */}
        <SectionCard title="Comments" icon={<ChatBubbleOutlined sx={{ fontSize: '1rem' }} />}>
          {!taskComments.length ? (
            <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No comments yet.</Typography>
          ) : (
            <Stack spacing={1.25}>
              {taskComments.map((c) => (
                <Box key={c.id} sx={{ p: 1.5, borderRadius: radii.sm, border: `1px solid ${colors.border.subtle}`, bgcolor: colors.bg.subtle }}>
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: colors.slate[900] }}>{c.authorName}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                        {new Date(c.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700] }}>{c.message}</Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1}>
            <TextField
              label="Add a comment"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
            />
            <Box>
              <Button
                variant="contained"
                onClick={addComment}
                disabled={!user || !commentDraft.trim()}
                sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
              >
                Post
              </Button>
            </Box>
          </Stack>
        </SectionCard>

        <Dialog open={pendingOpen} onClose={() => setPendingOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ fontWeight: 800, color: colors.slate[900] }}>Mark as Pending</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>
                Pending requires a reason.
              </Typography>
              <TextField
                label="Reason"
                value={pendingReason}
                onChange={(e) => setPendingReason(e.target.value)}
                fullWidth
                multiline
                minRows={3}
                autoFocus
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPendingOpen(false)} sx={{ color: colors.slate[600] }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                setStatus('Pending', pendingReason)
                setPendingReason('')
                setPendingOpen(false)
              }}
              disabled={!pendingReason.trim()}
              sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  )
}
