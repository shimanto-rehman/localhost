/**
 * Local dev server — serves static files + API with file storage
 * Run: node dev-server.mjs
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  if (parvez && !data.config.rentSplit[parvez.id]) data.config.rentSplit[parvez.id] = 6500;
  if (!data.bills['2026-06']) {
    data.bills['2026-06'] = { electricity: 910, locked: true, savedAt: new Date().toISOString() };
  }
  return data;
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

function handleApi(req, res, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET' && req.url === '/api/store') {
    let data = readStore();
    if (!data) { data = seedDefaults(defaultState()); writeStore(data); }
    res.writeHead(200);
    return res.end(JSON.stringify(data));
  }

  if (req.method === 'POST' && req.url === '/api/store') {
    const { action, payload } = JSON.parse(body || '{}');
    let data = readStore() || seedDefaults(defaultState());

    if (action === 'saveConfig') {
      if (payload.config) data.config = { ...data.config, ...payload.config };
      if (payload.members) data.members = payload.members;
      writeStore(data);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data }));
    }
    if (action === 'saveBill') {
      const { monthKey, electricity } = payload || {};
      if (data.bills[monthKey]?.locked) {
        res.writeHead(403);
        return res.end(JSON.stringify({ error: 'Bill already locked. Use reset to change.' }));
      }
      data.bills[monthKey] = { electricity: Number(electricity), locked: true, savedAt: new Date().toISOString() };
      writeStore(data);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data }));
    }
    if (action === 'resetBills') {
      data.bills = {};
      writeStore(data);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data }));
    }
    if (action === 'resetAll') {
      deleteStore();
      const fresh = seedDefaults(defaultState());
      writeStore(fresh);
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, data: fresh }));
    }
    res.writeHead(400);
    return res.end(JSON.stringify({ error: 'Unknown action' }));
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
