export type PaginatedResponse<T> = {
  data: T[]
  meta: { total: number; pageSize?: number }
}

export async function fetchAllPages<T>(
  loader: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  requestedPageSize = 100,
): Promise<T[]> {
  const first = await loader(1, requestedPageSize)
  const total = first.meta.total ?? first.data.length
  const effectivePageSize = Math.max(1, first.meta.pageSize ?? requestedPageSize)
  const pages = [first.data]

  for (let page = 2; page <= Math.ceil(total / effectivePageSize); page += 1) {
    const next = await loader(page, requestedPageSize)
    pages.push(next.data)
    if (!next.data.length) break
  }

  return pages.flat().slice(0, total)
}
