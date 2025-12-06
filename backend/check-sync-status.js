const { getSyncJobStatus } = require('./src/services/syncJob');

console.log('Current sync job status:', getSyncJobStatus());