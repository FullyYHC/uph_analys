import { UphAnalys, UphItem } from '../models/types'
import { pmPool } from '../db'

type ListParams = {
  date_from?: string
  date_to?: string
  model?: string
  source?: string
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
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const sortCol = params.sort_by ?? 'date_record'
  const sortDir = params.sort_dir ?? 'desc'
  const [rows] = await pmPool.query(`SELECT * FROM uph_analys ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`, [...values, size, offset])
  const [countRows] = await pmPool.query(`SELECT COUNT(1) as cnt FROM uph_analys ${whereSql}`, values)
  const total = (countRows as any[])[0]?.cnt ?? 0
  return { items: rows as UphAnalys[], page, size, total }
}

export async function getDetailBySerialNumber(serial: number) {
  const [analysRows] = await pmPool.query('SELECT * FROM uph_analys WHERE serial_number = ?', [serial])
  const [itemRows] = await pmPool.query('SELECT * FROM uph_item WHERE id = ?', [serial])
  const analys = (analysRows as any[])[0] as UphAnalys | undefined
  const item = (itemRows as any[])[0] as UphItem | undefined
  return { analys, item }
}
