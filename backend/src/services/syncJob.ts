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

const DEFAULT_MAX_MS = Number(process.env.SYNC_MAX_MS || 240000)

export async function startSyncJob(params: { days?: number; date_from?: string; date_to?: string; sources?: ('cs'|'sz')[]; max_ms?: number }, force: boolean = false) {
  // 强制模式：如果是自动同步或force=true，允许新任务替换旧的失败/完成任务
  const isAutoSync = !params.max_ms && !params.date_from && !params.date_to;
  const canStart = force || isAutoSync || !currentJob || currentJob.status !== 'running';
  
  if (!canStart) {
    return { ok: false, reason: 'busy', job: currentJob }
  }
  
  const id = genId()
  currentJob = { id, status: 'running', startedAt: new Date().toISOString(), inserted: 0 }
  
  // 自动同步时使用更长的超时时间（600秒），确保有足够时间完成同步
  const defaultMaxMs = isAutoSync ? 600000 : DEFAULT_MAX_MS;
  const maxMs = params.max_ms && params.max_ms > 0 ? params.max_ms : defaultMaxMs;
  
  const timer = setTimeout(() => {
    if (currentJob && currentJob.status === 'running') {
      currentJob.status = 'failed'
      currentJob.finishedAt = new Date().toISOString()
      currentJob.error = `sync timeout after ${maxMs}ms`
      // 超时后将currentJob重置为null，允许下次同步
      currentJob = null;
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
      
      // 任务完成后，延迟一段时间再重置currentJob，以便查询任务状态
      setTimeout(() => {
        currentJob = null;
      }, 5000); // 5秒后重置，足够前端查询状态
    } catch (e: any) {
      if (!currentJob) return
      
      currentJob.status = 'failed'
      currentJob.finishedAt = new Date().toISOString()
      currentJob.error = e?.message || String(e)
      clearTimeout(timer)
      
      // 任务失败后立即重置currentJob，允许下次同步
      currentJob = null;
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
