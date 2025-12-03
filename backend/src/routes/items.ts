import { Router } from 'express'
import { getItem, patchItem } from '../controllers/itemsController'

const router = Router()

router.get('/:id', getItem)
router.patch('/:id', patchItem)

export default router
