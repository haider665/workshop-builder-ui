import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Skeleton,
  Stack,
} from '@mui/material'
import type { ReactNode } from 'react'
import { colors, shadows, radii, motion } from '../theme/tokens'

/* ─────────────────────── Types ─────────────────────────── */

export type Column<T> = {
  /** Column header text */
  header: string
  /** Unique key */
  key: string
  /** How to render cell content */
  render: (row: T, index: number) => ReactNode
  /** Cell alignment */
  align?: 'left' | 'center' | 'right'
  /** Min width */
  minWidth?: number
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  keyExtractor: (row: T) => string
  loading?: boolean
  loadingRows?: number
  emptyIcon?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
}

/* ─────────────────────── Component ─────────────────────── */

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  loading = false,
  loadingRows = 5,
  emptyIcon,
  emptyTitle = 'No data yet',
  emptyDescription,
  emptyAction,
}: DataTableProps<T>) {
  const isEmpty = !loading && rows.length === 0

  return (
    <Box
      sx={{
        borderRadius: radii.lg,
        border: `1px solid ${colors.border.default}`,
        background: colors.bg.card,
        boxShadow: shadows.card,
        overflow: 'hidden',
      }}
    >
      <TableContainer>
        <Table size="small">
          {/* ── Header ── */}
          <TableHead>
            <TableRow
              sx={{
                '& .MuiTableCell-head': {
                  background: colors.bg.subtle,
                  borderBottom: `1px solid ${colors.border.default}`,
                  color: colors.slate[600],
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  py: 1.5,
                  '&:first-of-type': { pl: 3 },
                  '&:last-of-type': { pr: 3 },
                },
              }}
            >
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align ?? 'left'}
                  sx={{ minWidth: col.minWidth }}
                >
                  {col.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          {/* ── Body ── */}
          <TableBody>
            {loading
              ? Array.from({ length: loadingRows }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        sx={{
                          '&:first-of-type': { pl: 3 },
                          '&:last-of-type': { pr: 3 },
                        }}
                      >
                        <Skeleton
                          variant="text"
                          width={col.align === 'right' ? 60 : '80%'}
                          height={24}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row, index) => (
                  <TableRow
                    key={keyExtractor(row)}
                    sx={{
                      transition: `background ${motion.fast} ${motion.springEase}`,
                      '&:hover': {
                        background: colors.bg.cardHover,
                      },
                      '& .MuiTableCell-body': {
                        borderBottom: `1px solid ${colors.border.subtle}`,
                        py: 1.5,
                        color: colors.slate[700],
                        fontSize: '0.875rem',
                        '&:first-of-type': { pl: 3 },
                        '&:last-of-type': { pr: 3 },
                      },
                      '&:last-of-type .MuiTableCell-body': {
                        borderBottom: 'none',
                      },
                    }}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} align={col.align ?? 'left'}>
                        {col.render(row, index)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Empty State ── */}
      {isEmpty ? (
        <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
          <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
            {emptyIcon ? (
              <Box
                sx={{
                  color: colors.slate[300],
                  '& .MuiSvgIcon-root': { fontSize: 48 },
                }}
              >
                {emptyIcon}
              </Box>
            ) : null}
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '1.1rem',
                color: colors.slate[900],
              }}
            >
              {emptyTitle}
            </Typography>
            {emptyDescription ? (
              <Typography
                sx={{
                  color: colors.slate[500],
                  fontSize: '0.875rem',
                  maxWidth: 360,
                }}
              >
                {emptyDescription}
              </Typography>
            ) : null}
            {emptyAction ? <Box sx={{ mt: 1 }}>{emptyAction}</Box> : null}
          </Stack>
        </Box>
      ) : null}
    </Box>
  )
}
