import { csPool, szPool } from '../db'
import type { RowDataPacket } from 'mysql2/promise'

const slots: Record<string, [number, number]> = {
  '8_10': [1,2], '10_12': [3,4], '12_14': [5,6], '14_16': [7,8], '16_18': [9,10], '18_20': [11,12],
  '20_22': [13,14], '22_24': [15,16], '24_2': [17,18], '2_4': [19,20], '4_6': [21,22], '6_8': [23,24]
}

function sumQty(rows: any[]) {
  const p = rows.reduce((s, r) => s + (r.PQty || 0), 0)
  const m = rows.reduce((s, r) => s + (r.MQty || 0), 0)
  const a = rows.reduce((s, r) => s + (r.AQty || 0), 0)
  const use = m ? 'M' : 'A'
  const used = use === 'M' ? m : a
  const diff = used - p
  const pct = p ? (used / p) : null
  return { p, m, a, use, used, diff, pct }
}

async function fetchSource(pool: any, pid: number, slot: string) {
  const pair = slots[slot]
  if (!pair) return { source: '', slot, items: [], summary: null }
  const [rows] = await pool.query<RowDataPacket[]>('SELECT ID, PID, PQty, MQty, AQty FROM maclib.mes_hqty2 WHERE PID = ? AND ID IN (?,?) ORDER BY ID ASC', [pid, pair[0], pair[1]])
  const items = (rows as any[]).map(r => ({ ID: r.ID, PQty: r.PQty, MQty: r.MQty, AQty: r.AQty }))
  const summary = sumQty(rows as any[])
  return { items, summary }
}

export async function getBucketBySlot(serial: number, slot: string) {
  const cs = await fetchSource(csPool, serial, slot)
  const sz = await fetchSource(szPool, serial, slot)
  return { slot, cs, sz }
}
