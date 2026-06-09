/**
 * Local dev server — serves static files + API with file storage
 * Run: node dev-server.mjs
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  hashPassword,
  verifyPassword,
  createSession,
  validateSession,
  revokeSession,
  getMemberRoles,
  sanitizeForClient,
  ensureMemberPasswords,
  mergeMembersPreservingPasswords,
  requireAdmin,
  requireBillManager,
  requireAdminOrBillManager,
  requireSession
} from './api/auth-utils.js';
import { buildBackupExport, parseBackupPayload } from './api/backup-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3456;
const STORE_FILE = path.join(__dirname, 'data', 'store.json');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};

function defaultState() {
  return {
    config: {
      aptName: 'H-38, R-13, Nikunja-2, Dhaka-1229',
      aptFloor: '7TH FLOOR',
      fixedCosts: { rent: 20000, gas: 1080, water: 1000, service: 2000, maid: 2500, wifi: 800 },
      rentSplit: {},
      billManagerId: 'm1',
      adminId: 'm1'
    },
    members: [
      { id: 'm1', name: 'Shimanto', photo: '' },
      { id: 'm2', name: 'Tauqir', photo: '' },
      { id: 'm3', name: 'Parvez', photo: '' }
    ],
    bills: {},
    expenses: {},
    sessions: {}
  };
}

function seedDefaults(data) {
  const parvez = data.members.find(m => m.name === 'Parvez');
  if (parvez && !data.config.rentSplit[parvez.id]) data.config.rentSplit[parvez.id] = 6500;
  if (!data.expenses || typeof data.expenses !== 'object') data.expenses = {};
  ensureMemberPasswords(data);
  return data;
}

function normalizeExpenseItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => ({
      id: String(item.id || `exp${Date.now()}${Math.random().toString(36).slice(2, 6)}`),
      name: String(item.name || '').trim().slice(0, 80),
      price: Number(item.price) || 0,
      category: String(item.category || 'Other').slice(0, 40),
      createdAt: item.createdAt || new Date().toISOString()
    }))
    .filter(item => item.name && item.price > 0);
}

function readStore() {
  try {
    if (fs.existsSync(STORE_FILE)) return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  } catch (_) {}
  return null;
}

function writeStore(data) {
  const dir = path.dirname(STORE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}

function deleteStore() {
  if (fs.existsSync(STORE_FILE)) fs.unlinkSync(STORE_FILE);
}

function buildAuthResponse(data, memberId, token) {
  const member = data.members.find(m => m.id === memberId);
  const roles = getMemberRoles(data, memberId);
  return { token, memberId, name: member?.name || '', photo: member?.photo || '', ...roles };
}

function handleAuthError(res, err) {
  if (err.code === 'AUTH_REQUIRED') {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: err.message, code: err.code }));
  }
  if (err.code === 'FORBIDDEN') {
    res.writeHead(403);
    return res.end(JSON.stringify({ error: err.message, code: err.code }));
  }
  return false;
}

function handleApi(req, res, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET' && req.url === '/api/store') {
    let data = readStore();
    if (!data) { data = seedDefaults(defaultState()); writeStore(data); }
    else seedDefaults(data);
    res.writeHead(200);
    return res.end(JSON.stringify(sanitizeForClient(data)));
  }

  if (req.method === 'POST' && req.url === '/api/store') {
    try {
      const { action, payload } = JSON.parse(body || '{}');
      let data = readStore() || seedDefaults(defaultState());
      seedDefaults(data);
      const token = payload?.token || null;

      if (action === 'login') {
        const { memberId, password } = payload || {};
        const member = data.members.find(m => m.id === memberId);
        if (!member || !verifyPassword(password, member.passwordHash)) {
          res.writeHead(401);
          return res.end(JSON.stringify({ error: 'Invalid member or password', code: 'AUTH_FAILED' }));
        }
        const sessionToken = createSession(data, memberId);
        writeStore(data);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, auth: buildAuthResponse(data, memberId, sessionToken) }));
      }

      if (action === 'logout') {
        revokeSession(data, token);
        writeStore(data);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true }));
      }

      if (action === 'verifySession') {
        const session = validateSession(data, token);
        if (!session) {
          res.writeHead(401);
          return res.end(JSON.stringify({ error: 'Session expired', code: 'AUTH_REQUIRED' }));
        }
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, auth: buildAuthResponse(data, session.memberId, token) }));
      }

      if (action === 'resetPassword') {
        requireAdmin(data, token);
        const { targetMemberId, newPassword } = payload || {};
        if (!targetMemberId || !newPassword || newPassword.length < 4) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'Enter a password with at least 4 characters' }));
        }
        const member = data.members.find(m => m.id === targetMemberId);
        if (!member) {
          res.writeHead(404);
          return res.end(JSON.stringify({ error: 'Member not found' }));
        }
        member.passwordHash = hashPassword(newPassword);
        writeStore(data);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true }));
      }

      if (action === 'saveConfig') {
        requireAdmin(data, token);
        if (payload.config) data.config = { ...data.config, ...payload.config };
        if (payload.members) data.members = mergeMembersPreservingPasswords(data.members, payload.members);
        writeStore(data);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: sanitizeForClient(data) }));
      }

      if (action === 'saveBill') {
        requireAdminOrBillManager(data, token);
        const { monthKey, electricity } = payload || {};
        if (data.bills[monthKey]?.locked) {
          res.writeHead(403);
          return res.end(JSON.stringify({ error: 'Bill already locked. Use reset to change.' }));
        }
        const existing = data.bills[monthKey];
        data.bills[monthKey] = {
          electricity: Number(electricity),
          locked: true,
          savedAt: new Date().toISOString(),
          adjustments: existing?.adjustments || {}
        };
        writeStore(data);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: sanitizeForClient(data) }));
      }

      if (action === 'saveAdjustments') {
        requireBillManager(data, token);
        const { monthKey, adjustments } = payload || {};
        if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'Invalid month' }));
        }
        const existing = data.bills[monthKey];
        if (!existing || !existing.locked) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'Month bill must be locked before adding adjustments' }));
        }
        data.bills[monthKey] = { ...existing, adjustments: adjustments || {} };
        writeStore(data);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: sanitizeForClient(data) }));
      }

      if (action === 'resetBills') {
        requireAdmin(data, token);
        data.bills = {};
        writeStore(data);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: sanitizeForClient(data) }));
      }

      if (action === 'resetBillMonth') {
        requireAdmin(data, token);
        const { monthKey } = payload || {};
        if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'Invalid month selected' }));
        }
        if (!data.bills[monthKey]) {
          res.writeHead(404);
          return res.end(JSON.stringify({ error: 'No locked bill found for that month' }));
        }
        delete data.bills[monthKey];
        writeStore(data);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: sanitizeForClient(data) }));
      }

      if (action === 'resetAll') {
        requireAdmin(data, token);
        deleteStore();
        const fresh = seedDefaults(defaultState());
        writeStore(fresh);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: sanitizeForClient(fresh) }));
      }

      if (action === 'exportBackup') {
        requireAdmin(data, token);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, backup: buildBackupExport(data) }));
      }

      if (action === 'saveExpenses') {
        const session = requireSession(data, token);
        const { monthKey: expenseMonthKey, memberId, items } = payload || {};
        if (!expenseMonthKey || !/^\d{4}-\d{2}$/.test(expenseMonthKey)) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'Invalid month' }));
        }
        if (!memberId || !data.members.some(m => m.id === memberId)) {
          res.writeHead(404);
          return res.end(JSON.stringify({ error: 'Member not found' }));
        }
        const roles = getMemberRoles(data, session.memberId);
        if (session.memberId !== memberId && !roles.isAdmin) {
          res.writeHead(403);
          return res.end(JSON.stringify({ error: 'You can only edit your own expenses', code: 'FORBIDDEN' }));
        }
        if (!data.expenses) data.expenses = {};
        if (!data.expenses[expenseMonthKey]) data.expenses[expenseMonthKey] = { items: {} };
        if (!data.expenses[expenseMonthKey].items) data.expenses[expenseMonthKey].items = {};
        data.expenses[expenseMonthKey].items[memberId] = normalizeExpenseItems(items);
        writeStore(data);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: sanitizeForClient(data) }));
      }

      if (action === 'restoreBackup') {
        requireAdmin(data, token);
        let restored;
        try {
          restored = parseBackupPayload(payload);
        } catch (err) {
          if (err.code === 'INVALID_BACKUP') {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: err.message, code: err.code }));
          }
          throw err;
        }
        seedDefaults(restored);
        writeStore(restored);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true, data: sanitizeForClient(restored) }));
      }

      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'Unknown action' }));
    } catch (err) {
      if (handleAuthError(res, err)) return;
      res.writeHead(500);
      return res.end(JSON.stringify({ error: err.message || 'Server error' }));
    }
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => handleApi(req, res, body));
    return;
  }

  let relPath = req.url.split('?')[0];
  if (relPath === '/') relPath = '/index.html';
  relPath = relPath.replace(/^\//, '');
  const filePath = path.join(__dirname, relPath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`ShareSpace running at http://localhost:${PORT}`);
});
