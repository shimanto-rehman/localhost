import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';
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
  requireSession,
  DEFAULT_PASSWORD
} from './auth-utils.js';
import { buildBackupExport, parseBackupPayload } from './backup-utils.js';

const STORE_KEY = 'sharespace:store';
const LOCAL_FILE = path.join(process.cwd(), 'data', 'store.json');
const STORAGE_ERROR = 'Storage not configured. Add Upstash Redis to your Vercel project (Storage → Marketplace → Upstash Redis), then redeploy.';

function isVercel() {
  return !!process.env.VERCEL;
}

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function hasPersistentStorage() {
  return !!getRedis() || !isVercel();
}

function defaultState() {
  return {
    config: {
      aptName: 'H-38, R-13, Nikunja-2, Dhaka-1229',
      aptFloor: '7TH FLOOR',
      fixedCosts: {
        rent: 20000,
        gas: 1080,
        water: 1000,
        service: 2000,
        maid: 2500,
        wifi: 800
      },
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
  if (parvez && !data.config.rentSplit[parvez.id]) {
    data.config.rentSplit[parvez.id] = 6500;
  }
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

async function readStore() {
  const redis = getRedis();
  if (redis) {
    const data = await redis.get(STORE_KEY);
    return data || null;
  }
  if (isVercel()) return null;
  try {
    if (fs.existsSync(LOCAL_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
    }
  } catch (_) {}
  return null;
}

async function writeStore(data) {
  const redis = getRedis();
  if (redis) {
    await redis.set(STORE_KEY, data);
    return;
  }
  if (isVercel()) {
    const err = new Error(STORAGE_ERROR);
    err.code = 'STORAGE_NOT_CONFIGURED';
    throw err;
  }
  const dir = path.dirname(LOCAL_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2));
}

async function deleteStore() {
  const redis = getRedis();
  if (redis) {
    await redis.del(STORE_KEY);
    return;
  }
  if (isVercel()) {
    const err = new Error(STORAGE_ERROR);
    err.code = 'STORAGE_NOT_CONFIGURED';
    throw err;
  }
  if (fs.existsSync(LOCAL_FILE)) fs.unlinkSync(LOCAL_FILE);
}

async function loadOrCreateStore() {
  let data = await readStore();
  if (data) return seedDefaults(data);
  if (!hasPersistentStorage()) {
    const err = new Error(STORAGE_ERROR);
    err.code = 'STORAGE_NOT_CONFIGURED';
    throw err;
  }
  data = seedDefaults(defaultState());
  await writeStore(data);
  return data;
}

function authErrorResponse(res, err) {
  if (err.code === 'AUTH_REQUIRED') return res.status(401).json({ error: err.message, code: err.code });
  if (err.code === 'FORBIDDEN') return res.status(403).json({ error: err.message, code: err.code });
  return null;
}

function storageErrorResponse(res, err) {
  if (err.code === 'STORAGE_NOT_CONFIGURED') {
    return res.status(503).json({ error: STORAGE_ERROR, code: 'STORAGE_NOT_CONFIGURED' });
  }
  return res.status(500).json({ error: err.message || 'Server error' });
}

function buildAuthResponse(data, memberId, token) {
  const member = data.members.find(m => m.id === memberId);
  const roles = getMemberRoles(data, memberId);
  return {
    token,
    memberId,
    name: member?.name || '',
    photo: member?.photo || '',
    ...roles
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const data = await loadOrCreateStore();
      return res.status(200).json(sanitizeForClient(data));
    }

    if (req.method === 'PUT') {
      return res.status(405).json({ error: 'Use POST actions with authentication' });
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body || {};
      let data = await readStore();
      if (!data) {
        if (!hasPersistentStorage()) {
          return res.status(503).json({ error: STORAGE_ERROR, code: 'STORAGE_NOT_CONFIGURED' });
        }
        data = seedDefaults(defaultState());
      } else {
        seedDefaults(data);
      }

      const token = payload?.token || null;

      if (action === 'login') {
        const { memberId, password } = payload || {};
        const member = data.members.find(m => m.id === memberId);
        if (!member || !verifyPassword(password, member.passwordHash)) {
          return res.status(401).json({ error: 'Invalid member or password', code: 'AUTH_FAILED' });
        }
        const sessionToken = createSession(data, memberId);
        await writeStore(data);
        return res.status(200).json({ ok: true, auth: buildAuthResponse(data, memberId, sessionToken) });
      }

      if (action === 'logout') {
        revokeSession(data, token);
        await writeStore(data);
        return res.status(200).json({ ok: true });
      }

      if (action === 'verifySession') {
        const session = validateSession(data, token);
        if (!session) return res.status(401).json({ error: 'Session expired', code: 'AUTH_REQUIRED' });
        return res.status(200).json({ ok: true, auth: buildAuthResponse(data, session.memberId, token) });
      }

      if (action === 'resetPassword') {
        requireAdmin(data, token);
        const { targetMemberId, newPassword } = payload || {};
        if (!targetMemberId || !newPassword || newPassword.length < 4) {
          return res.status(400).json({ error: 'Enter a password with at least 4 characters' });
        }
        const member = data.members.find(m => m.id === targetMemberId);
        if (!member) return res.status(404).json({ error: 'Member not found' });
        member.passwordHash = hashPassword(newPassword);
        await writeStore(data);
        return res.status(200).json({ ok: true });
      }

      if (action === 'saveConfig') {
        requireAdmin(data, token);
        if (payload.config) data.config = { ...data.config, ...payload.config };
        if (payload.members) {
          data.members = mergeMembersPreservingPasswords(data.members, payload.members);
        }
        await writeStore(data);
        return res.status(200).json({ ok: true, data: sanitizeForClient(data) });
      }

      if (action === 'saveBill') {
        requireAdminOrBillManager(data, token);
        const { monthKey, electricity } = payload || {};
        if (!monthKey || electricity == null || electricity <= 0) {
          return res.status(400).json({ error: 'Invalid bill data' });
        }
        const existing = data.bills[monthKey];
        if (existing && existing.locked) {
          return res.status(403).json({ error: 'Bill already locked. Unlock that month in Configuration → Danger Zone.' });
        }
        data.bills[monthKey] = {
          electricity: Number(electricity),
          locked: true,
          savedAt: new Date().toISOString(),
          adjustments: existing?.adjustments || {}
        };
        await writeStore(data);
        return res.status(200).json({ ok: true, data: sanitizeForClient(data) });
      }

      if (action === 'saveAdjustments') {
        requireBillManager(data, token);
        const { monthKey, adjustments } = payload || {};
        if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
          return res.status(400).json({ error: 'Invalid month' });
        }
        const existing = data.bills[monthKey];
        if (!existing || !existing.locked) {
          return res.status(400).json({ error: 'Month bill must be locked before adding adjustments' });
        }
        data.bills[monthKey] = { ...existing, adjustments: adjustments || {} };
        await writeStore(data);
        return res.status(200).json({ ok: true, data: sanitizeForClient(data) });
      }

      if (action === 'resetBillMonth') {
        requireAdmin(data, token);
        const { monthKey } = payload || {};
        if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
          return res.status(400).json({ error: 'Invalid month selected' });
        }
        if (!data.bills[monthKey]) {
          return res.status(404).json({ error: 'No locked bill found for that month' });
        }
        delete data.bills[monthKey];
        await writeStore(data);
        return res.status(200).json({ ok: true, data: sanitizeForClient(data) });
      }

      if (action === 'resetBills') {
        requireAdmin(data, token);
        data.bills = {};
        await writeStore(data);
        return res.status(200).json({ ok: true, data: sanitizeForClient(data) });
      }

      if (action === 'resetAll') {
        requireAdmin(data, token);
        await deleteStore();
        const fresh = seedDefaults(defaultState());
        await writeStore(fresh);
        return res.status(200).json({ ok: true, data: sanitizeForClient(fresh) });
      }

      if (action === 'exportBackup') {
        requireAdmin(data, token);
        return res.status(200).json({ ok: true, backup: buildBackupExport(data) });
      }

      if (action === 'saveExpenses') {
        const session = requireSession(data, token);
        const { monthKey: expenseMonthKey, memberId, items } = payload || {};
        if (!expenseMonthKey || !/^\d{4}-\d{2}$/.test(expenseMonthKey)) {
          return res.status(400).json({ error: 'Invalid month' });
        }
        if (!memberId || !data.members.some(m => m.id === memberId)) {
          return res.status(404).json({ error: 'Member not found' });
        }
        const roles = getMemberRoles(data, session.memberId);
        if (session.memberId !== memberId && !roles.isAdmin) {
          return res.status(403).json({ error: 'You can only edit your own expenses', code: 'FORBIDDEN' });
        }
        if (!data.expenses) data.expenses = {};
        if (!data.expenses[expenseMonthKey]) data.expenses[expenseMonthKey] = { items: {} };
        if (!data.expenses[expenseMonthKey].items) data.expenses[expenseMonthKey].items = {};
        data.expenses[expenseMonthKey].items[memberId] = normalizeExpenseItems(items);
        await writeStore(data);
        return res.status(200).json({ ok: true, data: sanitizeForClient(data) });
      }

      if (action === 'restoreBackup') {
        requireAdmin(data, token);
        let restored;
        try {
          restored = parseBackupPayload(payload);
        } catch (err) {
          if (err.code === 'INVALID_BACKUP') {
            return res.status(400).json({ error: err.message, code: err.code });
          }
          throw err;
        }
        seedDefaults(restored);
        await writeStore(restored);
        return res.status(200).json({ ok: true, data: sanitizeForClient(restored) });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'DELETE') {
      return res.status(405).json({ error: 'Not allowed' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    const authRes = authErrorResponse(res, err);
    if (authRes) return authRes;
    console.error(err);
    return storageErrorResponse(res, err);
  }
}
