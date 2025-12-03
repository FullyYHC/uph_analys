import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import analysesRouter from './routes/analyses'
import itemsRouter from './routes/items'
import { errorHandler } from './middleware/error'
import { ensureSchema } from './db'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/analyses', analysesRouter)
app.use('/api/items', itemsRouter)

app.use(errorHandler)

const port = process.env.PORT ? Number(process.env.PORT) : 6000
ensureSchema().then(() => {}).catch(() => {})
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})

export default app
