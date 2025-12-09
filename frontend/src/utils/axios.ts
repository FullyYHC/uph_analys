import axios from 'axios'
import { AnalysesListRes, AnalysesDetailRes, UphItem, PatchBody, Top3PushResponse, Top3PushStatus } from '@/types/api'

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
  // TOP3推送相关API
  ,top3Push: () => api.post<Top3PushResponse>('/top3/push')
  ,top3Status: () => api.get<Top3PushStatus>('/top3/status')
}

export const itemsApi = {
  get: (id: number) => api.get<UphItem>(`/items/${id}`),
  patch: (id: number, body: PatchBody, userName?: string) => {
    // Include userName in the request body instead of as a URL parameter
    // This avoids issues with URL encoding for Chinese names
    const requestBody = {
      ...body,
      // Only add userName if it exists
      ...(userName ? { userName } : {})
    };
    return api.patch<UphItem>(`/items/${id}`, requestBody);
  }
}
