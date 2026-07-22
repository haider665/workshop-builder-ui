import { useEffect, useRef } from 'react'
import { workshopApi } from '../services/workshopApi'
import { useCwStore } from '../store/cwStore'

/**
 * Hook to ensure app data is loaded from backend.
 * Safe to call from any page — only fetches once per component mount.
 * Pushes results into cwStore so all pages share the data.
 */
export function useBackendData() {
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    async function load() {
      const safe = async <T,>(label: string, fn: () => Promise<{ data: T[]; meta: { total: number } }>): Promise<T[]> => {
        try {
          const res = await fn()
          return res.data
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
        safe('customers', () => workshopApi.listCustomers({ pageSize: 500 })),
        safe('vehicles', () => workshopApi.listVehicles({ pageSize: 500 })),
        safe('appointments', () => workshopApi.listAppointments({ pageSize: 500 })),
        safe('users', () => workshopApi.listUsers({ pageSize: 500 })),
        safe('concerns', () => workshopApi.listConcerns({ pageSize: 500 })),
        safe('concernCategories', () => workshopApi.listConcernCategories({ pageSize: 500 })),
        safe('services', () => workshopApi.listServices({ pageSize: 500 })),
        safeRaw('roles', async () => (await workshopApi.listRoles(false)).data),
        safe('pendingVehicles', () => workshopApi.listPendingVehicles({ pageSize: 500 })),
        safeRaw('shops', async () => (await workshopApi.listShops()).data),
        safe('bays', () => workshopApi.listBays({ pageSize: 500 })),
        safe('teams', () => workshopApi.listTeams({ pageSize: 500 })),
        safe('jobs', () => workshopApi.listJobs({ pageSize: 500 })),
        safe('tasks', () => workshopApi.listTasks({ pageSize: 500 })),
        safe('taskTemplates', () => workshopApi.listTaskTemplates({ pageSize: 500 })),
        safe('partRequests', () => workshopApi.listPartRequests({ pageSize: 500 })),
        safe('requisitions', () => workshopApi.listRequisitions({ pageSize: 500 })),
        safe('estimateLines', () => workshopApi.listEstimateLines({ pageSize: 500 })),
      ])

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
  }, [])
}

/** @deprecated Use useBackendData instead */
export const useCREData = useBackendData
