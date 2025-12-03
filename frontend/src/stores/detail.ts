import { create } from 'zustand'
import { analysesApi, itemsApi } from '@/utils/axios'
import { UphAnalys, UphItem, PatchBody } from '@/types/api'

interface State {
  analys?: UphAnalys
  item?: UphItem
  loading: boolean
  error: string | null
}

interface Actions {
  fetchDetail: (serial: number) => Promise<void>
  patchItem: (id: number, body: PatchBody, userName?: string) => Promise<void>
}

export const useDetailStore = create<State & Actions>((set) => ({
  analys: undefined,
  item: undefined,
  loading: false,
  error: null,
  fetchDetail: async (serial) => {
    set({ loading: true, error: null })
    try {
      const { data } = await analysesApi.detail(serial)
      set({ analys: data.analys, item: data.item, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },
  patchItem: async (id, body, userName) => {
    try {
      const { data } = await itemsApi.patch(id, body, userName)
      set({ item: data })
    } catch (e: any) {
      set({ error: e.message })
    }
  }
}))