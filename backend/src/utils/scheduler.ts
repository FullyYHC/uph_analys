import cron from 'node-cron';
import { pushTop3Data } from '../services/top3Service';
import { startSyncJob } from '../services/syncJob';

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
    
    // 2. 每2小时执行一次UPH系统数据同步任务
    // 对应web页面"同步数据"功能，同步cs/sz源数据到uph_analys表
    // 格式：秒 分 时 日 月 星期
    const uphSyncJob = cron.schedule('0 0 */2 * * *', async () => {
      console.log('Running scheduled UPH system data sync task...');
      
      try {
        // 使用异步模式执行同步，避免长时间阻塞
        // 对应web页面"同步数据"功能，同步cs/sz源数据到uph_analys表
        // 设置date_from为2小时前，确保同步最近2小时的数据
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
        const result = await startSyncJob({ 
          sources: ['cs', 'sz'], 
          date_from: twoHoursAgo.toISOString().slice(0, 19).replace('T', ' '),
          days: 7 
        });
        console.log('Scheduled UPH system data sync job started:', result);
      } catch (error) {
        console.error('Error in scheduled UPH system data sync:', error);
      }
    });
    
    top3Job.start();
    uphSyncJob.start();
    
    console.log('Scheduled tasks initialized successfully:');
    console.log('  1. TOP3 data push: daily at 9:00 AM (only syncs TOP3 data to alarm_info table)');
    console.log('  2. UPH system data sync: every 2 hours (corresponds to web page "Sync Data" function, syncs cs/sz source data to uph_analys table)');
  } catch (error) {
    console.error('Error initializing scheduled tasks:', error);
    throw error;
  }
}
