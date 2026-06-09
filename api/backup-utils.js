export function buildBackupExport(data) {
  return {
    app: 'localhost',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(data))
  };
}

export function parseBackupPayload(payload) {
  const raw = payload?.backup ?? payload;
  const store = raw?.data ?? raw;
  if (!store || typeof store !== 'object') {
    const err = new Error('Invalid backup file format');
    err.code = 'INVALID_BACKUP';
    throw err;
  }
  if (!store.config || !Array.isArray(store.members) || store.bills == null || typeof store.bills !== 'object') {
    const err = new Error('Backup is missing required data (config, members, or bills)');
    err.code = 'INVALID_BACKUP';
    throw err;
  }
  if (!store.sessions || typeof store.sessions !== 'object') store.sessions = {};
  if (!store.expenses || typeof store.expenses !== 'object') store.expenses = {};
  return store;
}
