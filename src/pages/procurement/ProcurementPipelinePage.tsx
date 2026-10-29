import {
  Box,
  Chip,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material'
import { ShoppingCart } from '@mui/icons-material'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMockProcurementStore } from '../../store/mockProcurementStore'
import { colors, radii } from '../../theme/tokens'
import { tableSectionSx, headerCellSx, bodyCellSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import type { CasePart, ProcurementStep } from '../../types/procurementWorkflow'
import { PROCUREMENT_STEP_LABELS, PROCUREMENT_STEPS } from '../../types/procurementWorkflow'

type TabValue = ProcurementStep | 'all' | 'completed'

const TABS: { label: string; value: TabValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Store Review', value: 'store_review' },
  { label: 'Quotations', value: 'quotations' },
  { label: 'CS', value: 'cs' },
  { label: 'Audit', value: 'audit' },
  { label: 'Approval', value: 'approval' },
  { label: 'PO', value: 'po' },
  { label: 'GRN', value: 'grn' },
  { label: 'Completed', value: 'completed' },
]

const stepChipColor: Record<ProcurementStep, { bgcolor: string; color: string }> = {
  store_review: { bgcolor: '#e0e7ff', color: '#3730a3' },
  quotations: { bgcolor: '#dbeafe', color: '#1d4ed8' },
  cs: { bgcolor: '#fef3c7', color: '#92400e' },
  audit: { bgcolor: '#fce7f3', color: '#9d174d' },
  approval: { bgcolor: '#ede9fe', color: '#5b21b6' },
  po: { bgcolor: '#e0f2fe', color: '#0369a1' },
  grn: { bgcolor: '#d1fae5', color: '#047857' },
}

const statusBadge: Record<string, { bgcolor: string; color: string }> = {
  in_progress: { bgcolor: '#dbeafe', color: '#1d4ed8' },
  approved: { bgcolor: '#d1fae5', color: '#047857' },
  rejected: { bgcolor: '#fee2e2', color: '#b91c1c' },
}

export function ProcurementPipelinePage() {
  const cases = useMockProcurementStore((s) => s.procurementCases)
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabValue>('all')

  const filtered = useMemo(() => {
    if (tab === 'all') return cases.filter((c) => c.status === 'in_progress')
    if (tab === 'completed') return cases.filter((c) => c.status === 'approved' || c.status === 'rejected')
    return cases.filter((c) => c.currentStep === tab && c.status === 'in_progress')
  }, [cases, tab])

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.5rem', md: '1.85rem' },
              color: colors.slate[900],
              letterSpacing: '-0.02em',
            }}
          >
            Procurement Pipeline
          </Typography>
          <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>
            Track procurement cases through Store Review → Quotations → CS → Audit → Approval → PO → GRN
          </Typography>
        </Box>

        {/* Summary chips */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {PROCUREMENT_STEPS.map((step) => {
            const count = cases.filter((c) => c.currentStep === step && c.status === 'in_progress').length
            return (
              <Chip
                key={step}
                label={`${PROCUREMENT_STEP_LABELS[step]}: ${count}`}
                size="small"
                onClick={() => setTab(step)}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  ...stepChipColor[step],
                  border: tab === step ? `2px solid ${stepChipColor[step].color}` : '2px solid transparent',
                }}
              />
            )
          })}
        </Stack>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v: TabValue) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              minHeight: 40,
            },
          }}
        >
          {TABS.map((t) => {
            let count: number
            if (t.value === 'all') count = cases.filter((c) => c.status === 'in_progress').length
            else if (t.value === 'completed') count = cases.filter((c) => c.status !== 'in_progress').length
            else count = cases.filter((c) => c.currentStep === t.value && c.status === 'in_progress').length
            return <Tab key={t.value} value={t.value} label={`${t.label} (${count})`} />
          })}
        </Tabs>

        {/* Table */}
        <Box sx={tableSectionSx}>
          <Box sx={tableHeaderSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={tableHeaderIconSx}>
                <ShoppingCart sx={{ fontSize: '1rem' }} />
              </Box>
              <Typography sx={tableHeaderTitleSx}>PROCUREMENT CASES</Typography>
              <Box
                sx={{
                  bgcolor: colors.slate[100],
                  borderRadius: radii.full,
                  px: 1.2,
                  py: 0.15,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: colors.slate[600],
                }}
              >
                {filtered.length}
              </Box>
            </Stack>
          </Box>

          {filtered.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[400], fontSize: '0.85rem' }}>
                No cases in this category.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                    <TableCell>Case #</TableCell>
                    <TableCell>Part</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Current Step</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      hover
                      onClick={() => navigate(`/mock-procurement/pipeline/${c.id}`)}
                      sx={{
                        cursor: 'pointer',
                        '& .MuiTableCell-body': bodyCellSx,
                        '&:hover': { bgcolor: colors.slate[50] },
                      }}
                    >
                      <TableCell>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: colors.slate[900] }}>
                          {c.caseNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>
                          {c.parts.length > 1
                            ? `${c.parts[0]?.partName ?? 'Part'} + ${c.parts.length - 1} more`
                            : (c.parts[0]?.partName ?? '—')}
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
                          {c.parts.length > 1
                            ? `${c.parts.reduce((sum, p) => sum + p.quantity, 0)} items total`
                            : `${c.parts[0]?.partNumber ? `#${c.parts[0].partNumber} · ` : ''}× ${c.parts[0]?.quantity ?? 1}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[600] }}>
                          {c.vehicleName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: colors.slate[400] }}>
                          {c.customerName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const localCount = c.parts.filter((p) => p.disposition === 'local_vendor').length
                          const foreignCount = c.parts.filter((p) => p.disposition === 'foreign_vendor').length
                          let label = '—'
                          let bgcolor = colors.slate[100]
                          let color = colors.slate[600]

                          if (localCount > 0 && foreignCount > 0) {
                            label = `${localCount} Local, ${foreignCount} Foreign`
                            bgcolor = '#ede9fe'
                            color = '#6d28d9'
                          } else if (localCount > 0) {
                            label = `${localCount} Local`
                            bgcolor = '#dbeafe'
                            color = '#1d4ed8'
                          } else if (foreignCount > 0) {
                            label = `${foreignCount} Foreign`
                            bgcolor = '#ffedd5'
                            color = '#c2410c'
                          }

                          return (
                            <Chip
                              size="small"
                              label={label}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.68rem',
                                bgcolor,
                                color,
                              }}
                            />
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={c.status === 'in_progress' ? PROCUREMENT_STEP_LABELS[c.currentStep] : '—'}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            ...(c.status === 'in_progress' ? stepChipColor[c.currentStep] : { bgcolor: colors.slate[100], color: colors.slate[500] }),
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={c.status.replace('_', ' ').replace(/^\w/, (ch) => ch.toUpperCase())}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            ...statusBadge[c.status],
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>
                          {new Date(c.updatedAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  )
}
