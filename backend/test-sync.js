require('dotenv').config();
const { startSyncJob } = require('./src/services/syncJob');

console.log('当前时间:', new Date().toLocaleString());
console.log('开始手动触发同步任务...');

startSyncJob({ sources: ['cs', 'sz'], days: 1 }, true)
  .then(result => {
    console.log('同步任务启动结果:', result);
    // 等待5秒后检查任务状态
    setTimeout(async () => {
      const { getSyncJobStatus } = require('./src/services/syncJob');
      const status = getSyncJobStatus();
      console.log('5秒后任务状态:', status);
    }, 5000);
  })
  .catch(error => {
    console.error('同步任务启动失败:', error);
  });