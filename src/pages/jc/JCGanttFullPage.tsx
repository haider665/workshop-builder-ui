import { Page } from '../../components/Page'
import { JCGanttChart } from '../../components/JCGanttChart'

export function JCGanttFullPage() {
  return (
    <Page title="Gantt Chart" subtitle="Full-screen scheduling view" fullWidth>
      <JCGanttChart fullPage />
    </Page>
  )
}
