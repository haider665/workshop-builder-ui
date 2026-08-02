import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
  Skeleton,
  Stack,
} from '@mui/material'
import { useState, useMemo } from 'react'
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
  /** Whether this column is sortable */
  sortable?: boolean
  /** Custom sort value extractor — preferred over render-based fallback */
  sortValue?: (row: T) => string | number | Date
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
  /** Rows per page (default 10) */
  pageSize?: number
  /** Page-size dropdown options (default [5, 10, 25, 50]) */
  pageSizeOptions?: number[]
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
  pageSize: initialPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
}: DataTableProps<T>) {
  /* ── Sort state ── */
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  /* ── Pagination state ── */
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(initialPageSize)

  /* ── Handle sort toggle ── */
  const handleSort = (colKey: string) => {
    setPage(0)
    if (sortKey !== colKey) {
      setSortKey(colKey)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      // desc → clear
      setSortKey(null)
      setSortDir('asc')
    }
  }

  /* ── Sorted + paginated rows ── */
  const sortedRows = useMemo(() => {
    if (!sortKey) return rows

    const col = columns.find((c) => c.key === sortKey)
    if (!col) return rows

    return [...rows].sort((a, b) => {
      const aVal = col.sortValue
        ? col.sortValue(a)
        : String(col.render(a, 0))
      const bVal = col.sortValue
        ? col.sortValue(b)
        : String(col.render(b, 0))

      let cmp = 0
      if (aVal < bVal) cmp = -1
      else if (aVal > bVal) cmp = 1

      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir, columns])

  const safePage = Math.min(page, Math.max(0, Math.ceil(sortedRows.length / rowsPerPage) - 1))
  const paginatedRows = useMemo(
    () => sortedRows.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage),
    [sortedRows, safePage, rowsPerPage],
  )

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
      <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table
          size="small"
          stickyHeader
          sx={{
            minWidth: Math.max(640, columns.reduce((total, column) => total + (column.minWidth ?? 140), 0)),
          }}
        >
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
                  sx={{
                    minWidth: col.minWidth,
                    ...(col.sortable && { cursor: 'pointer' }),
                  }}
                  sortDirection={
                    sortKey === col.key ? sortDir : false
                  }
                >
                  {col.sortable ? (
                    <TableSortLabel
                      active={sortKey === col.key}
                      direction={sortKey === col.key ? sortDir : 'asc'}
                      onClick={() => handleSort(col.key)}
                      sx={{
                        color: 'inherit !important',
                        '& .MuiTableSortLabel-icon': {
                          color: `${colors.slate[400]} !important`,
                        },
                      }}
                    >
                      {col.header}
                    </TableSortLabel>
                  ) : (
                    col.header
                  )}
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
                          '&:first-of-type': { pl: { xs: 1.5, sm: 3 } },
                          '&:last-of-type': { pr: { xs: 1.5, sm: 3 } },
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
              : paginatedRows.map((row, index) => (
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
                        '&:first-of-type': { pl: { xs: 1.5, sm: 3 } },
                        '&:last-of-type': { pr: { xs: 1.5, sm: 3 } },
                      },
                      '&:last-of-type .MuiTableCell-body': {
                        borderBottom: 'none',
                      },
                    }}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} align={col.align ?? 'left'}>
                        {col.render(row, safePage * rowsPerPage + index)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Pagination ── */}
      {!isEmpty && !loading && (
        <TablePagination
          component="div"
          count={rows.length}
          page={safePage}
          onPageChange={(_e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          rowsPerPageOptions={pageSizeOptions}
          sx={{
            borderTop: `1px solid ${colors.border.subtle}`,
            color: colors.slate[600],
            overflowX: 'auto',
            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows':
              {
                fontSize: '0.8125rem',
              },
            '.MuiTablePagination-toolbar': {
              px: { xs: 1, sm: 2 },
              minWidth: 'max-content',
            },
          }}
        />
      )}

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
