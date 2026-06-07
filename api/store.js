import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

const STORE_KEY = 'sharespace:store';
const LOCAL_FILE = path.join(process.cwd(), 'data', 'store.json');

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
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
      rentSplit: {}
    },
    members: [
      { id: 'm1', name: 'Shimanto', photo: '' },
      { id: 'm2', name: 'Tauqir', photo: '' },
      { id: 'm3', name: 'Parvez', photo: '' }
    ],
    bills: {}
  };
}

function seedDefaults(data) {
  const parvez = data.members.find(m => m.name === 'Parvez');
  if (parvez && !data.config.rentSplit[parvez.id]) {
    data.config.rentSplit[parvez.id] = 6500;
  }
  if (!data.bills['2026-06']) {
    data.bills['2026-06'] = {
      electricity: 910,
      locked: true,
      savedAt: new Date().toISOString()
    };
  }
  return data;
}

async function readStore() {
  const redis = getRedis();
  if (redis) {
    const data = await redis.get(STORE_KEY);
    return data || null;
  }
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
  if (fs.existsSync(LOCAL_FILE)) fs.unlinkSync(LOCAL_FILE);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      let data = await readStore();
      if (!data) {
        data = seedDefaults(defaultState());
        await writeStore(data);
      }
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const incoming = req.body;
      if (!incoming || typeof incoming !== 'object') {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      await writeStore(incoming);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body || {};
      let data = (await readStore()) || seedDefaults(defaultState());

      if (action === 'saveConfig') {
        if (payload.config) data.config = { ...data.config, ...payload.config };
        if (payload.members) data.members = payload.members;
        await writeStore(data);
        return res.status(200).json({ ok: true, data });
      }

      if (action === 'saveBill') {
        const { monthKey, electricity } = payload || {};
        if (!monthKey || electricity == null || electricity <= 0) {
          return res.status(400).json({ error: 'Invalid bill data' });
        }
        const existing = data.bills[monthKey];
        if (existing && existing.locked) {
          return res.status(403).json({ error: 'Bill already locked. Use reset to change.' });
        }
        data.bills[monthKey] = {
          electricity: Number(electricity),
          locked: true,
          savedAt: new Date().toISOString()
        };
        await writeStore(data);
        return res.status(200).json({ ok: true, data });
      }

      if (action === 'resetBills') {
        data.bills = {};
        await writeStore(data);
        return res.status(200).json({ ok: true, data });
      }

      if (action === 'resetAll') {
        await deleteStore();
        const fresh = seedDefaults(defaultState());
        await writeStore(fresh);
        return res.status(200).json({ ok: true, data: fresh });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'DELETE') {
      await deleteStore();
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
