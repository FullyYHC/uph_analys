import cron from 'node-cron';
import { pushTop3Data } from '../services/top3Service';
import { startSyncJob } from '../services/syncJob';
import { syncFromMaclib } from '../services/syncService';

/**
 * 设置定时任务
 * 1. 每日上午9:00:00执行TOP3数据推送：仅同步TOP3数据到alarm_info表
 * 2. 每2小时执行一次UPH系统数据同步：对应web页面"同步数据"功能，同步cs/sz源数据到uph_analys表
 */
export function setupScheduledTasks() {
  try {
    console.log('Initializing scheduled tasks...');
    
    // 1. 每日上午9:00:00执行TOP3数据推送任务
    // 仅同步TOP3数据到alarm_info表
    // 格式：秒 分 时 日 月 星期
    const top3Job = cron.schedule('0 0 9 * * *', async () => {
      console.log('Running scheduled TOP3 data push task...');
      
      try {
        const result = await pushTop3Data();
        console.log('Scheduled TOP3 data push completed:', result);
      } catch (error) {
        console.error('Error in scheduled TOP3 data push:', error);
      }
    });
    
    // 2. 每小时检查一次，如果上一次同步已完成则执行新的同步任务
    // 对应web页面"同步数据"功能，同步cs/sz源数据到uph_analys表
    // 格式：秒 分 时 日 月 星期
    let currentSyncPromise: Promise<any> | null = null; // 跟踪当前同步任务
    
    const uphSyncJob = cron.schedule('0 0 */1 * * *', async () => {
      console.log('Checking scheduled UPH system data sync task...');
      
      // 如果有正在执行的同步任务，等待其完成后再执行
      if (currentSyncPromise) {
        console.log('Scheduled UPH system data sync waiting: previous sync still running');
        try {
          // 等待上一次同步完成
          await currentSyncPromise;
          console.log('Previous sync completed, starting new sync...');
        } catch (error) {
          console.log('Previous sync failed, starting new sync...');
        }
      }
      
      // 执行新的同步任务
      currentSyncPromise = (async () => {
        try {
          // 使用与手工同步相同的参数，但限制同步天数为1天，减少单次同步的数据量
          const syncParams = { sources: ['cs', 'sz'], days: 1, forceDays: true };
          
          console.log('Running scheduled UPH system data sync task...');
          
          // 单次尝试，避免长时间占用连接池
          const syncResult = await syncFromMaclib(syncParams);
          
          console.log('Scheduled UPH system data sync completed successfully:', {
            inserted: syncResult.inserted,
            updated: syncResult.updated,
            totalProcessed: syncResult.totalProcessed,
            insertedBy: syncResult.insertedBy,
            updatedBy: syncResult.updatedBy,
            range: syncResult.range,
            sources: syncResult.sources
          });
          
          return syncResult;
        } catch (error: any) {
          console.error('Error in scheduled UPH system data sync:', error.message || error);
          throw error;
        } finally {
          // 同步完成后，清空当前同步任务标记
          currentSyncPromise = null;
        }
      })();
    });
    
    top3Job.start();
    uphSyncJob.start();
    
    console.log('Scheduled tasks initialized successfully:');
    console.log('  1. TOP3 data push: daily at 9:00 AM (only syncs TOP3 data to alarm_info table)');
    console.log('  2. UPH system data sync: every 1 hour (corresponds to web page "Sync Data" function, syncs cs/sz source data to uph_analys table)');
  } catch (error) {
    console.error('Error initializing scheduled tasks:', error);
    throw error;
  }
}
