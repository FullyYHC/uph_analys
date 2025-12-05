import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import analysesRouter from './routes/analyses'
import itemsRouter from './routes/items'
import top3Router from './routes/top3' // 新增：导入TOP3路由
import { errorHandler } from './middleware/error'
import { ensureSchema } from './db'
import { setupScheduledTasks } from './utils/scheduler' // 新增：导入定时任务设置函数

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/analyses', analysesRouter)
app.use('/api/items', itemsRouter)
app.use('/api/top3', top3Router) // 新增：注册TOP3路由

app.use(errorHandler)

const port = process.env.PORT ? Number(process.env.PORT) : 6000
ensureSchema().then(() => {
  // 新增：在确保数据库模式后初始化定时任务
  setupScheduledTasks()
}).catch(() => {
  console.error('Failed to ensure schema, but continuing with scheduled tasks setup')
  setupScheduledTasks() // 即使schema确保失败，也尝试初始化定时任务
})
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})

export default app
