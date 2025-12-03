import mysql from 'mysql2/promise'

export const pmPool = mysql.createPool({
  host: process.env.PM_HOST,
  port: Number(process.env.PM_PORT || 3306),
  user: process.env.PM_USER,
  password: process.env.PM_PASSWORD,
  database: process.env.PM_DATABASE,
  connectionLimit: 10,
  dateStrings: true
})

export const csPool = mysql.createPool({
  host: process.env.CS_HOST,
  port: Number(process.env.CS_PORT || 3306),
  user: process.env.CS_USER,
  password: process.env.CS_PASSWORD,
  database: process.env.CS_DATABASE,
  connectionLimit: 10,
  dateStrings: true
})

export const szPool = mysql.createPool({
  host: process.env.SZ_HOST,
  port: Number(process.env.SZ_PORT || 3306),
  user: process.env.SZ_USER,
  password: process.env.SZ_PASSWORD,
  database: process.env.SZ_DATABASE,
  connectionLimit: 10,
  dateStrings: true
})

export async function ensureSchema() {
  try {
    const [rows] = await pmPool.query<mysql.RowDataPacket[]>(
      "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'uph_analys' AND COLUMN_NAME = 'date_record'",
      [process.env.PM_DATABASE]
    )
    const dtype = rows?.[0]?.DATA_TYPE as string | undefined
    if (dtype && dtype.toLowerCase() === 'date') {
      await pmPool.query("ALTER TABLE uph_analys MODIFY COLUMN date_record DATETIME NOT NULL")
    }
  } catch {}
}
