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
}

interface Actions {
  fetchList: (params?: Record<string, any>) => Promise<void>
  setPage: (p: number) => void
  setSort: (col: string) => void
  setSize: (s: number) => void
}

export const useAnalysesStore = create<State & Actions>((set, get) => ({
  list: [],
  page: 1,
  size: 20,
  total: 0,
  loading: false,
  error: null,
  sort_by: 'serial_number',
  sort_dir: 'asc',
  fetchList: async (params) => {
    set({ loading: true, error: null })
    try {
      const { data } = await analysesApi.list({
        page: get().page,
        size: get().size,
        sort_by: get().sort_by,
        sort_dir: get().sort_dir,
        ...params
      })
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
  setSize: (s) => set({ size: s, page: 1 })
}))
