import mysql from 'mysql2/promise'

// 数据库连接池配置选项
const poolOptions = {
  connectionLimit: 10,              // 最大连接数
  waitForConnections: true,         // 当连接池满时等待获取连接
  queueLimit: 20,                   // 连接请求队列大小，避免内存溢出
  idleTimeout: 30000,               // 空闲连接超时时间，30秒
  enableKeepAlive: true,            // 启用TCP keep-alive
  keepAliveInitialDelay: 60000,     // TCP keep-alive初始延迟时间，60秒
  dateStrings: true,                // 将日期转换为字符串
  connectTimeout: 10000             // 连接建立超时10秒
}

export const pmPool = mysql.createPool({
  host: process.env.PM_HOST,
  port: Number(process.env.PM_PORT || 3306),
  user: process.env.PM_USER,
  password: process.env.PM_PASSWORD,
  database: process.env.PM_DATABASE,
  ...poolOptions
})

export const csPool = mysql.createPool({
  host: process.env.CS_HOST,
  port: Number(process.env.CS_PORT || 3306),
  user: process.env.CS_USER,
  password: process.env.CS_PASSWORD,
  database: process.env.CS_DATABASE,
  ...poolOptions
})

export const szPool = mysql.createPool({
  host: process.env.SZ_HOST,
  port: Number(process.env.SZ_PORT || 3306),
  user: process.env.SZ_USER,
  password: process.env.SZ_PASSWORD,
  database: process.env.SZ_DATABASE,
  ...poolOptions
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

    // add lineName / lineModel columns if missing
    const [lineNameCol] = await pmPool.query<mysql.RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'uph_analys' AND COLUMN_NAME = 'lineName'",
      [process.env.PM_DATABASE]
    )
    if (!lineNameCol || (lineNameCol as any[]).length === 0) {
      await pmPool.query("ALTER TABLE uph_analys ADD COLUMN lineName VARCHAR(64) NULL AFTER model_type")
    }
    const [lineModelCol] = await pmPool.query<mysql.RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'uph_analys' AND COLUMN_NAME = 'lineModel'",
      [process.env.PM_DATABASE]
    )
    if (!lineModelCol || (lineModelCol as any[]).length === 0) {
      await pmPool.query("ALTER TABLE uph_analys ADD COLUMN lineModel VARCHAR(64) NULL AFTER lineName")
    }

    // Update Primary Key to be composite (serial_number, data_source)
    const [pkRows] = await pmPool.query<mysql.RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'uph_analys' AND CONSTRAINT_NAME = 'PRIMARY'",
      [process.env.PM_DATABASE]
    )
    const pkCols = (pkRows as any[]).map(r => r.COLUMN_NAME)
    // If PK is just serial_number, drop and recreate
    if (pkCols.length === 1 && pkCols.includes('serial_number')) {
      try {
        // Check for AUTO_INCREMENT
        const [colRows] = await pmPool.query<mysql.RowDataPacket[]>(
          "SELECT EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'uph_analys' AND COLUMN_NAME = 'serial_number'",
          [process.env.PM_DATABASE]
        )
        const extra = (colRows as any[])[0]?.EXTRA
        if (extra && extra.includes('auto_increment')) {
          await pmPool.query("ALTER TABLE uph_analys MODIFY COLUMN serial_number INT NOT NULL")
        }
        
        await pmPool.query("ALTER TABLE uph_analys DROP PRIMARY KEY")
        await pmPool.query("ALTER TABLE uph_analys ADD PRIMARY KEY (serial_number, data_source)")
        console.log('Updated Primary Key to (serial_number, data_source)')
      } catch (e) {
        console.error('Failed to update PK:', e)
      }
    }
  } catch {}
  
  // Ensure uph_item table exists
  try {
    await pmPool.query(`
      CREATE TABLE IF NOT EXISTS uph_item (
        id INT NOT NULL PRIMARY KEY,
        line_leader_item TEXT NOT NULL,
        line_name VARCHAR(64) DEFAULT '',
        pie_item TEXT NOT NULL,
        pie_name VARCHAR(64) DEFAULT '',
        qc_item TEXT NOT NULL,
        qc_name VARCHAR(64) DEFAULT ''
      )
    `)

    // Add missing columns to uph_item if table already existed but schema was different
    const [uphItemCols] = await pmPool.query<mysql.RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'uph_item'",
      [process.env.PM_DATABASE]
    )
    const existingCols = (uphItemCols as any[]).map(r => r.COLUMN_NAME.toLowerCase())
    
    if (!existingCols.includes('line_name')) {
      await pmPool.query("ALTER TABLE uph_item ADD COLUMN line_name VARCHAR(64) NULL AFTER line_leader_item")
    }
    if (!existingCols.includes('pie_name')) {
      await pmPool.query("ALTER TABLE uph_item ADD COLUMN pie_name VARCHAR(64) NULL AFTER pie_item")
    }
    if (!existingCols.includes('qc_name')) {
      await pmPool.query("ALTER TABLE uph_item ADD COLUMN qc_name VARCHAR(64) NULL AFTER qc_item")
    }
  } catch (e) {
    console.error('Failed to create uph_item table:', e)
  }
}
