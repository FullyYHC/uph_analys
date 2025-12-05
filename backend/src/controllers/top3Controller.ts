import { Request, Response, NextFunction } from 'express';
import { pushTop3Data, checkTodayPush } from '../services/top3Service';
import { pmPool } from '../db';

/**
 * 手动触发TOP3数据推送
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export async function pushTop3(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('Received TOP3 push request');
    
    // 调用服务层的推送方法
    const result = await pushTop3Data();
    
    console.log('TOP3 push result:', result);
    
    // 返回响应
    res.json(result);
  } catch (error) {
    console.error('Error handling TOP3 push request:', error);
    next(error);
  }
}

/**
 * 查询TOP3推送状态
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export async function getPushStatus(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('Received TOP3 status request');
    
    // 检查当天是否已推送
    const hasPushed = await checkTodayPush();
    
    // 获取最后一次推送时间
    let lastPushTime: string | undefined;
    if (hasPushed) {
      const [rows] = await pmPool.query(
        'SELECT MAX(updated_at) as lastPushTime FROM alarm_info WHERE alarm_level = ?',
        ['UPH_TOP3差异推送']
      );
      lastPushTime = (rows as any[])[0]?.lastPushTime;
    }
    
    const result = {
      success: true,
      message: hasPushed ? '当天已推送数据' : '当天未推送数据',
      lastPushTime
    };
    
    console.log('TOP3 status result:', result);
    
    // 返回响应
    res.json(result);
  } catch (error) {
    console.error('Error handling TOP3 status request:', error);
    next(error);
  }
}
