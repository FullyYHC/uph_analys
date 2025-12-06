// Test script to simulate automatic sync job
const { startSyncJob } = require('./src/services/syncJob');

async function testAutoSync() {
  console.log('Testing automatic sync job...');
  try {
    // Simulate automatic sync (no max_ms, date_from, date_to)
    const result = await startSyncJob({ sources: ['cs', 'sz'], days: 7 });
    console.log('First automatic sync started:', result);
    
    // Wait a bit and then try to start another sync (should succeed)
    setTimeout(async () => {
      console.log('Trying to start second automatic sync...');
      const result2 = await startSyncJob({ sources: ['cs', 'sz'], days: 7 });
      console.log('Second automatic sync started:', result2);
      
      // Check job status
      const status = require('./src/services/syncJob').getSyncJobStatus();
      console.log('Current job status:', status);
    }, 1000);
    
  } catch (error) {
    console.error('Error testing automatic sync:', error);
  }
}

testAutoSync();