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

const DEFAULT_MAX_MS = Number(process.env.SYNC_MAX_MS || 120000)

export async function startSyncJob(params: { days?: number; date_from?: string; date_to?: string; sources?: ('cs'|'sz')[]; max_ms?: number }) {
  if (currentJob && currentJob.status === 'running') {
    return { ok: false, reason: 'busy', job: currentJob }
  }
  const id = genId()
  currentJob = { id, status: 'running', startedAt: new Date().toISOString(), inserted: 0 }
  const maxMs = params.max_ms && params.max_ms > 0 ? params.max_ms : DEFAULT_MAX_MS
  const timer = setTimeout(() => {
    if (currentJob && currentJob.status === 'running') {
      currentJob.status = 'failed'
      currentJob.finishedAt = new Date().toISOString()
      currentJob.error = `sync timeout after ${maxMs}ms`
    }
  }, maxMs)
  ;(async () => {
    try {
      const result = await syncFromMaclib(params)
      if (!currentJob) return
      currentJob.status = 'completed'
      currentJob.finishedAt = new Date().toISOString()
      currentJob.inserted = result.inserted
      currentJob.range = result.range
      clearTimeout(timer)
    } catch (e: any) {
      if (!currentJob) return
      currentJob.status = 'failed'
      currentJob.finishedAt = new Date().toISOString()
      currentJob.error = e?.message || String(e)
      clearTimeout(timer)
    }
  })()
  return { ok: true, job: currentJob }
}

export function getSyncJobStatus() {
  return currentJob || { id: '', status: 'idle' as JobStatus }
}

export function cancelSyncJob() {
  if (currentJob && currentJob.status === 'running') {
    currentJob.status = 'failed'
    currentJob.finishedAt = new Date().toISOString()
    currentJob.error = 'canceled by user'
    return { ok: true }
  }
  return { ok: false, reason: 'no_running_job' }
}
