import { Router } from 'express'
import { getAnalyses, getAnalysisDetail, runSync } from '../controllers/analysesController'

const router = Router()

router.get('/', getAnalyses)
router.get('/max-dates', async (req, res, next) => {
  try {
    const { getMaxDates } = await import('../controllers/analysesController')
    return getMaxDates(req, res, next)
  } catch (e) {
    next(e)
  }
})
router.get('/sync/status', async (req, res, next) => {
  try {
    const { getSyncStatus } = await import('../controllers/analysesController')
    return getSyncStatus(req, res)
  } catch (e) {
    next(e)
  }
})
router.get('/pqty-zero', async (req, res, next) => {
  try {
    const { getPqtyZeroFlags } = await import('../controllers/analysesController')
    return getPqtyZeroFlags(req, res, next)
  } catch (e) {
    next(e)
  }
})
router.post('/sync/stop', async (req, res, next) => {
  try {
    const { stopSync } = await import('../controllers/analysesController')
    return stopSync(req, res)
  } catch (e) {
    next(e)
  }
})
router.get('/:serial_number', getAnalysisDetail)
router.post('/sync', runSync)
router.get('/:serial_number/bucket', async (req, res, next) => {
  try {
    const { getBucketDetails } = await import('../controllers/analysesController')
    return getBucketDetails(req, res, next)
  } catch (e) {
    next(e)
  }
})

export default router
