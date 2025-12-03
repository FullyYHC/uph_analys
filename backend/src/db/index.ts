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
    // add data_source column if missing
    const [srcCol] = await pmPool.query<mysql.RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'uph_analys' AND COLUMN_NAME = 'data_source'",
      [process.env.PM_DATABASE]
    )
    if (!srcCol || (srcCol as any[]).length === 0) {
      await pmPool.query("ALTER TABLE uph_analys ADD COLUMN data_source VARCHAR(8) NOT NULL DEFAULT 'unknown' AFTER model_type")
    }
    const [idxRows] = await pmPool.query<mysql.RowDataPacket[]>(
      "SELECT INDEX_NAME, NON_UNIQUE FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'uph_analys'",
      [process.env.PM_DATABASE]
    )
    const hasSrcUnique = (idxRows as any[]).some(r => r.INDEX_NAME === 'idx_model_date_src')
    const hasOldUnique = (idxRows as any[]).some(r => r.INDEX_NAME === 'idx_model_date')
    if (!hasSrcUnique) {
      if (hasOldUnique) {
        try { await pmPool.query("DROP INDEX idx_model_date ON uph_analys") } catch {}
      }
      try {
        await pmPool.query("CREATE UNIQUE INDEX idx_model_date_src ON uph_analys (model_type, date_record, data_source)")
      } catch {}
    }
  } catch {}
}
