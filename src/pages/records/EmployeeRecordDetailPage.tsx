import { useParams } from 'react-router-dom'
import { PlaceholderPage } from '../../components/PlaceholderPage'

export function EmployeeRecordDetailPage() {
  const { userId } = useParams()
  return (
    <PlaceholderPage
      title={`Employee Record / ${userId ?? ''}`}
      subtitle="Read-only task history for a user."
      hint="Milestone 8 will implement the employee record detail view."
    />
  )
}
