import { UphAnalys, UphItem } from '../models/types'
import { pmPool } from '../db'
import { getPqtyZero } from './bucketService'

type ListParams = {
  date_from?: string
  date_to?: string
  model?: string
  source?: string
  line_prefix?: string
  line_group?: string
  line_leader_item?: string
  line_name?: string
  pie_item?: string
  pie_name?: string
  qc_item?: string
  qc_name?: string
  page?: number
  size?: number
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

function toSqlDateTime(input?: string, mode: 'from' | 'to' = 'from') {
  if (!input) return undefined
  const s = String(input).replace('T', ' ')
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return mode === 'from' ? `${s} 00:00:00` : `${s} 23:59:59`
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) {
    return s.length === 16 ? `${s}:00` : s
  }
  const d = new Date(input)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
}

export async function listAnalyses(params: ListParams) {
  const size = params.size ?? 20
  const page = params.page ?? 1
  const offset = (page - 1) * size
  const where: string[] = []
  const values: any[] = []
  const df = toSqlDateTime(params.date_from, 'from')
  const dt = toSqlDateTime(params.date_to, 'to')
  // Ensure from <= to
  let fromVal = df
  let toVal = dt
  if (fromVal && toVal && fromVal > toVal) {
    const tmp = fromVal; fromVal = toVal; toVal = tmp
  }
  if (fromVal) { where.push('date_record >= ?'); values.push(fromVal) }
  if (toVal) { where.push('date_record <= ?'); values.push(toVal) }
  if (params.model) { where.push('model_type LIKE ?'); values.push(`%${params.model}%`) }
  if (params.source && params.source !== 'all') { where.push('data_source = ?'); values.push(params.source) }
  if (params.line_prefix && /^[A-Fa-f]$/.test(params.line_prefix)) { where.push('lineName LIKE ?'); values.push(`${params.line_prefix.toUpperCase()}%`) }
  if (params.line_group === 'O') { where.push('(lineName IS NULL OR (lineName NOT LIKE ? AND lineName NOT LIKE ? AND lineName NOT LIKE ? AND lineName NOT LIKE ? AND lineName NOT LIKE ? AND lineName NOT LIKE ?))'); values.push('A%','B%','C%','D%','E%','F%') }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const sortCol = params.sort_by ?? 'date_record'
  const sortDir = params.sort_dir ?? 'desc'
  const [rows] = await pmPool.query(`SELECT * FROM uph_analys ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`, [...values, size, offset])
  const items = (rows as any[]) as UphAnalys[]
  try {
    const ids = items.map(it => it.serial_number)
    if (ids.length) {
      const src = params.source === 'cs' || params.source === 'sz' ? params.source : undefined
      if (src) {
        const z = await getPqtyZero(ids, src as any)
        for (const it of items) {
          ;(it as any).pqtyZero = z[it.serial_number] || {}
        }
      } else {
        const zCs = await getPqtyZero(ids, 'cs' as any)
        const zSz = await getPqtyZero(ids, 'sz' as any)
        for (const it of items) {
          const a = zCs[it.serial_number] || {}
          const b = zSz[it.serial_number] || {}
          const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]))
          const combined: Record<string, boolean> = {}
          for (const k of keys) combined[k] = !!(a[k] && b[k])
          ;(it as any).pqtyZero = combined
        }
      }
    }
  } catch {}
  const [countRows] = await pmPool.query(`SELECT COUNT(1) as cnt FROM uph_analys ${whereSql}`, values)
  const total = (countRows as any[])[0]?.cnt ?? 0

  // Calculate Grand Total of Differences for filtered rows
  const [sumRows] = await pmPool.query(`
    SELECT SUM(
      diff_cnt_8_10 + diff_cnt_10_12 + diff_cnt_12_14 + diff_cnt_14_16 + 
      diff_cnt_16_18 + diff_cnt_18_20 + diff_cnt_20_22 + diff_cnt_22_24 + 
      diff_cnt_24_2 + diff_cnt_2_4 + diff_cnt_4_6 + diff_cnt_6_8
    ) as diffTotal,
    SUM(
      diff_cnt_8_10 + diff_cnt_10_12 + diff_cnt_12_14 + diff_cnt_14_16 + 
      diff_cnt_16_18 + diff_cnt_18_20
    ) as diffDay,
    SUM(
      diff_cnt_20_22 + diff_cnt_22_24 + 
      diff_cnt_24_2 + diff_cnt_2_4 + diff_cnt_4_6 + diff_cnt_6_8
    ) as diffNight
    FROM uph_analys ${whereSql}
  `, values)
  const row = (sumRows as any[])[0]
  const diffTotal = row?.diffTotal ?? 0
  const diffDay = row?.diffDay ?? 0
  const diffNight = row?.diffNight ?? 0

  return { items, page, size, total, diffTotal, diffDay, diffNight }
}

export async function getDetailBySerialNumber(serial: number) {
  const [analysRows] = await pmPool.query('SELECT * FROM uph_analys WHERE serial_number = ?', [serial])
  const [itemRows] = await pmPool.query('SELECT * FROM uph_item WHERE id = ?', [serial])
  const analys = (analysRows as any[])[0] as UphAnalys | undefined
  const item = (itemRows as any[])[0] as UphItem | undefined
  return { analys, item }
}
