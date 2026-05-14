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
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowBack, Pause, PlayArrow, Save } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { FieldRenderer } from '../../components/FieldRenderer'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import { useSessionStore } from '../../store/sessionStore'
import { tasksService } from '../../services/tasks/tasksService'
import type { CWTask, CWTaskField, CWTaskFieldValue, CWTaskStatus } from '../../types/cw'

function statusChip(status: CWTaskStatus) {
  if (status === 'Assigned') return <Chip size="small" color="info" label="Assigned" />
  if (status === 'In Progress') return <Chip size="small" color="primary" label="In Progress" />
  if (status === 'Pending') return <Chip size="small" color="warning" label="Pending" />
  return <Chip size="small" color="success" label="Completed" />
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

export function TaskDetailPage() {
  const { taskId } = useParams()

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
      <Page title="Task" subtitle="Task execution">
        <Alert severity="error">Missing task id.</Alert>
      </Page>
    )
  }

  if (!task) {
    return (
      <Page title="Task" subtitle="Task execution">
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 900 }}>Task not found</Typography>
            <Box>
              <Button variant="contained" component={RouterLink} to="/tasks" startIcon={<ArrowBack />}>
                Back to tasks
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Page>
    )
  }

  const canStart = task.status === 'Assigned' && !isBlocked
  const canPending = task.status === 'In Progress'
  const canComplete = task.status === 'In Progress'
  const canResume = task.status === 'Pending' && !isBlocked

  const canCompleteNow = canComplete && missingRequired.length === 0
  const vehiclePrefix = task.registrationNo ? `Vehicle: ${task.registrationNo} · ` : ''

  return (
    <Page
      title={task.title}
      subtitle={`${vehiclePrefix}Shop: ${shopName}${bayName ? ` · Bay: ${bayName}` : ''} · Template: ${task.templateName}`}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/tasks')}>
            Back
          </Button>
          {canStart ? (
            <Button variant="contained" startIcon={<PlayArrow />} onClick={() => setStatus('In Progress')}>
              Start
            </Button>
          ) : null}
          {canResume ? (
            <Button variant="contained" startIcon={<PlayArrow />} onClick={() => setStatus('In Progress')}>
              Resume
            </Button>
          ) : null}
          {canPending ? (
            <Button variant="outlined" startIcon={<Pause />} onClick={() => setPendingOpen(true)}>
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
            >
              Complete
            </Button>
          ) : null}
        </Stack>
      }
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {isBlocked ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 800 }}>This task is blocked by dependencies.</Typography>
          <Typography variant="body2" color="text.secondary">
            Blocked by: {dependencyBlockers.map((d) => `${d.title} (${d.status})`).join(', ') || '—'}
          </Typography>
        </Alert>
      ) : null}
      {task.dependencyOverrideReason ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Dependency override: {task.dependencyOverrideReason}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {statusChip(task.status)}
            <Typography color="text.secondary">
              Assigned to {(task.assignedToNames?.length ? task.assignedToNames : [task.assignedToName]).join(', ')}
            </Typography>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Auto-saved (in-memory) · Updated {new Date(task.updatedAt).toLocaleString()}
          </Typography>
        </Stack>
        {dependencyTasks.length ? (
          <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap' }} useFlexGap>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
              Depends on:
            </Typography>
            {dependencyTasks.map((d) => (
              <Chip
                key={d.id}
                size="small"
                variant="outlined"
                color={d.status === 'Completed' ? 'success' : 'warning'}
                label={`${d.title} · ${d.status}`}
              />
            ))}
          </Stack>
        ) : null}
        {task.plannedStartAt || task.plannedEndAt ? (
          <Typography sx={{ mt: 1.25 }} color="text.secondary">
            Planned: {task.plannedStartAt ? new Date(task.plannedStartAt).toLocaleString() : '—'} →{' '}
            {task.plannedEndAt ? new Date(task.plannedEndAt).toLocaleString() : '—'}
          </Typography>
        ) : null}
        {task.status === 'Pending' && task.pendingReason ? (
          <Typography sx={{ mt: 1.5 }}>
            <Typography component="span" sx={{ fontWeight: 800 }}>
              Pending reason:
            </Typography>{' '}
            {task.pendingReason}
          </Typography>
        ) : null}
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Task form
          </Typography>
          {!orderedFields.length ? (
            <Typography color="text.secondary">No fields configured for this task.</Typography>
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
            <Alert severity="warning">
              Required fields missing: {missingRequired.join(', ')}
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Attachments
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <Button variant="outlined" component="label">
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
            <Typography variant="body2" color="text.secondary">
              Files are tracked in-memory (name/type/size only).
            </Typography>
          </Stack>

          {!taskAttachments.length ? (
            <Typography color="text.secondary">No attachments yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {taskAttachments.map((a) => (
                <Stack key={a.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip label={a.fileName} variant="outlined" />
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(a.sizeBytes / 1024)} KB · {a.mimeType}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Comments
          </Typography>
          {!taskComments.length ? (
            <Typography color="text.secondary">No comments yet.</Typography>
          ) : (
            <Stack spacing={1.25}>
              {taskComments.map((c) => (
                <Paper key={c.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: 800 }}>{c.authorName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(c.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography>{c.message}</Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          <Divider />

          <Stack spacing={1}>
            <TextField
              label="Add a comment"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <Box>
              <Button
                variant="contained"
                onClick={addComment}
                disabled={!user || !commentDraft.trim()}
              >
                Post
              </Button>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={pendingOpen} onClose={() => setPendingOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Mark as Pending</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
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
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPendingOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setStatus('Pending', pendingReason)
              setPendingReason('')
              setPendingOpen(false)
            }}
            disabled={!pendingReason.trim()}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
