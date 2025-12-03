import { create } from 'zustand'
import { analysesApi } from '@/utils/axios'
import { UphAnalys, AnalysesListRes } from '@/types/api'

interface State {
  list: UphAnalys[]
  page: number
  size: number
  total: number
  loading: boolean
  error: string | null
  sort_by: string
  sort_dir: 'asc' | 'desc'
  filters: {
    model?: string
    date_from?: string
    date_to?: string
    source?: string
  }
}

interface Actions {
  fetchList: (params?: Record<string, any>) => Promise<void>
  setPage: (p: number) => void
  setSort: (col: string) => void
  setSize: (s: number) => void
  setFilters: (f: Partial<{ model?: string; date_from?: string; date_to?: string; source?: string }>) => void
}

export const useAnalysesStore = create<State & Actions>((set, get) => ({
  list: [],
  page: 1,
  size: 20,
  total: 0,
  loading: false,
  error: null,
  sort_by: 'date_record',
  sort_dir: 'desc',
  filters: {},
  fetchList: async (params) => {
    set({ loading: true, error: null })
    try {
      const q = {
        page: get().page,
        size: get().size,
        sort_by: get().sort_by,
        sort_dir: get().sort_dir,
        ...get().filters,
        ...(params || {})
      }
      const { data } = await analysesApi.list(q)
      set({ list: data.items, total: data.total, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },
  setPage: (p) => set({ page: p }),
  setSort: (col) => {
    const { sort_by, sort_dir } = get()
    if (col === sort_by) {
      set({ sort_dir: sort_dir === 'asc' ? 'desc' : 'asc' })
    } else {
      set({ sort_by: col, sort_dir: 'asc' })
    }
  },
  setSize: (s) => set({ size: s, page: 1 }),
  setFilters: (f) => set({ filters: { ...get().filters, ...f }, page: 1 })
}))
