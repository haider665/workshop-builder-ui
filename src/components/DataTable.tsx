import {
  Box,
  Button,
  InputAdornment,
  Menu,
  MenuItem,
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
  TextField,
} from '@mui/material'
import { Download, Search } from '@mui/icons-material'
import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
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
  /** Plain value used for table search and CSV export. */
  searchValue?: (row: T) => string | number | null | undefined
  exportValue?: (row: T) => string | number | null | undefined
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
  searchable?: boolean
  searchPlaceholder?: string
  enableExport?: boolean
  exportFilename?: string
  onRowClick?: (row: T) => void
  toolbarActions?: ReactNode
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
  searchable = true,
  searchPlaceholder = 'Search records…',
  enableExport = true,
  exportFilename = 'records.csv',
  onRowClick,
  toolbarActions,
}: DataTableProps<T>) {
  /* ── Sort state ── */
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  /* ── Pagination state ── */
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(initialPageSize)
  const [query, setQuery] = useState('')
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null)

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return rows
    return rows.filter((row) => {
      const explicit = columns.flatMap((column) => {
        const value = column.searchValue?.(row) ?? column.sortValue?.(row)
        return value == null ? [] : [String(value)]
      })
      const fallback = (() => { try { return JSON.stringify(row) } catch { return '' } })()
      return [...explicit, fallback].some((value) => value.toLocaleLowerCase().includes(needle))
    })
  }, [columns, query, rows])

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
    if (!sortKey) return filteredRows

    const col = columns.find((c) => c.key === sortKey)
    if (!col) return filteredRows

    return [...filteredRows].sort((a, b) => {
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
  }, [filteredRows, sortKey, sortDir, columns])

  const safePage = Math.min(page, Math.max(0, Math.ceil(sortedRows.length / rowsPerPage) - 1))
  const paginatedRows = useMemo(
    () => sortedRows.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage),
    [sortedRows, safePage, rowsPerPage],
  )

  const isEmpty = !loading && filteredRows.length === 0

  function exportCsv() {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const lines = [columns.map((column) => escape(column.header)).join(',')]
    for (const row of sortedRows) {
      lines.push(columns.map((column) => {
        const value = column.exportValue?.(row) ?? column.searchValue?.(row) ?? column.sortValue?.(row) ?? ((row as Record<string, unknown>)[column.key])
        return escape(value)
      }).join(','))
    }
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = exportFilename; anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportRows = () => sortedRows.map((row) => Object.fromEntries(columns.map((column) => [column.header, column.exportValue?.(row) ?? column.searchValue?.(row) ?? column.sortValue?.(row) ?? ((row as Record<string, unknown>)[column.key]) ?? ''])))

  function exportExcel() {
    const sheet = XLSX.utils.json_to_sheet(exportRows())
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Records')
    XLSX.writeFile(workbook, exportFilename.replace(/\.csv$/i, '.xlsx'))
  }

  function exportPdf() {
    const popup = window.open('', '_blank', 'noopener,noreferrer')
    if (!popup) return
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)
    const rowsHtml = exportRows().map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column.header])}</td>`).join('')}</tr>`).join('')
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(exportFilename)}</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#172033}h1{font-size:20px;margin:0 0 14px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccd3df;padding:7px;text-align:left;vertical-align:top}th{background:#eef2f7;font-weight:700}footer{margin-top:14px;color:#667085}</style></head><body><h1>${escapeHtml(exportFilename.replace(/\.csv$/i, ''))}</h1><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table><footer>Generated ${escapeHtml(new Date().toLocaleString())}</footer><script>window.onload=()=>window.print()</script></body></html>`)
    popup.document.close()
  }

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
      {(searchable || enableExport || toolbarActions) ? <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ p: { xs: 1.25, sm: 1.5 }, alignItems: { sm: 'center' }, justifyContent: 'space-between', borderBottom: `1px solid ${colors.border.subtle}` }}>
        {searchable ? <TextField size="small" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder={searchPlaceholder} sx={{ width: { xs: '100%', sm: 300 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} slotProps={{ htmlInput: { 'aria-label': searchPlaceholder }, input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} /> : <Box />}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>{toolbarActions}{enableExport ? <><Button size="small" variant="outlined" startIcon={<Download />} onClick={(event) => setExportAnchor(event.currentTarget)} disabled={!sortedRows.length}>Export</Button><Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}><MenuItem onClick={() => { exportCsv(); setExportAnchor(null) }}>CSV file</MenuItem><MenuItem onClick={() => { exportExcel(); setExportAnchor(null) }}>Excel workbook</MenuItem><MenuItem onClick={() => { exportPdf(); setExportAnchor(null) }}>Print / PDF</MenuItem></Menu></> : null}</Stack>
      </Stack> : null}
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
                    hover={Boolean(onRowClick)}
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'button' : undefined}
                    onClick={() => onRowClick?.(row)}
                    onKeyDown={(event) => { if (onRowClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onRowClick(row) } }}
                    sx={{
                      cursor: onRowClick ? 'pointer' : undefined,
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
          count={filteredRows.length}
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
