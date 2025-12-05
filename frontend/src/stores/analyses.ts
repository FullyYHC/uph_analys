import { create } from 'zustand'
import { analysesApi } from '@/utils/axios'
import { UphAnalys, Top3PushStatus } from '@/types/api'

interface State {
  list: UphAnalys[]
  page: number
  size: number
  total: number
  diffTotal: number
  diffDay: number
  diffNight: number
  loading: boolean
  error: string | null
  sort_by: string
  sort_dir: 'asc' | 'desc'
  filters: {
    model?: string
    search?: string
    date_from?: string
    date_to?: string
    source?: string
    line_prefix?: string
    line_group?: string
  }
  // 新增：TOP3推送相关状态
  top3Loading: boolean
  top3Status: Top3PushStatus | null
}

interface Actions {
  fetchList: (params?: Record<string, any>) => Promise<void>
  setPage: (p: number) => void
  setSort: (col: string) => void
  setSize: (s: number) => void
  setFilters: (f: Partial<{ model?: string; search?: string; date_from?: string; date_to?: string; source?: string; line_prefix?: string; line_group?: string }>) => void
  // 新增：TOP3推送相关操作
  pushTop3: () => Promise<void>
  getTop3Status: () => Promise<void>
}

export const useAnalysesStore = create<State & Actions>((set, get) => ({
  list: [],
  page: 1,
  size: 20,
  total: 0,
  diffTotal: 0,
  diffDay: 0,
  diffNight: 0,
  loading: false,
  error: null,
  sort_by: 'diffTotal',
  sort_dir: 'asc',
  filters: (() => {
    const now = new Date()
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const fmt = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      const ss = String(d.getSeconds()).padStart(2, '0')
      return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
    }
    return { date_from: fmt(from), date_to: fmt(now) }
  })(),
  // 新增：TOP3状态初始化
  top3Loading: false,
  top3Status: null,
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
      set({ 
        list: data.items, 
        total: data.total, 
        diffTotal: data.diffTotal ?? 0, 
        diffDay: data.diffDay ?? 0, 
        diffNight: data.diffNight ?? 0, 
        loading: false 
      })
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
  setFilters: (f) => set({ filters: { ...get().filters, ...f }, page: 1 }),
  // 新增：TOP3推送操作
  pushTop3: async () => {
    set({ top3Loading: true })
    try {
      const { data } = await analysesApi.top3Push()
      set({ top3Status: data, top3Loading: false })
    } catch (e: any) {
      set({ 
        top3Status: { 
          success: false, 
          message: e.message || 'TOP3推送失败' 
        }, 
        top3Loading: false 
      })
    }
  },
  // 新增：获取TOP3状态操作
  getTop3Status: async () => {
    try {
      const { data } = await analysesApi.top3Status()
      set({ top3Status: data })
    } catch (e: any) {
      console.error('Failed to get TOP3 status:', e)
      set({ 
        top3Status: { 
          success: false, 
          message: e.message || '获取TOP3状态失败' 
        } 
      })
    }
  }
}))
