import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { listAnalyses, getDetailBySerialNumber } from '../services/analysesService'
import { syncFromMaclib } from '../services/syncService'
import { csPool, szPool, pmPool } from '../db'
import { startSyncJob, getSyncJobStatus, cancelSyncJob } from '../services/syncJob'
import { getBucketBySlot } from '../services/bucketService'

const listSchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  model: z.string().optional(),
  source: z.string().optional(),
  line_prefix: z.string().optional(),
  line_group: z.string().optional(),
  line_leader_item: z.string().optional(),
  line_name: z.string().optional(),
  pie_item: z.string().optional(),
  pie_name: z.string().optional(),
  qc_item: z.string().optional(),
  qc_name: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce.number().int().min(1).max(100).optional(),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional()
})

export async function getAnalyses(req: Request, res: Response, next: NextFunction) {
  try {
    const params = listSchema.parse(req.query)
    const data = await listAnalyses(params)
    res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function getAnalysisDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const serial = Number(req.params.serial_number)
    const data = await getDetailBySerialNumber(serial)
    res.json(data)
  } catch (err) {
    next(err)
  }
}

const syncSchema = z.object({
  days: z.coerce.number().int().min(1).max(31).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  sources: z.string().optional()
})

export async function runSync(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = syncSchema.parse(req.query)
    const params: any = { ...raw }
    if (raw.sources) {
      const s = raw.sources.split(',').map(v => v.trim()).filter(Boolean)
      params.sources = s.filter(v => v === 'cs' || v === 'sz')
    }
    const isAsync = String(req.query.async || 'true') === 'true'
    if (isAsync) {
      const r = await startSyncJob(params)
      res.json(r)
    } else {
      const result = await syncFromMaclib(params)
      res.json(result)
    }
  } catch (err) {
    next(err)
  }
}

export async function getMaxDates(_req: Request, res: Response, next: NextFunction) {
  try {
    const [[csMax]] = await csPool.query('SELECT MAX(FUpdateDate) as maxDate FROM maclib.mes_plan')
    const [[szMax]] = await szPool.query('SELECT MAX(FUpdateDate) as maxDate FROM maclib.mes_plan')
    const [[pmMax]] = await pmPool.query('SELECT MAX(date_record) as maxDate FROM uph_analys')
    res.json({ cs: csMax?.maxDate || null, sz: szMax?.maxDate || null, pm: pmMax?.maxDate || null })
  } catch (err) {
    next(err)
  }
}

export async function getSyncStatus(_req: Request, res: Response) {
  res.json(getSyncJobStatus())
}

export async function stopSync(_req: Request, res: Response) {
  res.json(cancelSyncJob())
}

export async function getBucketDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const serial = Number(req.params.serial_number)
    const slot = String(req.query.slot || '')
    const data = await getBucketBySlot(serial, slot)
    res.json(data)
  } catch (err) {
    next(err)
  }
}
