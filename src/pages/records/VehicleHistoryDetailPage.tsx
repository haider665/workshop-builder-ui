import { useParams } from 'react-router-dom'
import { PlaceholderPage } from '../../components/PlaceholderPage'

export function VehicleHistoryDetailPage() {
  const { registrationNo } = useParams()
  return (
    <PlaceholderPage
      title={`Vehicle History / ${registrationNo ?? ''}`}
      subtitle="Read-only full history for a vehicle."
      hint="Milestone 8 will implement the full vehicle history view."
    />
  )
}
