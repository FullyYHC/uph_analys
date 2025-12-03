import { syncFromMaclib } from './syncService'

type JobStatus = 'idle' | 'running' | 'completed' | 'failed'

let currentJob: {
  id: string
  status: JobStatus
  startedAt?: string
  finishedAt?: string
  range?: { from: string; to: string }
  inserted?: number
  error?: string
} | null = null

function genId() {
  return Math.random().toString(36).slice(2)
}

export async function startSyncJob(params: { days?: number; date_from?: string; date_to?: string }) {
  if (currentJob && currentJob.status === 'running') {
    return { ok: false, reason: 'busy', job: currentJob }
  }
  const id = genId()
  currentJob = { id, status: 'running', startedAt: new Date().toISOString(), inserted: 0 }
  ;(async () => {
    try {
      const result = await syncFromMaclib(params)
      if (!currentJob) return
      currentJob.status = 'completed'
      currentJob.finishedAt = new Date().toISOString()
      currentJob.inserted = result.inserted
      currentJob.range = result.range
    } catch (e: any) {
      if (!currentJob) return
      currentJob.status = 'failed'
      currentJob.finishedAt = new Date().toISOString()
      currentJob.error = e?.message || String(e)
    }
  })()
  return { ok: true, job: currentJob }
}

export function getSyncJobStatus() {
  return currentJob || { id: '', status: 'idle' as JobStatus }
}
