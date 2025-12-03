import { csPool, szPool, pmPool } from '../db'
import type { RowDataPacket } from 'mysql2/promise'

type SyncOptions = {
  days?: number
  date_from?: string
  date_to?: string
  sources?: ('cs' | 'sz')[]
}

function toDateString(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function normalizeFrom(dateStr: string) {
  // Accept 'YYYY-MM-DD' or full datetime; normalize to day start
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr} 00:00:00` : dateStr
}
function normalizeTo(dateStr: string) {
  // Accept 'YYYY-MM-DD' or full datetime; normalize to day end
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr} 23:59:59` : dateStr
}

function bucketPairs() {
  return [
    [1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12],
    [13, 14], [15, 16], [17, 18], [19, 20], [21, 22], [23, 24]
  ]
}

type PlanRow = { ID: number; Model: string; Qty: number; FUpdateDate: string }
type QtyRow = { ID: number; PID: number; PQty: number; MQty: number | null; AQty: number | null }

function computeDiff(twoHours: QtyRow[]) {
  const p = twoHours.reduce((s, r) => s + (r.PQty || 0), 0)
  const m = twoHours.reduce((s, r) => s + (r.MQty || 0), 0)
  const a = twoHours.reduce((s, r) => s + (r.AQty || 0), 0)
  const diff = (m || 0) ? m - p : a - p
  return diff
}

export async function syncFromMaclib(opts: SyncOptions = {}) {
  const wantSources = (opts.sources && opts.sources.length) ? opts.sources : ['cs', 'sz']
  const sources = wantSources.map(s => s === 'cs' ? { tag: 'cs', pool: csPool } : { tag: 'sz', pool: szPool })
  let inserted = 0
  const insertedBy: Record<string, number> = {}
  const now = new Date()
  let to = opts.date_to ? new Date(opts.date_to) : now
  // use max FUpdateDate across CS & SZ if date_to not provided
  if (!opts.date_to) {
    try {
      const [csMaxRows] = await csPool.query<RowDataPacket[]>( 'SELECT MAX(FUpdateDate) AS maxDate FROM maclib.mes_plan')
      const [szMaxRows] = await szPool.query<RowDataPacket[]>( 'SELECT MAX(FUpdateDate) AS maxDate FROM maclib.mes_plan')
      const maxCs = csMaxRows?.[0]?.maxDate ? new Date(csMaxRows[0].maxDate as any) : undefined
      const maxSz = szMaxRows?.[0]?.maxDate ? new Date(szMaxRows[0].maxDate as any) : undefined
      const candidates = [maxCs, maxSz, now].filter(Boolean) as Date[]
      const maxAll = candidates.sort((a, b) => a.getTime() - b.getTime()).pop()
      if (maxAll) to = maxAll
    } catch {
      // keep now
    }
  }
  let from = opts.date_from ? new Date(opts.date_from) : new Date(to)
  const days = opts.days ?? 7
  if (!opts.date_from) {
    // incremental from latest date_record in pm
    try {
      const [pmMaxRows] = await pmPool.query<RowDataPacket[]>('SELECT MAX(date_record) AS maxDate FROM uph_analys')
      if (pmMaxRows?.[0]?.maxDate) {
        from = new Date(pmMaxRows[0].maxDate as any)
      } else {
        from.setDate(to.getDate() - days)
      }
    } catch {
      from.setDate(to.getDate() - days)
    }
  }
  const fromStr = normalizeFrom(toDateString(from))
  const toStr = normalizeTo(toDateString(to))
  for (const { tag, pool: src } of sources) {
    insertedBy[tag] = 0
    const [plansRows] = await src.query('SELECT ID, Model, Qty, FUpdateDate FROM maclib.mes_plan WHERE FUpdateDate > ? AND FUpdateDate <= ? ORDER BY FUpdateDate ASC', [fromStr, toStr])
    const plans = plansRows as RowDataPacket[] as PlanRow[]
    for (const plan of plans) {
      const [qtyRowsRaw] = await src.query('SELECT ID, PID, PQty, MQty, AQty FROM maclib.mes_hqty2 WHERE PID = ? ORDER BY ID ASC', [plan.ID])
      const qtyRows = qtyRowsRaw as RowDataPacket[] as QtyRow[]
      const buckets = bucketPairs().map(pair => qtyRows.filter(q => q.ID === pair[0] || q.ID === pair[1]))
      const diffs = buckets.map(b => b.length ? computeDiff(b as QtyRow[]) : 0)
      const payload = {
        serial_number: plan.ID,
        model_type: plan.Model,
        date_record: plan.FUpdateDate,
        diff_cnt_8_10: diffs[0] ?? 0,
        diff_cnt_10_12: diffs[1] ?? 0,
        diff_cnt_12_14: diffs[2] ?? 0,
        diff_cnt_14_16: diffs[3] ?? 0,
        diff_cnt_16_18: diffs[4] ?? 0,
        diff_cnt_18_20: diffs[5] ?? 0,
        diff_cnt_20_22: diffs[6] ?? 0,
        diff_cnt_22_24: diffs[7] ?? 0,
        diff_cnt_24_2: diffs[8] ?? 0,
        diff_cnt_2_4: diffs[9] ?? 0,
        diff_cnt_4_6: diffs[10] ?? 0,
        diff_cnt_6_8: diffs[11] ?? 0
      }
      try {
        await pmPool.query(
          `INSERT INTO uph_analys (
            serial_number, model_type, date_record,
            diff_cnt_8_10, diff_cnt_10_12, diff_cnt_12_14, diff_cnt_14_16,
            diff_cnt_16_18, diff_cnt_18_20, diff_cnt_20_22, diff_cnt_22_24,
            diff_cnt_24_2, diff_cnt_2_4, diff_cnt_4_6, diff_cnt_6_8
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON DUPLICATE KEY UPDATE
            serial_number=VALUES(serial_number),
            model_type=VALUES(model_type),
            date_record=VALUES(date_record),
            diff_cnt_8_10=VALUES(diff_cnt_8_10),
            diff_cnt_10_12=VALUES(diff_cnt_10_12),
            diff_cnt_12_14=VALUES(diff_cnt_12_14),
            diff_cnt_14_16=VALUES(diff_cnt_14_16),
            diff_cnt_16_18=VALUES(diff_cnt_16_18),
            diff_cnt_18_20=VALUES(diff_cnt_18_20),
            diff_cnt_20_22=VALUES(diff_cnt_20_22),
            diff_cnt_22_24=VALUES(diff_cnt_22_24),
            diff_cnt_24_2=VALUES(diff_cnt_24_2),
            diff_cnt_2_4=VALUES(diff_cnt_2_4),
            diff_cnt_4_6=VALUES(diff_cnt_4_6),
            diff_cnt_6_8=VALUES(diff_cnt_6_8)
        `
        ,[
          payload.serial_number, payload.model_type, payload.date_record,
          payload.diff_cnt_8_10, payload.diff_cnt_10_12, payload.diff_cnt_12_14, payload.diff_cnt_14_16,
          payload.diff_cnt_16_18, payload.diff_cnt_18_20, payload.diff_cnt_20_22, payload.diff_cnt_22_24,
          payload.diff_cnt_24_2, payload.diff_cnt_2_4, payload.diff_cnt_4_6, payload.diff_cnt_6_8
        ])
      } catch (err: any) {
        if (err && err.code === 'ER_DUP_ENTRY') {
          await pmPool.query(
            `REPLACE INTO uph_analys (
              serial_number, model_type, date_record,
              diff_cnt_8_10, diff_cnt_10_12, diff_cnt_12_14, diff_cnt_14_16,
              diff_cnt_16_18, diff_cnt_18_20, diff_cnt_20_22, diff_cnt_22_24,
              diff_cnt_24_2, diff_cnt_2_4, diff_cnt_4_6, diff_cnt_6_8
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              payload.serial_number, payload.model_type, payload.date_record,
              payload.diff_cnt_8_10, payload.diff_cnt_10_12, payload.diff_cnt_12_14, payload.diff_cnt_14_16,
              payload.diff_cnt_16_18, payload.diff_cnt_18_20, payload.diff_cnt_20_22, payload.diff_cnt_22_24,
              payload.diff_cnt_24_2, payload.diff_cnt_2_4, payload.diff_cnt_4_6, payload.diff_cnt_6_8
            ]
          )
        } else {
          throw err
        }
      }
      inserted++
      insertedBy[tag]++
    }
  }
  return { ok: true, inserted, insertedBy, range: { from: fromStr, to: toStr }, sources: wantSources }
}
