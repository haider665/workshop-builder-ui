import { Fragment } from 'react'

export function SearchHighlight({ value, query }: { value: string | number | null | undefined; query: string }) {
  const text = value == null ? '' : String(value)
  const terms = query.trim().split(/\s+/).filter(Boolean).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!text || !terms.length) return <>{text}</>
  const pattern = new RegExp(`(${terms.join('|')})`, 'ig')
  return <>{text.split(pattern).map((part, index) => terms.some((term) => part.toLowerCase() === term.toLowerCase()) ? <mark key={`${part}-${index}`} style={{ background: '#fef08a', color: 'inherit', borderRadius: 2, padding: '0 1px' }}>{part}</mark> : <Fragment key={`${part}-${index}`}>{part}</Fragment>)}</>
}
