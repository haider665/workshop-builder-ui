import { useEffect, useRef } from 'react'
import { workshopApi } from '../services/workshopApi'
import { useCwStore } from '../store/cwStore'
import { useCompanyStore } from '../store/companyStore'

/**
 * Hook to ensure app data is loaded from backend.
 * Safe to call from any page — only fetches once per component mount.
 * Pushes results into cwStore so all pages share the data.
 */
export function useBackendData() {
  const loaded = useRef(false)
  const selectedCompanyId = useCompanyStore((state) => state.selectedCompanyId)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    let cancelled = false

    async function load() {
      const safe = async <T,>(
        label: string,
        loader: (page: number, pageSize: number) => Promise<{
          data: T[]
          meta: { total: number; pageSize?: number }
        }>,
      ): Promise<T[]> => {
        try {
          const requestedPageSize = 100
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
        } catch (err) {
          console.warn(`[useBackendData] ${label} failed:`, err)
          return []
        }
      }

      const safeRaw = async <T,>(label: string, fn: () => Promise<T[]>): Promise<T[]> => {
        try {
          return await fn()
        } catch (err) {
          console.warn(`[useBackendData] ${label} failed:`, err)
          return []
        }
      }

      const [
        customers,
        vehicles,
        appointments,
        users,
        concerns,
        concernCategories,
        services,
        roles,
        pendingVehicles,
        shops,
        bays,
        teams,
        jobs,
        tasks,
        taskTemplates,
        partRequests,
        requisitions,
        estimateLines,
      ] = await Promise.all([
        safe('customers', (page, pageSize) => workshopApi.listCustomers({ page, pageSize })),
        safe('vehicles', (page, pageSize) => workshopApi.listVehicles({ page, pageSize })),
        safe('appointments', (page, pageSize) => workshopApi.listAppointments({ page, pageSize })),
        safe('users', (page, pageSize) => workshopApi.listUsers({ page, pageSize })),
        safe('concerns', (page, pageSize) => workshopApi.listConcerns({ page, pageSize })),
        safe('concernCategories', (page, pageSize) => workshopApi.listConcernCategories({ page, pageSize })),
        safe('services', (page, pageSize) => workshopApi.listServices({ page, pageSize })),
        safeRaw('roles', async () => (await workshopApi.listRoles(false)).data),
        safe('pendingVehicles', (page, pageSize) => workshopApi.listPendingVehicles({ page, pageSize })),
        safeRaw('shops', async () => (await workshopApi.listShops()).data),
        safe('bays', (page, pageSize) => workshopApi.listBays({ page, pageSize })),
        safe('teams', (page, pageSize) => workshopApi.listTeams({ page, pageSize })),
        safe('jobs', (page, pageSize) => workshopApi.listJobs({ page, pageSize })),
        safe('tasks', (page, pageSize) => workshopApi.listTasks({ page, pageSize })),
        safe('taskTemplates', (page, pageSize) => workshopApi.listTaskTemplates({ page, pageSize })),
        safe('partRequests', (page, pageSize) => workshopApi.listPartRequests({ page, pageSize })),
        safe('requisitions', (page, pageSize) => workshopApi.listRequisitions({ page, pageSize })),
        safe('estimateLines', (page, pageSize) => workshopApi.listEstimateLines({ page, pageSize })),
      ])

      if (cancelled) return
      useCwStore.setState({
        customers,
        vehicles,
        appointments,
        users,
        concerns,
        concernCategories,
        services,
        roles,
        pendingVehicles,
        shops,
        bays,
        teams,
        jobs,
        tasks,
        taskTemplates,
        partRequests,
        requisitions,
        estimateLines,
      })
    }

    void load()
    return () => { cancelled = true }
  }, [selectedCompanyId])
}

/** @deprecated Use useBackendData instead */
export const useCREData = useBackendData
