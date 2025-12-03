import { UphAnalys, UphItem } from '../models/types'
import { pmPool } from '../db'

type ListParams = {
  date_from?: string
  date_to?: string
  model?: string
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

export async function listAnalyses(params: ListParams) {
  const size = params.size ?? 20
  const page = params.page ?? 1
  const offset = (page - 1) * size
  const where: string[] = []
  const values: any[] = []
  if (params.date_from) { where.push('date_record >= ?'); values.push(params.date_from) }
  if (params.date_to) { where.push('date_record <= ?'); values.push(params.date_to) }
  if (params.model) { where.push('model_type LIKE ?'); values.push(`%${params.model}%`) }
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
