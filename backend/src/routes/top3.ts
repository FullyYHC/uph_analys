import { Router } from 'express';
import { pushTop3, getPushStatus } from '../controllers/top3Controller';

const router = Router();

// 手动触发TOP3数据推送
router.post('/push', pushTop3);

// 查询TOP3推送状态
router.get('/status', getPushStatus);

export default router;
