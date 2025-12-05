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

export async function startSyncJob(params: { days?: number; date_from?: string; date_to?: string; sources?: ('cs'|'sz')[]; max_ms?: number }) {
  // 如果有正在运行的任务，取消它并启动新任务
  if (currentJob && currentJob.status === 'running') {
    console.log(`Canceling existing sync job: id=${currentJob.id} to start new job`);
    currentJob.status = 'failed';
    currentJob.finishedAt = new Date().toISOString();
    currentJob.error = 'canceled to start new job';
  }
  const id = genId()
  currentJob = { id, status: 'running', startedAt: new Date().toISOString(), inserted: 0 }
  console.log(`Sync job started: id=${id}, params=${JSON.stringify(params)}`);
  const maxMs = params.max_ms && params.max_ms > 0 ? params.max_ms : DEFAULT_MAX_MS
  const timer = setTimeout(() => {
    if (currentJob && currentJob.status === 'running') {
      console.error(`Sync job timeout: id=${id}, running for ${maxMs}ms`);
      currentJob.status = 'failed'
      currentJob.finishedAt = new Date().toISOString()
      currentJob.error = `sync timeout after ${maxMs}ms`
      console.log(`Sync job failed: id=${id}, error=${currentJob.error}`);
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
      console.log(`Scheduled UPH system data sync completed: inserted ${result.inserted} records, range: ${result.range.from} to ${result.range.to}`)
    } catch (e: any) {
      if (!currentJob) return
      currentJob.status = 'failed'
      currentJob.finishedAt = new Date().toISOString()
      currentJob.error = e?.message || String(e)
      clearTimeout(timer)
      console.error(`Scheduled UPH system data sync failed: ${currentJob.error}`)
    }
  })()
  return { ok: true, job: currentJob }
}

export function getSyncJobStatus() {
  return currentJob || { id: '', status: 'idle' as JobStatus }
}

export function cancelSyncJob() {
  if (currentJob && currentJob.status === 'running') {
    console.log(`Canceling sync job: id=${currentJob.id}`);
    currentJob.status = 'failed'
    currentJob.finishedAt = new Date().toISOString()
    currentJob.error = 'canceled by user'
    return { ok: true }
  }
  return { ok: false, reason: 'no_running_job' }
}

// 强制清理长时间运行的任务
export function cleanupStaleJob() {
  if (currentJob && currentJob.status === 'running') {
    const startTime = new Date(currentJob.startedAt || 0).getTime();
    const now = new Date().getTime();
    const runningTime = now - startTime;
    const maxRunningTime = DEFAULT_MAX_MS * 2; // 允许两倍默认超时时间
    
    if (runningTime > maxRunningTime) {
      console.log(`Cleaning up stale sync job: id=${currentJob.id}, running time: ${runningTime}ms`);
      currentJob.status = 'failed';
      currentJob.finishedAt = new Date().toISOString();
      currentJob.error = `stale job cleaned up after ${runningTime}ms`;
      return { ok: true, job: currentJob };
    }
  }
  return { ok: false, reason: 'no_stale_job' };
}
