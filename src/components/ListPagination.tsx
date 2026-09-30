import { TablePagination } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

export function useListPagination<T>(rows: T[], initialRowsPerPage = 10) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const saved = Number(window.localStorage.getItem('cw.table.defaultPageSize'))
    return [5, 10, 25, 50, 100].includes(saved) ? saved : initialRowsPerPage
  })
  useEffect(() => setPage(0), [rows])
  const pageRows = useMemo(
    () => rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rows, rowsPerPage],
  )
  return {
    pageRows,
    pagination: (
      <TablePagination
        component="div"
        count={rows.length}
        page={Math.min(page, Math.max(0, Math.ceil(rows.length / rowsPerPage) - 1))}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          const nextSize = Number(event.target.value)
          setRowsPerPage(nextSize)
          window.localStorage.setItem('cw.table.defaultPageSize', String(nextSize))
          setPage(0)
        }}
        rowsPerPageOptions={[5, 10, 25, 50, 100]}
        labelRowsPerPage="Rows"
        sx={{ borderTop: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
      />
    ),
  }
}
