import { create } from 'zustand'
import { workshopApi, type WorkshopNavigation } from '../services/workshopApi'

const key = 'cw.workshop.selectedCompany'

type CompanyState = {
  companies: WorkshopNavigation['companies']
  shops: WorkshopNavigation['shops']
  selectedCompanyId: string
  loading: boolean
  load: () => Promise<void>
  select: (companyId: string) => void
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [], shops: [], selectedCompanyId: '', loading: false,
  load: async () => {
    set({ loading: true })
    try {
      const navigation = await workshopApi.navigation()
      const saved = localStorage.getItem(key) || ''
      const selectedCompanyId = navigation.companies.some((item) => item.id === saved) ? saved : navigation.companies[0]?.id || ''
      if (selectedCompanyId) localStorage.setItem(key, selectedCompanyId)
      workshopApi.setCompanyContext(selectedCompanyId)
      set({ companies: navigation.companies, shops: navigation.shops, selectedCompanyId })
    } finally { set({ loading: false }) }
  },
  select: (companyId) => {
    if (!get().companies.some((item) => item.id === companyId)) return
    localStorage.setItem(key, companyId)
    workshopApi.setCompanyContext(companyId)
    set({ selectedCompanyId: companyId })
    window.dispatchEvent(new CustomEvent('cw:company-changed', { detail: { companyId } }))
  },
}))
