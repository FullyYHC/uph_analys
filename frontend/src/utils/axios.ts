import axios from 'axios'
import { AnalysesListRes, AnalysesDetailRes, UphItem, PatchBody } from '@/types/api'

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export const analysesApi = {
  list: (params?: Record<string, any>) => api.get<AnalysesListRes>('/analyses', { params }),
  detail: (serial: number) => api.get<AnalysesDetailRes>(`/analyses/${serial}`),
  sync: (params?: Record<string, any>) => api.post('/analyses/sync', null, { params: { ...(params || {}), async: true }, timeout: 10000 }),
  syncStatus: () => api.get('/analyses/sync/status'),
  maxDates: () => api.get('/analyses/max-dates')
  ,bucket: (serial: number, slot: string, source?: 'cs'|'sz') => api.get(`/analyses/${serial}/bucket`, { params: { slot, source } })
  ,pqtyZero: (ids: number[], source: 'cs'|'sz') => api.get('/analyses/pqty-zero', { params: { ids: ids.join(','), source } })
}

export const itemsApi = {
  get: (id: number) => api.get<UphItem>(`/items/${id}`),
  patch: (id: number, body: PatchBody, userName?: string) => api.patch<UphItem>(`/items/${id}`, body, { params: { userName } })
}
