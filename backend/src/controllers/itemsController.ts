import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { getItemById, updateItemPartial } from '../services/itemsService'
import { extractChineseName } from '../utils/userName'

const patchSchema = z.object({
  line_leader_item: z.string().optional(),
  pie_item: z.string().optional(),
  qc_item: z.string().optional()
})

export async function getItem(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id)
    const data = await getItemById(id)
    res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function patchItem(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('PATCH request received:', req.params, req.query, req.body)
    const id = Number(req.params.id)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' })
    }
    const body = patchSchema.parse(req.body)
    const userName = req.query.userName ? String(req.query.userName) : ''
    console.log('Extracted userName:', userName)
    const cn = extractChineseName(userName)
    console.log('Extracted chineseName:', cn)
    const data = await updateItemPartial(id, body, cn)
    console.log('Update successful, returning data:', data)
    res.json(data)
  } catch (err) {
    console.error('Patch Error:', err)
    console.error('Error stack:', err.stack)
    next(err)
  }
}
