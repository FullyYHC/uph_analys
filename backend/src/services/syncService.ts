import { csPool, szPool, pmPool } from '../db'
import type { RowDataPacket } from 'mysql2/promise'

type SyncOptions = {
  days?: number
  date_from?: string
  date_to?: string
  sources?: ('cs' | 'sz')[]
}

function toDateTimeString(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

function normalizeFrom(dateStr: string) {
  // Accept 'YYYY-MM-DD' or full datetime; normalize to day start
  // if input is YYYY-MM-DD, append 00:00:00
  // if input is full datetime, return as is
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr} 00:00:00` : dateStr
}
function normalizeTo(dateStr: string) {
  // Accept 'YYYY-MM-DD' or full datetime; normalize to day end
  // if input is YYYY-MM-DD, append 23:59:59
  // if input is full datetime, return as is
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr} 23:59:59` : dateStr
}

function bucketPairs() {
  return [
    [1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12],
    [13, 14], [15, 16], [17, 18], [19, 20], [21, 22], [23, 24]
  ]
}

type PlanRow = { ID: number; Model: string; Qty: number; FUpdateDate: string; LineID?: number }
type QtyRow = { ID: number; PID: number; PQty: number; MQty: number | null; AQty: number | null }

function computeDiff(twoHours: QtyRow[]) {
  const p = twoHours.reduce((s, r) => s + (r.PQty || 0), 0)
  const m = twoHours.reduce((s, r) => s + (r.MQty || 0), 0)
  const a = twoHours.reduce((s, r) => s + (r.AQty || 0), 0)
  const diff = (m || 0) ? m - p : a - p
  return diff
}

export async function syncFromMaclib(opts: SyncOptions & { forceDays?: boolean } = {}) {
  const wantSources = (opts.sources && opts.sources.length) ? opts.sources : ['cs', 'sz']
  const sources = wantSources.map(s => s === 'cs' ? { tag: 'cs', pool: csPool } : { tag: 'sz', pool: szPool })
  let inserted = 0
  let updated = 0
  const insertedBy: Record<string, number> = {}
  const updatedBy: Record<string, number> = {}
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
    // 强制使用指定天数，不使用增量同步
    if (opts.forceDays) {
      from.setDate(to.getDate() - days)
      console.log(`[SYNC] Using forced time range: ${days} days from ${to}`)
    } else {
      // incremental from latest date_record in pm
      try {
        const [pmMaxRows] = await pmPool.query<RowDataPacket[]>('SELECT MAX(date_record) AS maxDate FROM uph_analys')
        if (pmMaxRows?.[0]?.maxDate) {
          from = new Date(pmMaxRows[0].maxDate as any)
          console.log(`[SYNC] Using incremental sync from latest record: ${from}`)
        } else {
          from.setDate(to.getDate() - days)
          console.log(`[SYNC] No latest record found, using ${days} days from ${to}`)
        }
      } catch {
        from.setDate(to.getDate() - days)
        console.log(`[SYNC] Query failed, using ${days} days from ${to}`)
      }
    }
  }
  // Use passed strings directly if available to preserve precision, otherwise format Date objects
  const fromStr = opts.date_from ? normalizeFrom(opts.date_from) : normalizeFrom(toDateTimeString(from))
  const toStr = opts.date_to ? normalizeTo(opts.date_to) : normalizeTo(toDateTimeString(to))
  
  console.log(`[SYNC] Starting data sync with params:`, {
    sources: wantSources,
    timeRange: { from: fromStr, to: toStr },
    days: days
  })
  
  for (const { tag, pool: src } of sources) {
    insertedBy[tag] = 0
    updatedBy[tag] = 0
    
    console.log(`[SYNC-${tag}] Processing source...`)
    
    // 1. 获取时间范围内的所有计划（新增+已存在）
    const [plansRows] = await src.query('SELECT ID, Model, Qty, FUpdateDate, LineID FROM maclib.mes_plan WHERE FUpdateDate > ? AND FUpdateDate <= ? ORDER BY FUpdateDate ASC', [fromStr, toStr])
    const allPlans = plansRows as RowDataPacket[] as PlanRow[]
    
    console.log(`[SYNC-${tag}] Found ${allPlans.length} plans in time range: ${fromStr} to ${toStr}`)
    
    // 2. 处理每个计划
    for (const plan of allPlans) {
      // 检查计划是否已存在
      const [existingRow] = await pmPool.query<RowDataPacket[]>('SELECT 1 FROM uph_analys WHERE serial_number = ? AND data_source = ?', [plan.ID, tag])
      const isExisting = existingRow.length > 0
      
      // 获取最新的数量数据
      const [qtyRowsRaw] = await src.query('SELECT ID, PID, PQty, MQty, AQty FROM maclib.mes_hqty2 WHERE PID = ? ORDER BY ID ASC', [plan.ID])
      const qtyRows = qtyRowsRaw as RowDataPacket[] as QtyRow[]
      
      // 计算差异
      const buckets = bucketPairs().map(pair => qtyRows.filter(q => q.ID === pair[0] || q.ID === pair[1]))
      const diffs = buckets.map(b => b.length ? computeDiff(b as QtyRow[]) : 0)
      
      let lineName: string | null = null
      let lineModel: string | null = null
      try {
        if (typeof (plan as any).LineID !== 'undefined' && (plan as any).LineID != null) {
          const [liRows] = await src.query('SELECT id, lineModel, lineName FROM maclib.mes_lineinfo WHERE id = ? LIMIT 1', [(plan as any).LineID])
          const li = (liRows as RowDataPacket[])[0] as any
          lineModel = li?.lineModel ?? null
          lineName = li?.lineName ?? null
        }
      } catch {
        console.warn(`[SYNC-${tag}] Failed to get line info for plan ${plan.ID}`)
      }

      const payload = {
        serial_number: plan.ID,
        model_type: plan.Model,
        data_source: tag,
        lineName: lineName ?? null,
        lineModel: lineModel ?? null,
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
      
      // 统计有差异的时间段数量
      const diffCount = diffs.filter(d => d !== 0).length;
      
      try {
        await pmPool.query(
          `INSERT INTO uph_analys (
            serial_number, model_type, data_source, lineName, lineModel, date_record,
            diff_cnt_8_10, diff_cnt_10_12, diff_cnt_12_14, diff_cnt_14_16,
            diff_cnt_16_18, diff_cnt_18_20, diff_cnt_20_22, diff_cnt_22_24,
            diff_cnt_24_2, diff_cnt_2_4, diff_cnt_4_6, diff_cnt_6_8
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON DUPLICATE KEY UPDATE
            serial_number=VALUES(serial_number),
            model_type=VALUES(model_type),
            data_source=VALUES(data_source),
            lineName=VALUES(lineName),
            lineModel=VALUES(lineModel),
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
          payload.serial_number, payload.model_type, payload.data_source, payload.lineName, payload.lineModel, payload.date_record,
          payload.diff_cnt_8_10, payload.diff_cnt_10_12, payload.diff_cnt_12_14, payload.diff_cnt_14_16,
          payload.diff_cnt_16_18, payload.diff_cnt_18_20, payload.diff_cnt_20_22, payload.diff_cnt_22_24,
          payload.diff_cnt_24_2, payload.diff_cnt_2_4, payload.diff_cnt_4_6, payload.diff_cnt_6_8
        ])
        
        if (isExisting) {
          updated++
          updatedBy[tag]++
          console.log(`[SYNC-${tag}] ✅ 成功更新计划 ${plan.ID} - ${diffCount}个时间段有差异`)
        } else {
          inserted++
          insertedBy[tag]++
          console.log(`[SYNC-${tag}] ✅ 成功插入新计划 ${plan.ID}`)
        }
      } catch (err: any) {
        if (err && err.code === 'ER_DUP_ENTRY') {
          await pmPool.query(
            `REPLACE INTO uph_analys (
              serial_number, model_type, data_source, lineName, lineModel, date_record,
              diff_cnt_8_10, diff_cnt_10_12, diff_cnt_12_14, diff_cnt_14_16,
              diff_cnt_16_18, diff_cnt_18_20, diff_cnt_20_22, diff_cnt_22_24,
              diff_cnt_24_2, diff_cnt_2_4, diff_cnt_4_6, diff_cnt_6_8
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              payload.serial_number, payload.model_type, payload.data_source, payload.lineName, payload.lineModel, payload.date_record,
              payload.diff_cnt_8_10, payload.diff_cnt_10_12, payload.diff_cnt_12_14, payload.diff_cnt_14_16,
              payload.diff_cnt_16_18, payload.diff_cnt_18_20, payload.diff_cnt_20_22, payload.diff_cnt_22_24,
              payload.diff_cnt_24_2, payload.diff_cnt_2_4, payload.diff_cnt_4_6, payload.diff_cnt_6_8
            ]
          )
          
          if (isExisting) {
            updated++
            updatedBy[tag]++
            console.log(`[SYNC-${tag}] ✅ 成功替换计划 ${plan.ID} - ${diffCount}个时间段有差异`)
          } else {
            inserted++
            insertedBy[tag]++
            console.log(`[SYNC-${tag}] ✅ 成功插入新计划 ${plan.ID} (REPLACE)`)
          }
        } else {
          console.error(`[SYNC-${tag}] ❌ 处理计划 ${plan.ID}失败:`, err.message || err)
          throw err
        }
      }
    }
    
    console.log(`[SYNC-${tag}] Completed processing: ${insertedBy[tag]} inserted, ${updatedBy[tag]} updated`)
  }
  
  const totalProcessed = inserted + updated
  console.log(`[SYNC] Data sync completed:`, {
    inserted: inserted,
    updated: updated,
    totalProcessed: totalProcessed,
    insertedBy: insertedBy,
    updatedBy: updatedBy,
    range: { from: fromStr, to: toStr },
    sources: wantSources
  })
  
  return { 
    ok: true, 
    inserted, 
    updated, 
    totalProcessed, 
    insertedBy, 
    updatedBy, 
    range: { from: fromStr, to: toStr }, 
    sources: wantSources 
  }
}
