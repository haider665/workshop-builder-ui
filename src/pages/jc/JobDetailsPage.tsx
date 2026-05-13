import { useParams } from 'react-router-dom'
import { PlaceholderPage } from '../../components/PlaceholderPage'

export function JobDetailsPage() {
  const { jobId } = useParams()
  return (
    <PlaceholderPage
      title={`Job Controller / Job ${jobId ?? ''}`}
      subtitle="Review job, tasks, dependencies, gatepass, and test drive."
      hint="Milestone 5 will implement job detail and orchestration actions."
    />
  )
}
