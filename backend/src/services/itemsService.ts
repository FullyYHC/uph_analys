import { pmPool } from '../db'
import { UphItem } from '../models/types'

type PatchBody = {
  line_leader_item?: string
  pie_item?: string
  qc_item?: string
}

export async function getItemById(id: number) {
  const [rows] = await pmPool.query('SELECT * FROM uph_item WHERE id = ?', [id])
  return (rows as any[])[0] as UphItem | undefined
}

export async function updateItemPartial(id: number, body: PatchBody, chineseName: string) {
  const fields: string[] = []
  const values: any[] = []
  if (body.line_leader_item !== undefined) { fields.push('line_leader_item = ?'); values.push(body.line_leader_item); fields.push('line_name = ?'); values.push(chineseName) }
  if (body.pie_item !== undefined) { fields.push('pie_item = ?'); values.push(body.pie_item); fields.push('pie_name = ?'); values.push(chineseName) }
  if (body.qc_item !== undefined) { fields.push('qc_item = ?'); values.push(body.qc_item); fields.push('qc_name = ?'); values.push(chineseName) }
  if (!fields.length) return await getItemById(id)
  const sql = `UPDATE uph_item SET ${fields.join(', ')} WHERE id = ?`
  await pmPool.query(sql, [...values, id])
  return await getItemById(id)
}
