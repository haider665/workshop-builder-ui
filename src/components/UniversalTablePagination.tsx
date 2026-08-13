import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function UniversalTablePagination() {
  const location = useLocation()
  useEffect(() => {
    const cleanups: Array<() => void> = []
    let timer = 0
    function scan() {
      document.querySelectorAll<HTMLTableElement>('table.MuiTable-root').forEach((table) => {
        if (table.dataset.autoPaginated || table.closest('[data-cw-data-table]')) return
        const rows = Array.from(table.tBodies[0]?.rows ?? [])
        if (rows.length <= 10) return
        table.dataset.autoPaginated = 'true'
        let page = 0
        const bar = document.createElement('div'); bar.className = 'cw-auto-pagination'
        const label = document.createElement('span'), previous = document.createElement('button'), next = document.createElement('button')
        previous.type = next.type = 'button'; previous.textContent = '‹'; next.textContent = '›'
        previous.setAttribute('aria-label', 'Previous page'); next.setAttribute('aria-label', 'Next page')
        bar.append(label, previous, next)
        table.parentElement?.insertAdjacentElement('afterend', bar)
        const render = () => { const current = Array.from(table.tBodies[0]?.rows ?? []); const pages = Math.ceil(current.length / 10); page = Math.min(page, pages - 1); current.forEach((row, i) => { row.hidden = i < page * 10 || i >= page * 10 + 10 }); label.textContent = `${page * 10 + 1}–${Math.min(page * 10 + 10, current.length)} of ${current.length}`; previous.disabled = page === 0; next.disabled = page >= pages - 1 }
        const prev = () => { page--; render() }, nxt = () => { page++; render() }
        previous.addEventListener('click', prev); next.addEventListener('click', nxt); render()
        cleanups.push(() => { bar.remove(); Array.from(table.tBodies[0]?.rows ?? []).forEach(row => { row.hidden = false }); delete table.dataset.autoPaginated })
      })
    }
    const observer = new MutationObserver(() => { clearTimeout(timer); timer = window.setTimeout(scan, 40) })
    observer.observe(document.body, { childList: true, subtree: true }); scan()
    return () => { observer.disconnect(); clearTimeout(timer); cleanups.forEach(cleanup => cleanup()) }
  }, [location.pathname])
  return null
}
