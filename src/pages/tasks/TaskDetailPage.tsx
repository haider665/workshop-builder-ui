import { useParams } from 'react-router-dom'
import { PlaceholderPage } from '../../components/PlaceholderPage'

export function TaskDetailPage() {
  const { taskId } = useParams()
  return (
    <PlaceholderPage
      title={`Task ${taskId ?? ''}`}
      subtitle="Task execution (status actions, dynamic form, comments, attachments)."
      hint="Milestone 6 will implement the full task detail execution UI."
    />
  )
}
