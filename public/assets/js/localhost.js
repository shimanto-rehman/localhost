/**
 * localhost — Apartment Bill Splitter
 * Server-backed persistence · Immutable monthly bills
 */

const API = '/api/store';
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const COLORS = ['#2dd4bf', '#14b8a6', '#0d9488', '#5eead4', '#2ebfa8', '#0f766e'];
const ACCENT = '#2dd4bf';
const ACCENT_2 = '#14b8a6';

let STATE = null;
let currentBillMonth = new Date();
currentBillMonth.setDate(1);
let currentExpenseMonth = new Date();
currentExpenseMonth.setDate(1);
let charts = {};
let tempMembers = [];
let newMemberPhoto = '';
let confirmCallback = null;
let AUTH = null;
let loginMemberId = null;
let loginBubbleSlots = {};
let pendingAuthCallback = null;
let syncOnline = true;

const AUTH_STORAGE_KEY = 'localhost-auth';
const EXPENSE_CATEGORIES = ['Food', 'Groceries', 'Utilities', 'Transport', 'Household', 'Entertainment', 'Other'];
const EXPENSE_CATEGORY_COLORS = {
  Food: '#f59e0b',
  Groceries: '#22c55e',
  Utilities: '#38bdf8',
  Transport: '#a78bfa',
  Household: '#fb7185',
  Entertainment: '#f472b6',
  Other: '#94a3b8'
};

function syncMetaHTML() {
  return `<div class="sidebar__meta"><span class="sync-dot${syncOnline ? '' : ' offline'}" id="syncDot" title="Server sync"></span></div>`;
}

/* ── Auth ── */
function isLoggedIn() { return !!AUTH?.token; }
function isAdmin() { return !!AUTH?.isAdmin; }
function isBillManager() { return !!AUTH?.isBillManager; }
function canEditSettings() { return isLoggedIn() && isAdmin(); }
function canEditAdjustments() { return isLoggedIn() && isBillManager(); }
function canSubmitBills() { return isLoggedIn() && (isAdmin() || isBillManager()); }
function canEditMemberExpenses(memberId) {
  return isLoggedIn() && (AUTH.memberId === memberId || isAdmin());
}

function saveAuthSession(auth) {
  AUTH = auth;
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function clearAuthSession() {
  AUTH = null;
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

function loadAuthSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) AUTH = JSON.parse(raw);
  } catch (_) {
    AUTH = null;
  }
}

function openLoginModal(onSuccess) {
  if (onSuccess) pendingAuthCallback = onSuccess;
  loginMemberId = AUTH?.memberId || STATE?.members[0]?.id || null;
  loginBubbleSlots = {};
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginModal').classList.add('open');
  renderLoginMemberGrid(true);
  setTimeout(() => document.getElementById('loginPassword').focus(), 400);
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.remove('open');
  pendingAuthCallback = null;
}

function requireAuth(options, callback) {
  const opts = typeof options === 'function' ? {} : (options || {});
  const cb = typeof options === 'function' ? options : callback;
  if (!isLoggedIn()) {
    openLoginModal(cb);
    return;
  }
  if (opts.role === 'admin' && !isAdmin()) {
    toast('Admin access required', 'error');
    return;
  }
  if (opts.role === 'billManager' && !isBillManager()) {
    toast('Bill Manager access required', 'error');
    return;
  }
  if (opts.role === 'adminOrBillManager' && !isAdmin() && !isBillManager()) {
    toast('Admin or Bill Manager access required', 'error');
    return;
  }
  cb();
}

function seededRandom(seed) {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashMemberId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return hash;
}

function placeLoginPetalSlot(m, idxOnSide, sideSign, bubbleSize, placed) {
  const rng = seededRandom(hashMemberId(m.id));
  const petalSize = bubbleSize * 0.9;
  const gap = 20;
  const minDist = petalSize + gap;
  const baseY = (bubbleSize * 1.55) / 2 + petalSize / 2 + gap + 32;

  for (let attempt = 0; attempt < 32; attempt++) {
    const xBase = 66 + idxOnSide * (petalSize + gap * 0.75);
    const yBase = baseY + idxOnSide * (petalSize * 0.55 + gap * 0.4);
    const x = sideSign * (xBase + (rng() - 0.5) * 10);
    const y = yBase + (rng() - 0.5) * 12 + attempt * 5;
    const overlaps = placed.some(p => Math.hypot(p.x - x, p.y - y) < minDist);
    if (!overlaps) {
      const pos = { x, y, petalAngle: '0', radius: Math.hypot(x, y) };
      placed.push(pos);
      return pos;
    }
  }

  const fallback = {
    x: sideSign * (78 + idxOnSide * 56),
    y: baseY + idxOnSide * (petalSize + 14),
    petalAngle: '0',
    radius: 0
  };
  placed.push(fallback);
  return fallback;
}

function ensureLoginBubbleSlots(members, selectedId, bubbleSize) {
  const others = members.filter(m => m.id !== selectedId);
  const count = others.length;

  Object.keys(loginBubbleSlots).forEach(id => {
    if (id === selectedId || !others.some(m => m.id === id)) delete loginBubbleSlots[id];
  });

  if (!count) return;

  const placed = [];
  const mid = Math.ceil(count / 2);
  const leftMembers = others.slice(0, mid);
  const rightMembers = others.slice(mid);

  leftMembers.forEach((m, idx) => {
    loginBubbleSlots[m.id] = placeLoginPetalSlot(m, idx, -1, bubbleSize, placed);
  });
  rightMembers.forEach((m, idx) => {
    loginBubbleSlots[m.id] = placeLoginPetalSlot(m, idx, 1, bubbleSize, placed);
  });
}

function computeLoginFieldBounds(items, bubbleSize) {
  let extentX = 0;
  let extentTop = 0;
  let extentBottom = 0;
  const tooltipPad = 46;
  items.forEach(item => {
    const half = (bubbleSize * item.scale) / 2 + 14;
    extentX = Math.max(extentX, Math.abs(item.x) + half);
    if (item.y < 0) {
      extentTop = Math.max(extentTop, -item.y + half + 12);
    } else {
      extentBottom = Math.max(extentBottom, item.y + half + 12);
    }
    if (!item.isSelected) extentTop = Math.max(extentTop, tooltipPad);
  });
  const minW = bubbleSize * 2.8;
  const minH = bubbleSize * 2.4;
  return {
    width: Math.ceil(Math.max(minW, extentX * 2 + 40)),
    height: Math.ceil(Math.max(minH, extentTop + extentBottom + 36))
  };
}

function buildLoginBubbleLayout(members, selectedId) {
  const n = members.length;
  const bubbleSize = n <= 2 ? 60 : n <= 4 ? 54 : n <= 7 ? 48 : n <= 10 ? 44 : 40;
  const selected = members.find(m => m.id === selectedId) || members[0];
  ensureLoginBubbleSlots(members, selected.id, bubbleSize);

  const items = members.map((member, idx) => {
    const isSelected = member.id === selected.id;
    if (isSelected) {
      return {
        member,
        idx,
        x: 0,
        y: -18,
        scale: 1.55,
        isSelected: true,
        petalAngle: '0',
        radius: 0,
        z: 10
      };
    }
    let slot = loginBubbleSlots[member.id];
    if (!slot) {
      ensureLoginBubbleSlots(members, selected.id, bubbleSize);
      slot = loginBubbleSlots[member.id];
    }
    if (!slot) {
      return {
        member,
        idx,
        x: 0,
        y: 80,
        scale: 0.85,
        isSelected: false,
        petalAngle: '0',
        radius: 80,
        z: 2 + idx
      };
    }
    return {
      member,
      idx,
      x: slot.x,
      y: slot.y,
      scale: Math.max(0.78, 0.92 - (slot.radius / 320) * 0.12),
      isSelected: false,
      petalAngle: slot.petalAngle,
      radius: slot.radius,
      z: 2 + idx
    };
  });

  return { items, bubbleSize };
}

function loginBubbleAvatarHTML(member, idx) {
  const grad = `linear-gradient(135deg, ${memberColor(idx)}, ${memberColor(idx)}99)`;
  if (member.photo) {
    return `<img src="${member.photo}" alt="" class="login-bubble__photo"/>`;
  }
  return `<span class="login-bubble__initials" style="background:${grad}">${initials(member.name)}</span>`;
}

function updateLoginSelectedLabel() {
  const el = document.getElementById('loginSelectedName');
  if (!el || !STATE) return;
  const member = STATE.members.find(m => m.id === loginMemberId);
  el.textContent = member ? member.name : '';
}

function loginBubbleMarkup(item, i) {
  return `
    <button
      type="button"
      class="login-bubble${item.isSelected ? ' selected' : ''}"
      style="--bx:${item.x}px; --by:${item.y}px; --scale:${item.scale}; --i:${i}; --z:${item.z ?? (item.isSelected ? 10 : 2 + i)}; --clr:${memberColor(item.idx)}; --petal-angle:${item.petalAngle}deg; --radius:${item.radius}px"
      data-id="${item.member.id}"
      role="option"
      aria-selected="${item.isSelected}"
      aria-label="Sign in as ${escapeHtml(item.member.name)}"
    >
      <span class="login-bubble__tooltip" role="tooltip">${escapeHtml(item.member.name)}</span>
      <span class="login-bubble__inner">
        <span class="login-bubble__ring">
          ${loginBubbleAvatarHTML(item.member, item.idx)}
        </span>
      </span>
    </button>`;
}

function applyLoginFieldSize(grid, layout) {
  const bounds = computeLoginFieldBounds(layout.items, layout.bubbleSize);
  grid.style.width = `${bounds.width}px`;
  grid.style.height = `${bounds.height}px`;
  grid.style.setProperty('--bubble-size', `${layout.bubbleSize}px`);
}

function applyLoginBubbleStyles(el, item, i) {
  el.classList.toggle('selected', item.isSelected);
  el.setAttribute('aria-selected', item.isSelected);
  el.style.setProperty('--bx', `${item.x}px`);
  el.style.setProperty('--by', `${item.y}px`);
  el.style.setProperty('--scale', item.scale);
  el.style.setProperty('--i', i);
  el.style.setProperty('--petal-angle', `${item.petalAngle}deg`);
  el.style.setProperty('--radius', `${item.radius}px`);
  el.style.setProperty('--z', item.z ?? (item.isSelected ? 10 : 2 + i));
}

function bindLoginBubbleEvents(grid) {
  grid.querySelectorAll('.login-bubble').forEach(el => {
    el.onclick = () => {
      if (loginMemberId === el.dataset.id) return;
      loginMemberId = el.dataset.id;
      renderLoginMemberGrid(false);
    };
  });
}

function morphLoginBubbles(grid, layout) {
  const fan = grid.querySelector('.login-bubble-fan');
  if (!fan) return false;

  layout.items.forEach((item, i) => {
    let el = grid.querySelector(`.login-bubble[data-id="${item.member.id}"]`);
    if (!el) return;
    if (item.isSelected) {
      if (el.parentElement === fan) grid.appendChild(el);
    } else if (el.parentElement === grid) {
      fan.appendChild(el);
    }
    applyLoginBubbleStyles(el, item, i);
  });

  applyLoginFieldSize(grid, layout);
  updateLoginSelectedLabel();
  grid.classList.remove('login-bubble-field--shift');
  void grid.offsetWidth;
  grid.classList.add('login-bubble-field--shift');
  setTimeout(() => grid.classList.remove('login-bubble-field--shift'), 800);
  return true;
}

function renderLoginMemberGrid(animate = false) {
  const grid = document.getElementById('loginMemberGrid');
  if (!grid || !STATE?.members?.length) return;

  const layout = buildLoginBubbleLayout(STATE.members, loginMemberId);
  const selected = layout.items.find(i => i.isSelected);
  const petals = layout.items.filter(i => !i.isSelected);

  grid.classList.remove('login-bubble-field--animate');

  if (!animate && morphLoginBubbles(grid, layout)) return;

  grid.innerHTML = `
    <div class="login-bubble-fan" id="loginBubbleFan">
      ${petals.map((item, i) => loginBubbleMarkup(item, i)).join('')}
    </div>
    ${selected ? loginBubbleMarkup(selected, petals.length) : ''}`;

  applyLoginFieldSize(grid, layout);
  updateLoginSelectedLabel();
  bindLoginBubbleEvents(grid);

  if (animate) {
    void grid.offsetWidth;
    grid.classList.add('login-bubble-field--animate');
  }
}

function renderSidebarUser() {
  const el = document.getElementById('sidebarUser');
  if (!el) return;

  if (!isLoggedIn()) {
    el.innerHTML = `
      <button type="button" class="sidebar-user__btn" id="sidebarLoginBtn">
        <div class="sidebar-user__avatar" style="background:var(--bg-card);color:var(--text-dim)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div class="sidebar-user__info">
          <div class="sidebar-user__meta-row">
            ${syncMetaHTML()}
            <span class="sidebar-user__signin-label">Sign in to edit</span>
          </div>
        </div>
      </button>`;
    document.getElementById('sidebarLoginBtn').onclick = () => openLoginModal();
    return;
  }

  const roles = [];
  if (AUTH.isAdmin) roles.push('Admin');
  if (AUTH.isBillManager) roles.push('Bill Manager');
  const idx = STATE.members.findIndex(m => m.id === AUTH.memberId);

  el.innerHTML = `
    <div class="sidebar-user__btn sidebar-user__btn--logged">
      ${avatarHTML({ photo: AUTH.photo, name: AUTH.name }, idx >= 0 ? idx : 0)}
      <div class="sidebar-user__info">
        <div class="sidebar-user__name">${escapeHtml(AUTH.name)}</div>
        <div class="sidebar-user__meta-row">
          ${syncMetaHTML()}
          <div class="sidebar-user__role">${roles.length ? roles.join(' · ') : 'Member'}</div>
        </div>
      </div>
    </div>
    <button type="button" class="sidebar-user__logout" id="sidebarLogoutBtn">Sign out</button>`;

  document.getElementById('sidebarLogoutBtn').onclick = async () => {
    try {
      if (AUTH?.token) await apiPost('logout', {});
    } catch (_) {}
    clearAuthSession();
    renderSidebarUser();
    applySettingsReadonly();
    const page = getPageFromHash();
    if (page === 'bills') updateMonthDisplay();
    if (page === 'settings') renderSettings();
    toast('Signed out');
  };
}

/* ── API ── */
async function parseApiResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || 'Request failed';
    if (data.code === 'AUTH_REQUIRED' || data.code === 'AUTH_FAILED') {
      clearAuthSession();
      renderSidebarUser();
      const err = new Error(msg);
      err.code = data.code;
      throw err;
    }
    if (data.code === 'STORAGE_NOT_CONFIGURED' || /read-only file system|EROFS/i.test(msg)) {
      throw new Error('Server storage is not set up. In Vercel → Storage → add Upstash Redis, then redeploy.');
    }
    throw new Error(msg);
  }
  return data;
}

async function apiPost(action, payload = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      payload: { ...payload, token: AUTH?.token || null }
    })
  });
  return parseApiResponse(res);
}

async function apiGet() {
  const res = await fetch(API);
  return parseApiResponse(res);
}

async function apiLogin(memberId, password) {
  const data = await apiPost('login', { memberId, password });
  return data.auth;
}

async function apiVerifySession() {
  if (!AUTH?.token) return null;
  try {
    const data = await apiPost('verifySession', {});
    return data.auth;
  } catch (_) {
    clearAuthSession();
    return null;
  }
}

async function apiSaveConfig(config, members) {
  const data = await apiPost('saveConfig', { config, members });
  return data.data;
}

async function apiSaveBill(monthKey, electricity) {
  const data = await apiPost('saveBill', { monthKey, electricity });
  return data.data;
}

async function apiResetBills() {
  const data = await apiPost('resetBills', {});
  return data.data;
}

async function apiResetBillMonth(monthKey) {
  const data = await apiPost('resetBillMonth', { monthKey });
  return data.data;
}

async function apiResetAll() {
  const data = await apiPost('resetAll', {});
  return data.data;
}

async function apiSaveAdjustments(monthKey, adjustments) {
  const data = await apiPost('saveAdjustments', { monthKey, adjustments });
  return data.data;
}

async function apiSaveExpenses(monthKey, memberId, items) {
  const data = await apiPost('saveExpenses', { monthKey, memberId, items });
  return data.data;
}

async function apiResetPassword(targetMemberId, newPassword) {
  await apiPost('resetPassword', { targetMemberId, newPassword });
}

async function apiExportBackup() {
  const data = await apiPost('exportBackup', {});
  return data.backup;
}

async function apiRestoreBackup(backup) {
  const data = await apiPost('restoreBackup', { backup });
  return data.data;
}

function downloadBackupFile(backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `localhost-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (_) {
        reject(new Error('Could not read backup file — invalid JSON'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read backup file'));
    reader.readAsText(file);
  });
}

/* ── Helpers ── */
function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(d) {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function fmt(n) {
  return '৳' + Number(n).toLocaleString('en-BD');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAdjItemsHTML(adjustments, memberId, canEdit = false) {
  if (!adjustments.length) {
    return `<div class="adj-empty">No adjustments yet</div>`;
  }
  return adjustments.map(a => `
    <div class="adj-item" data-id="${a.id}">
      <div class="adj-item__info">
        <span class="adj-item__type adj-item__type--${a.type}">${a.type === 'lend' ? 'Lent' : 'Borrowed'}</span>
        <span class="adj-item__label" title="${escapeHtml(a.label)}">${escapeHtml(a.label)}</span>
      </div>
      <div class="adj-item__right">
        <span class="adj-item__amount adj-item__amount--${a.type}">${a.type === 'lend' ? '+' : '−'}${fmt(a.amount).slice(1)}</span>
        ${canEdit ? `
        <button class="adj-item__remove" data-member="${memberId}" data-id="${a.id}" type="button" title="Delete" aria-label="Delete adjustment">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>` : ''}
      </div>
    </div>
  `).join('');
}

function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function memberColor(i) {
  return COLORS[i % COLORS.length];
}

function avatarHTML(member, idx, size = '') {
  const cls = `avatar${size ? ' avatar--' + size : ''}`;
  const grad = `linear-gradient(135deg, ${memberColor(idx)}, ${memberColor(idx)}99)`;
  if (member.photo) {
    return `<div class="${cls}"><img src="${member.photo}" alt="${member.name}"/></div>`;
  }
  return `<div class="${cls}" style="background:${grad}">${initials(member.name)}</div>`;
}

const BILL_LABELS = {
  fixedBucket: '🏠 Rent + Gas + Water + Service',
  electricity: '⚡ Electricity',
  maid: '🧹 House Maid',
  wifi: '📶 WiFi'
};

function ceilPerHead(total, n) {
  return n > 0 ? Math.ceil(total / n) : 0;
}

const CHART_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
let chartJsPromise = null;

function ensureChartJs() {
  if (typeof Chart !== 'undefined') return Promise.resolve();
  if (chartJsPromise) return chartJsPromise;

  chartJsPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (typeof Chart !== 'undefined') resolve();
      else reject(new Error('Chart.js unavailable'));
    };

    const existing = document.querySelector('script[src*="chart.umd"]');
    if (existing) {
      if (existing.dataset.loaded === '1') return finish();
      existing.addEventListener('load', () => { existing.dataset.loaded = '1'; finish(); }, { once: true });
      existing.addEventListener('error', () => reject(new Error('Chart.js failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = CHART_JS_URL;
    script.onload = () => { script.dataset.loaded = '1'; finish(); };
    script.onerror = () => reject(new Error('Chart.js failed to load'));
    document.head.appendChild(script);
  }).catch(err => {
    chartJsPromise = null;
    throw err;
  });

  return chartJsPromise;
}

function initTheme() {
  const saved = localStorage.getItem('localhost-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const next = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('localhost-theme', next);
  if (document.getElementById('page-dashboard').classList.contains('active')) {
    renderCharts().catch(err => console.error(err));
  }
}

function chartTheme() {
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  return {
    grid: light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
    tick: light ? '#656d76' : '#8b949e',
    tooltipBg: light ? '#ffffff' : '#1c2128',
    tooltipTitle: light ? '#1f2328' : '#e6edf3',
    tooltipBody: light ? '#656d76' : '#8b949e',
    legendPos: window.innerWidth < 768 ? 'bottom' : 'right'
  };
}

function resizeCharts() {
  Object.values(charts).forEach(c => { if (c) c.resize(); });
}

let chartResizeObserver = null;
let lastLayoutBucket = null;

function getLayoutBucket() {
  const w = window.innerWidth;
  if (w < 640) return 'sm';
  if (w < 768) return 'md';
  return 'lg';
}

function updateChartLegendPositions() {
  const ct = chartTheme();
  if (charts.category?.options?.plugins?.legend) {
    charts.category.options.plugins.legend.position = ct.legendPos;
    charts.category.update('none');
  }
  if (charts.compare?.options?.plugins?.legend) {
    charts.compare.options.plugins.legend.position = window.innerWidth < 640 ? 'bottom' : 'top';
    charts.compare.update('none');
  }
}

function setupChartResizeObserver() {
  if (chartResizeObserver) chartResizeObserver.disconnect();
  chartResizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(resizeCharts);
  });
  document.querySelectorAll('.chart-box').forEach(box => chartResizeObserver.observe(box));
}

function toast(msg, type = 'success') {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast__dot"></span><span>${msg}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

function populateResetMonthPickers() {
  const monthSel = document.getElementById('resetMonthSelect');
  const yearSel = document.getElementById('resetYearSelect');
  if (!monthSel || !yearSel) return;

  const now = new Date();
  if (!monthSel.options.length) {
    monthSel.innerHTML = MONTH_NAMES.map((name, i) =>
      `<option value="${String(i + 1).padStart(2, '0')}"${i === now.getMonth() ? ' selected' : ''}>${name}</option>`
    ).join('');
  }
  if (!yearSel.options.length) {
    const start = now.getFullYear() - 2;
    const end = now.getFullYear() + 2;
    yearSel.innerHTML = Array.from({ length: end - start + 1 }, (_, i) => {
      const y = start + i;
      return `<option value="${y}"${y === now.getFullYear() ? ' selected' : ''}>${y}</option>`;
    }).join('');
  }
}

function confirmDialog(title, desc, cb) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmDesc').textContent = desc;
  confirmCallback = cb;
  document.getElementById('confirmModal').classList.add('open');
}

function getBillManager() {
  const id = STATE.config.billManagerId;
  if (id) {
    const m = STATE.members.find(x => x.id === id);
    if (m) return m;
  }
  return STATE.members[0] || null;
}

function getMonthAdjustments(monthKey) {
  const bd = STATE.bills[monthKey] || {};
  return bd.adjustments || {};
}

function calcAdjustmentDelta(adjustments) {
  if (!adjustments || !adjustments.length) return 0;
  return adjustments.reduce((sum, a) => {
    const amt = Number(a.amount) || 0;
    return sum + (a.type === 'lend' ? amt : -amt);
  }, 0);
}

function enrichCalcWithAdjustments(calc, monthKey) {
  const allAdj = getMonthAdjustments(monthKey);
  const results = calc.results.map(r => {
    const adjustments = allAdj[r.id] || [];
    const adjDelta = calcAdjustmentDelta(adjustments);
    const baseTotal = r.total;
    const adjustedTotal = Math.max(0, baseTotal + adjDelta);
    return { ...r, baseTotal, adjustments, adjDelta, total: adjustedTotal };
  });
  return { ...calc, results };
}

/* ── Calculation Engine ── */
function calcBill(monthDate) {
  const key = monthKey(monthDate);
  const billData = STATE.bills[key] || {};
  const electricity = billData.electricity ?? null;
  const cfg = STATE.config.fixedCosts;
  const members = STATE.members;
  const n = members.length;
  if (n === 0 || electricity === null) return null;

  const rent = cfg.rent || 0;
  const gas = cfg.gas || 0;
  const water = cfg.water || 0;
  const service = cfg.service || 0;
  const maid = cfg.maid || 0;
  const wifi = cfg.wifi || 0;

  // Rent + Gas + Water + Service = one fixed bucket (excludes electricity)
  const fixedBucket = rent + gas + water + service;
  const rentSplit = STATE.config.rentSplit || {};

  let fixedContributions = 0;
  const freeMembers = [];

  members.forEach(m => {
    const fixed = rentSplit[m.id];
    if (fixed !== undefined && fixed !== null && fixed !== '') {
      fixedContributions += Number(fixed);
    } else {
      freeMembers.push(m.id);
    }
  });

  const remainingBucket = Math.max(0, fixedBucket - fixedContributions);
  const freeBucketShare = freeMembers.length > 0 ? Math.round(remainingBucket / freeMembers.length) : 0;

  const elecPH = ceilPerHead(electricity, n);
  const maidPH = ceilPerHead(maid, n);
  const wifiPH = ceilPerHead(wifi, n);

  const results = members.map(m => {
    const hasFixed = rentSplit[m.id] !== undefined && rentSplit[m.id] !== null && rentSplit[m.id] !== '';
    const fixedBucketShare = hasFixed ? Number(rentSplit[m.id]) : freeBucketShare;

    const breakdown = {
      fixedBucket: fixedBucketShare,
      electricity: elecPH,
      maid: maidPH,
      wifi: wifiPH
    };

    const total = fixedBucketShare + elecPH + maidPH + wifiPH;

    return { id: m.id, name: m.name, photo: m.photo, total, breakdown };
  });

  const collectedTotal = results.reduce((s, r) => s + r.total, 0);
  const actualBill = fixedBucket + electricity + maid + wifi;
  const houseRentTotal = fixedBucket + electricity;
  const gap = collectedTotal - actualBill;

  return {
    results,
    collectedTotal,
    actualBill,
    houseRentTotal,
    gap,
    electricity,
    fixedBucket,
    elecPH,
    maidPH,
    wifiPH,
    cfg
  };
}

/* ── Expense Engine ── */
function getFirstExpenseMonthKey() {
  const keys = Object.keys(STATE.expenses || {}).filter(k => /^\d{4}-\d{2}$/.test(k)).sort();
  return keys[0] || null;
}

function computeExpenseCarryIn(monthDate, cache = {}) {
  const key = monthKey(monthDate);
  if (cache[key]) return cache[key];

  const carry = {};
  STATE.members.forEach(m => { carry[m.id] = 0; });

  const firstKey = getFirstExpenseMonthKey();
  if (!firstKey || key === firstKey) {
    cache[key] = carry;
    return carry;
  }

  const prev = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
  const prevKey = monthKey(prev);
  if (prevKey < firstKey) {
    cache[key] = carry;
    return carry;
  }

  const prevCarryIn = computeExpenseCarryIn(prev, cache);
  const prevCalc = calcExpenseMonth(prev, prevCarryIn);
  prevCalc.results.forEach(r => { carry[r.id] = r.forwardOut; });
  cache[key] = carry;
  return carry;
}

function calcExpenseMonth(monthDate, carryIn = null) {
  const key = monthKey(monthDate);
  const monthData = STATE.expenses?.[key] || {};
  const itemsByMember = monthData.items || {};
  const resolvedCarryIn = carryIn || computeExpenseCarryIn(monthDate);

  const results = STATE.members.map(m => {
    const items = itemsByMember[m.id] || [];
    const monthSpend = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const carried = resolvedCarryIn[m.id] || 0;
    const grandTotal = monthSpend + carried;
    const categories = {};
    items.forEach(item => {
      const cat = item.category || 'Other';
      categories[cat] = (categories[cat] || 0) + (Number(item.price) || 0);
    });
    return {
      id: m.id,
      name: m.name,
      photo: m.photo,
      items,
      monthSpend,
      carried,
      grandTotal,
      categories
    };
  });

  const base = results.length ? Math.min(...results.map(r => r.grandTotal)) : 0;
  const baseMembers = results.filter(r => r.grandTotal === base);

  results.forEach(r => {
    r.base = base;
    r.extra = Math.max(0, r.grandTotal - base);
    r.forwardOut = r.extra;
    r.isBase = r.grandTotal === base;
  });

  const totalMonthSpend = results.reduce((s, r) => s + r.monthSpend, 0);
  const totalExtra = results.reduce((s, r) => s + r.extra, 0);
  const totalForward = results.reduce((s, r) => s + r.forwardOut, 0);

  return {
    key,
    results,
    base,
    baseMembers,
    carryIn: resolvedCarryIn,
    totalMonthSpend,
    totalExtra,
    totalForward
  };
}

function getYearExpenseData() {
  const year = new Date().getFullYear();
  const months = [];
  const memberMonthly = STATE.members.map(() => []);

  for (let mo = 0; mo < 12; mo++) {
    months.push(MONTH_NAMES[mo].slice(0, 3));
    const d = new Date(year, mo, 1);
    const calc = calcExpenseMonth(d);
    STATE.members.forEach((m, i) => {
      const r = calc.results.find(x => x.id === m.id);
      memberMonthly[i].push(r ? r.monthSpend : 0);
    });
  }

  return { months, memberMonthly };
}

function expenseCategoryColor(category) {
  return EXPENSE_CATEGORY_COLORS[category] || EXPENSE_CATEGORY_COLORS.Other;
}

function getYearData() {
  const year = new Date().getFullYear();
  const months = [];
  const totals = [];
  const billTotals = [];
  const expenseTotals = [];
  const actualTotals = [];
  const elecs = [];
  const gaps = [];
  const memberTotals = {};
  const categoryTotals = { rent: 0, gas: 0, water: 0, service: 0, electricity: 0, maid: 0, wifi: 0 };

  STATE.members.forEach(m => { memberTotals[m.id] = 0; });

  for (let mo = 0; mo < 12; mo++) {
    months.push(MONTH_NAMES[mo].slice(0, 3));
    const d = new Date(year, mo, 1);
    const key = monthKey(d);
    const bd = STATE.bills[key];
    let monthBillTotal = 0;

    if (bd && bd.electricity != null && bd.locked) {
      const c = calcBill(d);
      if (c) {
        monthBillTotal = c.collectedTotal;
        actualTotals.push(c.actualBill);
        elecs.push(bd.electricity);
        gaps.push(c.gap);
        c.results.forEach(r => { memberTotals[r.id] = (memberTotals[r.id] || 0) + r.total; });
        const cfg = c.cfg;
        categoryTotals.rent += cfg.rent || 0;
        categoryTotals.gas += cfg.gas || 0;
        categoryTotals.water += cfg.water || 0;
        categoryTotals.service += cfg.service || 0;
        categoryTotals.electricity += bd.electricity;
        categoryTotals.maid += cfg.maid || 0;
        categoryTotals.wifi += cfg.wifi || 0;
      } else {
        actualTotals.push(0);
        elecs.push(0);
        gaps.push(0);
      }
    } else {
      actualTotals.push(0);
      elecs.push(0);
      gaps.push(0);
    }

    const monthExpenseTotal = calcExpenseMonth(d).totalMonthSpend;
    billTotals.push(monthBillTotal);
    expenseTotals.push(monthExpenseTotal);
    totals.push(monthBillTotal + monthExpenseTotal);
  }

  return {
    months, totals, billTotals, expenseTotals, actualTotals, elecs, gaps,
    memberTotals, categoryTotals, yearGap: gaps.reduce((s, g) => s + g, 0)
  };
}

/* ── Navigation ── */
const VALID_PAGES = ['dashboard', 'bills', 'expenses', 'settings'];

function getPageFromHash() {
  const hash = (location.hash || '').replace(/^#/, '');
  return VALID_PAGES.includes(hash) ? hash : 'dashboard';
}

function syncPageHash(page) {
  const base = location.pathname + location.search;
  const target = page === 'dashboard' ? base : `${base}#${page}`;
  const current = location.pathname + location.search + location.hash;
  if (current !== target) history.replaceState(null, '', target);
}

function navigate(page, options = {}) {
  if (!VALID_PAGES.includes(page)) page = 'dashboard';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link, .bottom-nav__btn').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll(`[data-page="${page}"]`).forEach(n => n.classList.add('active'));

  const titles = { dashboard: 'Dashboard', bills: 'Monthly Bills', expenses: 'Expenses', settings: 'Configuration' };
  document.getElementById('topbarTitle').textContent = titles[page] || page;

  closeSidebar();

  if (!options.skipHash) syncPageHash(page);

  if (page === 'dashboard') renderDashboard().catch(err => console.error(err));
  if (page === 'bills') renderBillsPage();
  if (page === 'expenses') renderExpensesPage();
  if (page === 'settings') renderSettings();
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('open');
  document.body.classList.remove('sidebar-open');
}

function renderTopbar() {
  document.getElementById('topbarSub').textContent = STATE.config.aptName || '';
  document.getElementById('aptBadge').textContent = STATE.config.aptFloor || '';

  const stack = document.getElementById('avatarStack');
  stack.innerHTML = STATE.members.slice(0, 5).map((m, i) =>
    `<div class="avatar-stack__item" style="z-index:${10 - i};background:linear-gradient(135deg,${memberColor(i)},${memberColor(i)}99)">
      ${m.photo ? `<img src="${m.photo}" alt="${m.name}"/>` : initials(m.name)}
    </div>`
  ).join('');
}

/* ── Dashboard ── */
function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}

async function renderDashboard() {
  renderTopbar();
  renderStats();
  renderDashboardMembers();
  await renderCharts();
}

function renderStats() {
  const grid = document.getElementById('statsRow');
  const cfg = STATE.config.fixedCosts;
  const totalFixed = (cfg.rent || 0) + (cfg.gas || 0) + (cfg.water || 0) + (cfg.service || 0) + (cfg.maid || 0) + (cfg.wifi || 0);
  const year = new Date().getFullYear();
  let yearCollected = 0;
  let yearActual = 0;
  let yearGap = 0;
  let billCount = 0;

  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1);
    const bd = STATE.bills[monthKey(d)];
    if (bd && bd.locked && bd.electricity != null) {
      const c = calcBill(d);
      if (c) {
        yearCollected += c.collectedTotal;
        yearActual += c.actualBill;
        yearGap += c.gap;
        billCount++;
      }
    }
  }

  const stats = [
    { label: 'Fixed Bucket / Month', value: fmt(totalFixed), sub: 'Rent + Gas + Water + Service' },
    { label: 'Active Members', value: STATE.members.length, sub: 'Flatmates registered' },
    { label: 'Bills This Year', value: billCount, sub: `${year} · ${billCount} months logged` },
    { label: 'Year Gap (Ceiling)', value: fmt(yearGap), sub: `Collected ${fmt(yearCollected)} vs bill ${fmt(yearActual)}` }
  ];

  grid.innerHTML = stats.map((s, i) => `
    <div class="stat-card" style="animation-delay:${i * 0.08}s">
      <div class="stat-card__label">${s.label}</div>
      <div class="stat-card__value">${s.value}</div>
      <div class="stat-card__sub">${s.sub}</div>
    </div>
  `).join('');
}

function renderDashboardMembers() {
  const grid = document.getElementById('memberBillsGrid');
  const now = new Date();
  now.setDate(1);
  const key = monthKey(now);
  const calcRaw = calcBill(now);
  const bd = STATE.bills[key];

  document.getElementById('currentMonthChip').textContent = monthLabel(now);

  if (!bd || !bd.locked || bd.electricity == null) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
      <h3>No bill for ${monthLabel(now)}</h3>
      <p>Enter the electricity bill under <strong>Monthly Bills</strong> to unlock calculations.</p>
    </div>`;
    return;
  }

  if (!calcRaw || !calcRaw.results.length) {
    grid.innerHTML = `<div class="empty"><h3>Add members in Configuration</h3></div>`;
    return;
  }

  const calc = enrichCalcWithAdjustments(calcRaw, key);
  const manager = getBillManager();
  const adjustedCollected = calc.results.reduce((s, r) => s + r.total, 0);

  grid.innerHTML = calc.results.map((r, i) => {
    const pct = Math.round(r.total / adjustedCollected * 100);
    return `
      <div class="member-card" style="animation-delay:${i * 0.1}s">
        <div class="member-card__head">
          ${avatarHTML({ photo: r.photo, name: r.name }, i, 'lg')}
          <div>
            <div class="member-card__name">${r.name}${manager && r.id === manager.id ? ' <span class="manager-badge">Bill Manager</span>' : ''}</div>
            <div class="member-card__total">${fmt(r.total)} <small>/ month</small></div>
            <span class="chip chip--accent" style="margin-top:8px">${pct}% share</span>
          </div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        ${Object.entries(r.breakdown).map(([k, v]) => `
          <div class="bill-row">
            <span class="bill-row__label">${BILL_LABELS[k] || k}</span>
            <span class="bill-row__value">${fmt(v)}</span>
          </div>
        `).join('')}
        ${r.adjustments.map(a => `
          <div class="bill-row bill-row--adj">
            <span class="bill-row__label">${a.type === 'lend' ? 'Lent' : 'Borrowed'} · ${escapeHtml(a.label)}</span>
            <span class="bill-row__value bill-row__value--${a.type === 'lend' ? 'lend' : 'borrow'}">${a.type === 'lend' ? '+' : '−'}${fmt(a.amount).slice(1)}</span>
          </div>
        `).join('')}
      </div>`;
  }).join('');
}

async function renderCharts() {
  await ensureChartJs();

  const yd = getYearData();
  const cfg = STATE.config.fixedCosts;
  const ct = chartTheme();

  document.getElementById('yearGapTotal').textContent = fmt(yd.yearGap);

  const defaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: ct.tooltipBg,
        titleColor: ct.tooltipTitle,
        bodyColor: ct.tooltipBody,
        borderColor: ct.grid,
        borderWidth: 1,
        cornerRadius: 10,
        padding: 12
      }
    }
  };

  // 1. Monthly collected total
  destroyChart('monthly');
  const ctx1 = document.getElementById('chartMonthly').getContext('2d');
  const g1 = ctx1.createLinearGradient(0, 0, 0, 240);
  g1.addColorStop(0, 'rgba(45, 212, 191, 0.35)');
  g1.addColorStop(1, 'rgba(45, 212, 191, 0.02)');
  charts.monthly = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: yd.months,
      datasets: [{
        label: 'Bills + Expenses',
        data: yd.totals,
        borderColor: ACCENT,
        backgroundColor: g1,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: ACCENT,
        pointRadius: 4,
        borderWidth: 2.5
      }]
    },
    options: {
      ...defaults,
      plugins: {
        ...defaults.plugins,
        tooltip: {
          ...defaults.plugins.tooltip,
          callbacks: {
            label: ctx => {
              const i = ctx.dataIndex;
              const bills = yd.billTotals[i] || 0;
              const expenses = yd.expenseTotals[i] || 0;
              return [
                ` Total: ৳${ctx.raw.toLocaleString()}`,
                ` Bills: ৳${bills.toLocaleString()}`,
                ` Expenses: ৳${expenses.toLocaleString()}`
              ];
            }
          }
        }
      },
      scales: {
        x: { grid: { color: ct.grid }, ticks: { color: ct.tick, font: { size: 11 } } },
        y: { grid: { color: ct.grid }, ticks: { color: ct.tick, font: { size: 11 }, callback: v => '৳' + v.toLocaleString() } }
      }
    }
  });

  // 2. Per-person yearly bar
  destroyChart('person');
  const ctx2 = document.getElementById('chartPerson').getContext('2d');
  charts.person = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: STATE.members.map(m => m.name),
      datasets: [{
        data: STATE.members.map(m => yd.memberTotals[m.id] || 0),
        backgroundColor: STATE.members.map((_, i) => memberColor(i) + 'cc'),
        borderColor: STATE.members.map((_, i) => memberColor(i)),
        borderWidth: 1,
        borderRadius: 10
      }]
    },
    options: {
      ...defaults,
      scales: {
        x: { grid: { display: false }, ticks: { color: ct.tick } },
        y: { grid: { color: ct.grid }, ticks: { color: ct.tick, callback: v => '৳' + v.toLocaleString() } }
      }
    }
  });

  // 3. Category doughnut
  destroyChart('category');
  const ctx3 = document.getElementById('chartCategory').getContext('2d');
  const catLabels = ['Rent', 'Gas', 'Water', 'Service', 'Electricity', 'Maid', 'WiFi'];
  const catData = [cfg.rent, cfg.gas, cfg.water, cfg.service, 910, cfg.maid, cfg.wifi].map((v, i) => {
    const keys = ['rent', 'gas', 'water', 'service', 'electricity', 'maid', 'wifi'];
    return yd.categoryTotals[keys[i]] || v;
  });

  charts.category = new Chart(ctx3, {
    type: 'doughnut',
    data: {
      labels: catLabels,
      datasets: [{
        data: catData,
        backgroundColor: ['#2dd4bfcc', '#14b8a6cc', '#0d9488cc', '#5eead4cc', '#38bdf8cc', '#a78bfacc', '#fb7185cc'],
        borderColor: ['#2dd4bf', '#14b8a6', '#0d9488', '#5eead4', '#38bdf8', '#a78bfa', '#fb7185'],
        borderWidth: 1
      }]
    },
    options: {
      ...defaults,
      cutout: '62%',
      plugins: {
        ...defaults.plugins,
        legend: { display: true, position: ct.legendPos, labels: { color: ct.tick, font: { size: 11 }, boxWidth: 12, padding: ct.legendPos === 'bottom' ? 8 : 12 } }
      }
    }
  });

  // 4. Electricity trend
  destroyChart('elec');
  const ctx4 = document.getElementById('chartElec').getContext('2d');
  const g4 = ctx4.createLinearGradient(0, 0, 0, 240);
  g4.addColorStop(0, 'rgba(94, 234, 212, 0.3)');
  g4.addColorStop(1, 'rgba(94, 234, 212, 0.02)');
  charts.elec = new Chart(ctx4, {
    type: 'line',
    data: {
      labels: yd.months,
      datasets: [{
        data: yd.elecs,
        borderColor: '#5eead4',
        backgroundColor: g4,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#5eead4',
        pointRadius: 4,
        borderWidth: 2.5
      }]
    },
    options: {
      ...defaults,
      scales: {
        x: { grid: { color: ct.grid }, ticks: { color: ct.tick, font: { size: 11 } } },
        y: { grid: { color: ct.grid }, ticks: { color: ct.tick, callback: v => '৳' + v.toLocaleString() } }
      }
    }
  });

  // 5. Member expense contributions (line chart)
  destroyChart('compare');
  const ctx5 = document.getElementById('chartCompare').getContext('2d');
  const exData = getYearExpenseData();

  charts.compare = new Chart(ctx5, {
    type: 'line',
    data: {
      labels: exData.months,
      datasets: STATE.members.map((m, i) => ({
        label: m.name,
        data: exData.memberMonthly[i],
        borderColor: memberColor(i),
        backgroundColor: memberColor(i) + '22',
        pointBackgroundColor: memberColor(i),
        pointBorderColor: memberColor(i),
        pointRadius: window.innerWidth < 640 ? 3 : 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        tension: 0.35,
        fill: false
      }))
    },
    options: {
      ...defaults,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...defaults.plugins,
        legend: {
          display: true,
          position: window.innerWidth < 640 ? 'bottom' : 'top',
          labels: { color: ct.tick, font: { size: 11 }, boxWidth: 12, padding: 14, usePointStyle: true }
        }
      },
      scales: {
        x: { grid: { color: ct.grid }, ticks: { color: ct.tick, font: { size: 10 }, maxRotation: 0 } },
        y: { grid: { color: ct.grid }, ticks: { color: ct.tick, callback: v => '৳' + v.toLocaleString() }, beginAtZero: true }
      }
    }
  });

  // 6. Rounding gap chart
  destroyChart('gap');
  const ctxGap = document.getElementById('chartGap').getContext('2d');
  charts.gap = new Chart(ctxGap, {
    type: 'bar',
    data: {
      labels: yd.months,
      datasets: [{
        label: 'Rounding gap',
        data: yd.gaps,
        backgroundColor: yd.gaps.map(g => g > 0 ? 'rgba(45, 212, 191, 0.75)' : ct.grid),
        borderColor: yd.gaps.map(g => g > 0 ? ACCENT : ct.grid),
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      ...defaults,
      plugins: {
        ...defaults.plugins,
        tooltip: {
          ...defaults.plugins.tooltip,
          callbacks: {
            label: ctx => ` Gap: ৳${ctx.raw.toLocaleString()}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: ct.tick, font: { size: 10 } } },
        y: {
          grid: { color: ct.grid },
          ticks: { color: ct.tick, callback: v => '৳' + v },
          beginAtZero: true
        }
      }
    }
  });

  requestAnimationFrame(resizeCharts);
  lastLayoutBucket = getLayoutBucket();
}

/* ── Bills Page ── */
function renderBillsPage() {
  updateMonthDisplay();
}

function updateMonthDisplay() {
  document.getElementById('monthNavLabel').textContent = MONTH_NAMES[currentBillMonth.getMonth()];
  document.getElementById('monthNavYear').textContent = `${currentBillMonth.getFullYear()} · Billing Period`;

  const key = monthKey(currentBillMonth);
  const bd = STATE.bills[key] || {};
  const body = document.getElementById('monthBody');
  const calcRaw = calcBill(currentBillMonth);

  if (!bd.locked || bd.electricity == null) {
    body.innerHTML = `
      <div class="elec-gate">
        <div class="elec-gate__icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <h3>Electricity Bill Required</h3>
        <p>Enter the electricity amount for <strong>${monthLabel(currentBillMonth)}</strong>. Once saved, it cannot be changed without a reset.</p>
        <div class="elec-gate__row">
          <input class="form-input" type="number" id="elecInput" placeholder="e.g. 910" min="1" ${canSubmitBills() ? '' : 'disabled'}/>
          <button class="btn btn-primary" id="submitElecBtn">${canSubmitBills() ? 'Submit & Lock' : 'Sign in to submit'}</button>
        </div>
        ${!canSubmitBills() ? '<p class="form-hint" style="margin-top:12px;text-align:center">Admin or Bill Manager sign-in required</p>' : ''}
      </div>`;

    document.getElementById('submitElecBtn').onclick = () => {
      requireAuth({ role: 'adminOrBillManager' }, async () => {
        const v = parseFloat(document.getElementById('elecInput').value);
        if (!v || v <= 0) { toast('Enter a valid amount', 'error'); return; }
        try {
          STATE = await apiSaveBill(key, v);
          toast(`Electricity ${fmt(v)} locked for ${monthLabel(currentBillMonth)}`);
          updateMonthDisplay();
        } catch (e) {
          toast(e.message, 'error');
        }
      });
    };
    return;
  }

  if (!calcRaw || !calcRaw.results.length) {
    body.innerHTML = `<div class="empty"><h3>No members configured</h3><p>Add members in Configuration first.</p></div>`;
    return;
  }

  const calc = enrichCalcWithAdjustments(calcRaw, key);
  const manager = getBillManager();
  const cfg = STATE.config.fixedCosts;

  body.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <span class="locked-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Locked · ${bd.savedAt ? new Date(bd.savedAt).toLocaleDateString() : 'Saved'}
      </span>
    </div>
    <div class="summary-pills">
      <div class="summary-pill"><div class="summary-pill__label">House Rent</div><div class="summary-pill__value">${fmt(calc.houseRentTotal)}</div></div>
      <div class="summary-pill"><div class="summary-pill__label">Electricity</div><div class="summary-pill__value" style="color:var(--sky)">${fmt(bd.electricity)}</div></div>
      <div class="summary-pill"><div class="summary-pill__label">Actual Bill</div><div class="summary-pill__value">${fmt(calc.actualBill)}</div></div>
      <div class="summary-pill"><div class="summary-pill__label">Collected</div><div class="summary-pill__value" style="color:var(--accent)">${fmt(calc.collectedTotal)}</div></div>
      <div class="summary-pill"><div class="summary-pill__label">Rounding Gap</div><div class="summary-pill__value" style="color:var(--amber)">+${fmt(calc.gap)}</div></div>
    </div>
    <div class="grid-3" id="monthMemberCards">
      ${calc.results.map((r, i) => `
        <div class="member-card" style="animation-delay:${i * 0.08}s">
          <div class="member-card__head">
            ${avatarHTML({ photo: r.photo, name: r.name }, i)}
            <div>
              <div class="member-card__name">${r.name}${manager && r.id === manager.id ? ' <span class="manager-badge">Bill Manager</span>' : ''}</div>
              <div class="member-card__total" style="font-size:26px">${fmt(r.total)}</div>
            </div>
          </div>
          ${Object.entries(r.breakdown).map(([k, v]) => `
            <div class="bill-row">
              <span class="bill-row__label">${BILL_LABELS[k]}</span>
              <span class="bill-row__value">${fmt(v)}</span>
            </div>
          `).join('')}
          ${r.adjustments.map(a => `
            <div class="bill-row bill-row--adj">
              <span class="bill-row__label">${a.type === 'lend' ? 'Lent' : 'Borrowed'} · ${escapeHtml(a.label)}</span>
              <span class="bill-row__value bill-row__value--${a.type === 'lend' ? 'lend' : 'borrow'}">${a.type === 'lend' ? '+' : '−'}${fmt(a.amount).slice(1)}</span>
            </div>
          `).join('')}
          <div class="bill-row" style="border-top:1px solid rgba(45,212,191,0.22);margin-top:8px;padding-top:12px">
            <span class="bill-row__label" style="font-weight:700;color:var(--text)">Total Payable</span>
            <span class="bill-row__value" style="color:var(--accent);font-size:16px">${fmt(r.total)}</span>
          </div>
        </div>
      `).join('')}
    </div>
    ${manager ? `
    <div class="section-head payment-section-head">
      <div class="section-head__title">Payment Summary <span>Send to Bill Manager</span></div>
      <span class="chip chip--accent payment-manager-chip">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        ${escapeHtml(manager.name)}
      </span>
    </div>
    <div class="grid-3" id="monthPaymentCards">
      ${calc.results.map((r, i) => {
        const isManager = r.id === manager.id;
        const sendAmount = isManager
          ? calc.results.filter(x => x.id !== manager.id).reduce((s, x) => s + x.total, 0)
          : r.total;
        return `
        <div class="payment-card${isManager ? ' payment-card--manager' : ''}" style="animation-delay:${i * 0.08}s">
          <div class="payment-card__head">
            ${avatarHTML({ photo: r.photo, name: r.name }, i)}
            <div class="payment-card__meta">
              <div class="member-card__name">${escapeHtml(r.name)}</div>
              ${isManager
                ? '<span class="manager-badge">Bill Manager</span>'
                : `<div class="payment-card__send">Send to <strong>${escapeHtml(manager.name)}</strong></div>`}
            </div>
          </div>
          <div class="payment-card__rows">
            <div class="bill-row">
              <span class="bill-row__label">Bill share</span>
              <span class="bill-row__value">${fmt(r.baseTotal)}</span>
            </div>
            ${r.adjDelta ? `
            <div class="bill-row bill-row--adj">
              <span class="bill-row__label">Lend / borrow adj.</span>
              <span class="bill-row__value bill-row__value--${r.adjDelta > 0 ? 'lend' : 'borrow'}">${r.adjDelta > 0 ? '+' : '−'}${fmt(Math.abs(r.adjDelta)).slice(1)}</span>
            </div>` : ''}
            <div class="bill-row payment-card__total-row">
              <span class="bill-row__label">${isManager ? 'Total to collect' : 'Amount to send'}</span>
              <span class="bill-row__value payment-card__amount">${fmt(sendAmount)}</span>
            </div>
          </div>
          ${!isManager && (r.adjustments.length || canEditAdjustments()) ? `
          <div class="adj-panel" data-member="${r.id}">
            <div class="adj-panel__head">
              <span class="adj-panel__title">Lend / Borrow</span>
              <span class="adj-panel__hint">${canEditAdjustments() ? 'Bill Manager records' : 'View only'}</span>
            </div>
            <div class="adj-list" id="adj-list-${r.id}">
              ${renderAdjItemsHTML(r.adjustments, r.id, canEditAdjustments())}
            </div>
            ${canEditAdjustments() ? `
            <div class="adj-form" id="adj-form-${r.id}">
              <input class="form-input adj-input" id="adj-label-${r.id}" placeholder="What was it for? e.g. Paid WiFi advance" maxlength="80"/>
              <div class="adj-type-btns" role="group" aria-label="Adjustment type">
                <button class="adj-type-btn active" type="button" data-type="lend" data-member="${r.id}">Manager lent</button>
                <button class="adj-type-btn" type="button" data-type="borrow" data-member="${r.id}">Manager borrowed</button>
              </div>
              <div class="adj-form__actions">
                <input class="form-input adj-amount" id="adj-amount-${r.id}" type="number" min="1" inputmode="numeric" placeholder="Amount (৳)"/>
                <button class="btn btn-primary btn-sm adj-save" data-member="${r.id}" type="button">Add</button>
              </div>
            </div>` : ''}
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>` : ''}
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Expense</th><th>Total</th>
          ${calc.results.map(r => `<th>${r.name}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${[
            ['🏠 Rent+Gas+Water+Service', calc.fixedBucket, ...calc.results.map(r => r.breakdown.fixedBucket)],
            ['⚡ Electricity', bd.electricity, ...calc.results.map(r => r.breakdown.electricity)],
            ['🧹 House Maid', cfg.maid, ...calc.results.map(r => r.breakdown.maid)],
            ['📶 WiFi', cfg.wifi, ...calc.results.map(r => r.breakdown.wifi)]
          ].map(row => `<tr>${row.map((v, ci) =>
            `<td${ci === 0 ? '' : ' style="font-family:var(--font-head);font-weight:600;color:var(--accent)"'}>${ci === 0 ? v : fmt(v)}</td>`
          ).join('')}</tr>`).join('')}
          <tr class="total-row">
            <td>COLLECTED</td><td>${fmt(calc.collectedTotal)}</td>
            ${calc.results.map(r => `<td>${fmt(r.baseTotal)}</td>`).join('')}
          </tr>
          ${calc.results.some(r => r.adjustments.length) ? `
          <tr>
            <td style="color:var(--text-muted)">Lend / Borrow adj.</td><td>—</td>
            ${calc.results.map(r => `<td style="color:${r.adjDelta > 0 ? 'var(--amber)' : r.adjDelta < 0 ? 'var(--sky)' : 'var(--text-dim)'}">${r.adjDelta ? (r.adjDelta > 0 ? '+' : '−') + fmt(Math.abs(r.adjDelta)).slice(1) : '—'}</td>`).join('')}
          </tr>
          <tr class="total-row">
            <td>TOTAL PAYABLE</td><td>${fmt(calc.results.reduce((s, r) => s + r.total, 0))}</td>
            ${calc.results.map(r => `<td>${fmt(r.total)}</td>`).join('')}
          </tr>` : ''}
          <tr>
            <td style="color:var(--text-muted)">Actual bill</td><td style="font-weight:600">${fmt(calc.actualBill)}</td>
            ${calc.results.map(() => `<td style="color:var(--text-dim)">—</td>`).join('')}
          </tr>
          <tr>
            <td style="color:var(--amber)">Rounding gap</td><td style="font-weight:700;color:var(--amber)">+${fmt(calc.gap)}</td>
            ${calc.results.map(() => `<td style="color:var(--text-dim)">—</td>`).join('')}
          </tr>
        </tbody>
      </table>
    </div>`;

  bindAdjustmentEvents(key);
}

function getAdjTypeForMember(memberId) {
  const active = document.querySelector(`.adj-type-btn.active[data-member="${memberId}"]`);
  return active?.dataset.type || 'lend';
}

function bindAdjustmentEvents(monthKey) {
  document.querySelectorAll('.adj-type-btn').forEach(btn => {
    btn.onclick = () => {
      const memberId = btn.dataset.member;
      document.querySelectorAll(`.adj-type-btn[data-member="${memberId}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });

  document.querySelectorAll('.adj-save').forEach(btn => {
    btn.onclick = () => {
      requireAuth({ role: 'billManager' }, async () => {
        const memberId = btn.dataset.member;
        const label = document.getElementById(`adj-label-${memberId}`)?.value.trim();
        const type = getAdjTypeForMember(memberId);
        const amount = parseFloat(document.getElementById(`adj-amount-${memberId}`)?.value);
        if (!label) { toast('Enter a description', 'error'); return; }
        if (!amount || amount <= 0) { toast('Enter a valid amount', 'error'); return; }

        btn.disabled = true;
        const adjustments = { ...getMonthAdjustments(monthKey) };
        const list = [...(adjustments[memberId] || [])];
        list.push({ id: 'adj' + Date.now(), type, label, amount });
        adjustments[memberId] = list;

        try {
          STATE = await apiSaveAdjustments(monthKey, adjustments);
          toast('Adjustment added');
          updateMonthDisplay();
        } catch (e) {
          toast(e.message, 'error');
          btn.disabled = false;
        }
      });
    };
  });

  document.querySelectorAll('.adj-item__remove').forEach(btn => {
    btn.onclick = () => {
      requireAuth({ role: 'billManager' }, () => {
        const memberId = btn.dataset.member;
        const adjId = btn.dataset.id;
        const item = (getMonthAdjustments(monthKey)[memberId] || []).find(a => a.id === adjId);
        const label = item?.label || 'this entry';
        confirmDialog('Delete adjustment?', `"${label}" will be removed from the total payable.`, async () => {
          const adjustments = { ...getMonthAdjustments(monthKey) };
          adjustments[memberId] = (adjustments[memberId] || []).filter(a => a.id !== adjId);
          if (!adjustments[memberId].length) delete adjustments[memberId];

          try {
            STATE = await apiSaveAdjustments(monthKey, adjustments);
            toast('Adjustment deleted');
            updateMonthDisplay();
          } catch (e) {
            toast(e.message, 'error');
          }
        });
      });
    };
  });
}

/* ── Expenses Page ── */
function renderExpensesPage() {
  updateExpenseMonthDisplay();
}

function renderExpenseItemsHTML(items, memberId, editable) {
  if (!items.length) {
    return `<div class="expense-empty">No expenses logged yet${editable ? ' — add your first item below' : ''}</div>`;
  }
  return items.map(item => `
    <div class="expense-item" data-id="${item.id}">
      <div class="expense-item__main">
        <span class="expense-item__category" style="--cat-color:${expenseCategoryColor(item.category)}">${escapeHtml(item.category)}</span>
        <span class="expense-item__name">${escapeHtml(item.name)}</span>
      </div>
      <div class="expense-item__right">
        <span class="expense-item__price">${fmt(item.price)}</span>
        ${editable ? `<button type="button" class="expense-item__remove" data-member="${memberId}" data-id="${item.id}" title="Remove" aria-label="Remove expense">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>` : ''}
      </div>
    </div>
  `).join('');
}

function updateExpenseMonthDisplay() {
  document.getElementById('expenseMonthNavLabel').textContent = MONTH_NAMES[currentExpenseMonth.getMonth()];
  document.getElementById('expenseMonthNavYear').textContent = `${currentExpenseMonth.getFullYear()} · Expense Period`;

  const body = document.getElementById('expenseMonthBody');
  if (!STATE.members.length) {
    body.innerHTML = `<div class="empty"><h3>No members configured</h3><p>Add members in Configuration first.</p></div>`;
    return;
  }

  const calc = calcExpenseMonth(currentExpenseMonth);
  const baseNames = calc.baseMembers.map(r => r.name).join(', ');

  body.innerHTML = `
    <div class="info-box expense-info">
      <strong>How it works:</strong> The member with the <em>lowest total</em> (this month + carry forward) sets the base. Everyone else pays the extra above that base, forwarded to the next month.
    </div>
    <div class="summary-pills">
      <div class="summary-pill"><div class="summary-pill__label">Month Spend</div><div class="summary-pill__value">${fmt(calc.totalMonthSpend)}</div></div>
      <div class="summary-pill"><div class="summary-pill__label">Base Amount</div><div class="summary-pill__value" style="color:var(--sky)">${fmt(calc.base)}</div></div>
      <div class="summary-pill"><div class="summary-pill__label">Total Extra</div><div class="summary-pill__value" style="color:var(--amber)">${fmt(calc.totalExtra)}</div></div>
      <div class="summary-pill"><div class="summary-pill__label">Forward Next Month</div><div class="summary-pill__value" style="color:var(--accent)">${fmt(calc.totalForward)}</div></div>
    </div>
    ${calc.baseMembers.length ? `
    <div class="expense-base-banner">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      Base member${calc.baseMembers.length > 1 ? 's' : ''}: <strong>${escapeHtml(baseNames)}</strong> at ${fmt(calc.base)}
    </div>` : ''}
    <div class="section-head">
      <div class="section-head__title">Expense Book <span>All Members</span></div>
      <span class="chip chip--accent">${monthLabel(currentExpenseMonth)}</span>
    </div>
    <div class="expense-books-grid" id="expenseBooksGrid">
      ${calc.results.map((r, i) => {
        const editable = canEditMemberExpenses(r.id);
        const isYou = isLoggedIn() && AUTH.memberId === r.id;
        return `
        <div class="expense-book${r.isBase ? ' expense-book--base' : ''}" style="animation-delay:${i * 0.06}s">
          <div class="expense-book__head">
            ${avatarHTML({ photo: r.photo, name: r.name }, i)}
            <div class="expense-book__meta">
              <div class="expense-book__name">
                ${escapeHtml(r.name)}
                ${isYou ? '<span class="expense-book__you">You</span>' : ''}
                ${r.isBase ? '<span class="expense-book__base-badge">Base</span>' : ''}
              </div>
              <div class="expense-book__spend">${fmt(r.monthSpend)} this month</div>
            </div>
          </div>
          <div class="expense-book__items" id="expense-items-${r.id}">
            ${renderExpenseItemsHTML(r.items, r.id, editable)}
          </div>
          ${editable ? `
          <div class="expense-form" id="expense-form-${r.id}">
            <input class="form-input expense-form__name" id="expense-name-${r.id}" placeholder="Item name" maxlength="80"/>
            <div class="expense-form__row">
              <select class="form-input expense-form__category" id="expense-cat-${r.id}" aria-label="Category">
                ${EXPENSE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
              <input class="form-input expense-form__price" id="expense-price-${r.id}" type="number" min="1" inputmode="numeric" placeholder="Price (৳)"/>
              <button class="btn btn-primary btn-sm expense-add-btn" data-member="${r.id}" type="button">Add</button>
            </div>
          </div>` : `
          <div class="expense-readonly-hint">${isLoggedIn() ? 'Sign in as this member or Admin to edit' : 'Sign in to add your expenses'}</div>`}
          <div class="expense-book__totals">
            ${r.carried ? `<div class="bill-row"><span class="bill-row__label">Carried forward</span><span class="bill-row__value" style="color:var(--amber)">+${fmt(r.carried).slice(1)}</span></div>` : ''}
            <div class="bill-row"><span class="bill-row__label">Month spend</span><span class="bill-row__value">${fmt(r.monthSpend)}</span></div>
            <div class="bill-row"><span class="bill-row__label">Grand total</span><span class="bill-row__value">${fmt(r.grandTotal)}</span></div>
            <div class="bill-row bill-row--adj">
              <span class="bill-row__label">Extra above base</span>
              <span class="bill-row__value bill-row__value--${r.extra ? 'lend' : 'borrow'}">${r.extra ? '+' + fmt(r.extra).slice(1) : '—'}</span>
            </div>
            <div class="bill-row" style="border-top:1px solid rgba(45,212,191,0.22);margin-top:8px;padding-top:12px">
              <span class="bill-row__label" style="font-weight:700;color:var(--text)">Forward next month</span>
              <span class="bill-row__value" style="color:var(--accent);font-size:16px">${fmt(r.forwardOut)}</span>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="table-wrap">
      <table class="data-table expense-table">
        <thead><tr>
          <th>Member</th><th>Month Spend</th><th>Carried</th><th>Grand Total</th><th>Extra</th><th>Forward</th>
        </tr></thead>
        <tbody>
          ${calc.results.map(r => `
          <tr${r.isBase ? ' class="expense-table__base-row"' : ''}>
            <td>${escapeHtml(r.name)}${r.isBase ? ' <span class="expense-book__base-badge">Base</span>' : ''}</td>
            <td>${fmt(r.monthSpend)}</td>
            <td>${r.carried ? fmt(r.carried) : '—'}</td>
            <td style="font-weight:700;color:var(--accent)">${fmt(r.grandTotal)}</td>
            <td style="color:${r.extra ? 'var(--amber)' : 'var(--text-dim)'}">${r.extra ? fmt(r.extra) : '—'}</td>
            <td style="color:var(--accent)">${fmt(r.forwardOut)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  bindExpenseEvents(calc.key);
}

async function saveMemberExpenses(monthKey, memberId, items) {
  STATE = await apiSaveExpenses(monthKey, memberId, items);
}

function bindExpenseEvents(monthKey) {
  document.querySelectorAll('.expense-add-btn').forEach(btn => {
    btn.onclick = () => {
      const memberId = btn.dataset.member;
      requireAuth({}, async () => {
        if (!canEditMemberExpenses(memberId)) {
          toast('You can only edit your own expenses', 'error');
          return;
        }
        const name = document.getElementById(`expense-name-${memberId}`)?.value.trim();
        const category = document.getElementById(`expense-cat-${memberId}`)?.value || 'Other';
        const price = parseFloat(document.getElementById(`expense-price-${memberId}`)?.value);
        if (!name) { toast('Enter an item name', 'error'); return; }
        if (!price || price <= 0) { toast('Enter a valid price', 'error'); return; }

        const monthData = STATE.expenses?.[monthKey] || { items: {} };
        const items = [...(monthData.items?.[memberId] || [])];
        items.push({
          id: 'exp' + Date.now(),
          name,
          category,
          price,
          createdAt: new Date().toISOString()
        });

        btn.disabled = true;
        try {
          await saveMemberExpenses(monthKey, memberId, items);
          toast('Expense added');
          updateExpenseMonthDisplay();
          if (document.getElementById('page-dashboard').classList.contains('active')) {
            renderCharts();
          }
        } catch (e) {
          toast(e.message, 'error');
          btn.disabled = false;
        }
      });
    };
  });

  document.querySelectorAll('.expense-item__remove').forEach(btn => {
    btn.onclick = () => {
      const memberId = btn.dataset.member;
      const itemId = btn.dataset.id;
      requireAuth({}, () => {
        if (!canEditMemberExpenses(memberId)) {
          toast('You can only edit your own expenses', 'error');
          return;
        }
        const monthData = STATE.expenses?.[monthKey] || { items: {} };
        const item = (monthData.items?.[memberId] || []).find(x => x.id === itemId);
        confirmDialog('Delete expense?', `"${item?.name || 'This item'}" will be removed.`, async () => {
          const items = (monthData.items?.[memberId] || []).filter(x => x.id !== itemId);
          try {
            await saveMemberExpenses(monthKey, memberId, items);
            toast('Expense removed');
            updateExpenseMonthDisplay();
            if (document.getElementById('page-dashboard').classList.contains('active')) {
              renderCharts();
            }
          } catch (e) {
            toast(e.message, 'error');
          }
        });
      });
    };
  });

  document.querySelectorAll('.expense-form__name').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const memberId = input.id.replace('expense-name-', '');
        document.querySelector(`.expense-add-btn[data-member="${memberId}"]`)?.click();
      }
    });
  });
}

/* ── Settings ── */
function applySettingsReadonly() {
  const editable = canEditSettings();
  const banner = document.getElementById('settingsReadonlyBanner');
  if (banner) {
    banner.innerHTML = editable ? '' : `
      <div class="readonly-banner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>View only — sign in as <strong>Admin</strong> to edit configuration.</span>
      </div>`;
  }

  const settingsPage = document.getElementById('page-settings');
  if (!settingsPage) return;
  settingsPage.querySelectorAll('input, select, textarea, button').forEach(el => {
    if (el.closest('#settingsReadonlyBanner') || el.closest('.sidebar')) return;
    if (el.id === 'sidebarLoginBtn' || el.id === 'sidebarLogoutBtn') return;
    if (['addMemberBtn', 'saveMembersBtn', 'saveCostsBtn', 'saveRentBtn', 'exportBackupBtn', 'restoreBackupBtn', 'resetBillsBtn', 'resetMonthBtn', 'resetAllBtn', 'confirmAdd', 'cancelAdd', 'newMemberFile'].includes(el.id)) {
      el.style.display = editable ? '' : 'none';
      return;
    }
    if (el.classList.contains('member-config__remove') || el.classList.contains('photo-input') || el.classList.contains('mgr-toggle') || el.classList.contains('admin-toggle') || el.classList.contains('rent-toggle') || el.classList.contains('reset-pwd-btn')) {
      el.disabled = !editable;
      if (!editable) el.closest('.member-config__remove, .photo-upload, .member-config__manager, .member-config__admin, .member-password-row, .rent-card')?.classList.add('readonly-field');
      return;
    }
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
      el.disabled = !editable;
      el.readOnly = !editable;
    }
    if (el.classList.contains('toggle-switch')) el.disabled = !editable;
  });

  settingsPage.querySelectorAll('.member-password-row').forEach(row => {
    row.style.display = editable ? '' : 'none';
  });
}

function renderSettings() {
  populateResetMonthPickers();
  renderMembersConfig();
  renderFixedCostsConfig();
  renderRentSplitConfig();
  applySettingsReadonly();
}

function renderMembersConfig() {
  tempMembers = JSON.parse(JSON.stringify(STATE.members));
  const billManagerId = STATE.config.billManagerId || STATE.members[0]?.id || '';
  const adminId = STATE.config.adminId || STATE.members[0]?.id || '';
  const grid = document.getElementById('membersGrid');
  grid.innerHTML = tempMembers.map((m, i) => `
    <div class="member-config" id="mc-${m.id}">
      <button class="member-config__remove" data-id="${m.id}" title="Remove" type="button">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="member-config__body">
        <div class="photo-upload" id="photo-${m.id}">
          ${m.photo ? `<img src="${m.photo}" id="img-${m.id}" alt=""/>` : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}
          <div class="photo-upload__badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg></div>
          <input type="file" accept="image/*" data-id="${m.id}" class="photo-input"/>
        </div>
        <div class="member-config__fields">
          <label class="form-label" for="name-${m.id}">Member Name</label>
          <input class="form-input" value="${escapeHtml(m.name)}" id="name-${m.id}" style="font-family:var(--font-head);font-weight:700"/>
        </div>
      </div>
      <div class="member-config__manager">
        <button
          type="button"
          class="toggle-switch mgr-toggle${m.id === billManagerId ? ' on' : ''}"
          id="mgr-${m.id}"
          data-id="${m.id}"
          role="switch"
          aria-checked="${m.id === billManagerId}"
          aria-label="Set ${escapeHtml(m.name)} as Bill Manager"
        ></button>
        <div class="member-config__manager-text">
          <span class="member-config__manager-title">Bill Manager</span>
          <span class="member-config__manager-hint">Receives payments from other members</span>
        </div>
      </div>
      <div class="member-config__admin">
        <button
          type="button"
          class="toggle-switch admin-toggle${m.id === adminId ? ' on' : ''}"
          id="admin-${m.id}"
          data-id="${m.id}"
          role="switch"
          aria-checked="${m.id === adminId}"
          aria-label="Set ${escapeHtml(m.name)} as Admin"
        ></button>
        <div class="member-config__admin-text">
          <span class="member-config__admin-title">Admin</span>
          <span class="member-config__admin-hint">Can edit configuration &amp; reset passwords</span>
        </div>
      </div>
      <div class="member-password-row">
        <label class="form-label" for="pwd-${m.id}">Password</label>
        <div class="member-password-actions">
          <input class="form-input" type="password" id="pwd-${m.id}" placeholder="New password" minlength="4"/>
          <button class="btn btn-ghost btn-sm reset-pwd-btn" data-id="${m.id}" type="button">Reset</button>
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.photo-input').forEach(input => {
    input.addEventListener('change', e => {
      if (!canEditSettings()) return;
      const id = e.target.dataset.id;
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const m = tempMembers.find(x => x.id === id);
        if (m) m.photo = ev.target.result;
        const wrap = document.getElementById(`photo-${id}`);
        let img = document.getElementById(`img-${id}`);
        if (!img) {
          img = document.createElement('img');
          img.id = `img-${id}`;
          wrap.insertBefore(img, wrap.firstChild);
        }
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  });

  document.querySelectorAll('.member-config__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      requireAuth({ role: 'admin' }, () => {
        const id = btn.dataset.id;
        confirmDialog('Remove member?', 'They will be removed from all future calculations.', () => {
          tempMembers = tempMembers.filter(m => m.id !== id);
          renderMembersConfig();
          applySettingsReadonly();
          toast('Member removed — save to apply');
        });
      });
    });
  });

  document.querySelectorAll('.reset-pwd-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      requireAuth({ role: 'admin' }, async () => {
        const id = btn.dataset.id;
        const pwd = document.getElementById(`pwd-${id}`)?.value;
        if (!pwd || pwd.length < 4) { toast('Enter a password with at least 4 characters', 'error'); return; }
        try {
          await apiResetPassword(id, pwd);
          document.getElementById(`pwd-${id}`).value = '';
          toast('Password updated');
        } catch (e) {
          toast(e.message, 'error');
        }
      });
    });
  });
}

function renderFixedCostsConfig() {
  const cfg = STATE.config.fixedCosts;
  document.getElementById('cfgAptName').value = STATE.config.aptName || '';
  document.getElementById('cfgAptFloor').value = STATE.config.aptFloor || '';
  document.getElementById('cfgRent').value = cfg.rent ?? 20000;
  document.getElementById('cfgGas').value = cfg.gas ?? 1080;
  document.getElementById('cfgWater').value = cfg.water ?? 1000;
  document.getElementById('cfgService').value = cfg.service ?? 2000;
  document.getElementById('cfgMaid').value = cfg.maid ?? 2500;
  document.getElementById('cfgWifi').value = cfg.wifi ?? 800;
}

function renderRentSplitConfig() {
  const container = document.getElementById('rentSplitGrid');
  const rentSplit = STATE.config.rentSplit || {};

  container.innerHTML = STATE.members.map((m, i) => {
    const hasFixed = rentSplit[m.id] !== undefined && rentSplit[m.id] !== null;
    return `
      <div class="rent-card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          ${avatarHTML(m, i)}
          <div>
            <div style="font-family:var(--font-head);font-weight:700">${m.name}</div>
              <div style="font-size:12px;color:var(--text-muted)">Fixed share (Rent+Gas+Water+Service)</div>
          </div>
        </div>
        <div class="toggle-row">
          <button type="button" class="toggle-switch rent-toggle${hasFixed ? ' on' : ''}" id="tgl-${m.id}" data-id="${m.id}" role="switch" aria-checked="${hasFixed}" aria-label="Fixed bucket amount for ${escapeHtml(m.name)}"></button>
          <span class="toggle-label">Fixed bucket amount</span>
        </div>
        <div id="inp-${m.id}" style="display:${hasFixed ? 'block' : 'none'}">
          <input class="form-input" type="number" id="val-${m.id}" value="${hasFixed ? rentSplit[m.id] : ''}" placeholder="e.g. 6500"/>
        </div>
        <div id="eq-${m.id}" style="display:${hasFixed ? 'none' : 'block'};font-size:12px;color:var(--text-muted);margin-top:8px">
          Shares remaining bucket equally with others
        </div>
      </div>`;
  }).join('');

  document.querySelectorAll('.rent-toggle').forEach(tgl => {
    tgl.addEventListener('click', () => {
      const on = !tgl.classList.contains('on');
      tgl.classList.toggle('on', on);
      tgl.setAttribute('aria-checked', String(on));
      const id = tgl.dataset.id;
      document.getElementById(`inp-${id}`).style.display = on ? 'block' : 'none';
      document.getElementById(`eq-${id}`).style.display = on ? 'none' : 'block';
    });
  });
}

/* ── Event Bindings ── */
function bindEvents() {
  initTheme();
  populateResetMonthPickers();
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  lastLayoutBucket = getLayoutBucket();
  setupChartResizeObserver();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!document.getElementById('page-dashboard').classList.contains('active')) return;
      resizeCharts();
      const bucket = getLayoutBucket();
      if (bucket !== lastLayoutBucket) {
        lastLayoutBucket = bucket;
        updateChartLegendPositions();
      }
    }, 100);
  });

  document.querySelectorAll('.nav-link, .bottom-nav__btn').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });

  window.addEventListener('hashchange', () => {
    navigate(getPageFromHash(), { skipHash: true });
  });

  document.getElementById('menuBtn').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const opening = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', opening);
    backdrop.classList.toggle('open', opening);
    document.body.classList.toggle('sidebar-open', opening);
  });
  document.getElementById('sidebarBackdrop').addEventListener('click', closeSidebar);

  document.getElementById('prevMonth').addEventListener('click', () => {
    currentBillMonth.setMonth(currentBillMonth.getMonth() - 1);
    updateMonthDisplay();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentBillMonth.setMonth(currentBillMonth.getMonth() + 1);
    updateMonthDisplay();
  });

  document.getElementById('prevExpenseMonth').addEventListener('click', () => {
    currentExpenseMonth.setMonth(currentExpenseMonth.getMonth() - 1);
    updateExpenseMonthDisplay();
  });
  document.getElementById('nextExpenseMonth').addEventListener('click', () => {
    currentExpenseMonth.setMonth(currentExpenseMonth.getMonth() + 1);
    updateExpenseMonthDisplay();
  });

  document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      ['members', 'costs', 'rent', 'backup', 'danger'].forEach(id => {
        document.getElementById(`tab-${id}`).style.display = id === tab.dataset.tab ? 'block' : 'none';
      });
    });
  });

  document.getElementById('addMemberBtn').addEventListener('click', () => {
    requireAuth({ role: 'admin' }, () => {
      document.getElementById('newMemberName').value = '';
      document.getElementById('newMemberPreview').style.display = 'none';
      document.getElementById('newMemberFile').value = '';
      newMemberPhoto = '';
      document.getElementById('addModal').classList.add('open');
    });
  });

  document.getElementById('cancelAdd').addEventListener('click', () => {
    document.getElementById('addModal').classList.remove('open');
  });

  document.getElementById('newMemberFile').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      newMemberPhoto = ev.target.result;
      const img = document.getElementById('newMemberPreview');
      img.src = newMemberPhoto;
      img.style.display = 'block';
    };
    r.readAsDataURL(f);
  });

  document.getElementById('confirmAdd').addEventListener('click', () => {
    const name = document.getElementById('newMemberName').value.trim();
    if (!name) { toast('Enter a name', 'error'); return; }
    tempMembers.push({ id: 'm' + Date.now(), name, photo: newMemberPhoto });
    document.getElementById('addModal').classList.remove('open');
    renderMembersConfig();
    toast(`${name} added — save to apply`);
  });

  document.getElementById('membersGrid').addEventListener('click', e => {
    if (!canEditSettings()) {
      if (e.target.closest('.mgr-toggle, .admin-toggle, .member-config__manager, .member-config__admin')) {
        e.preventDefault();
        requireAuth({ role: 'admin' }, () => renderSettings());
      }
      return;
    }

    const mgrRow = e.target.closest('.member-config__manager');
    const mgrTgl = e.target.closest('.mgr-toggle') || mgrRow?.querySelector('.mgr-toggle');
    if (mgrTgl) {
      e.preventDefault();
      document.querySelectorAll('.mgr-toggle').forEach(t => {
        t.classList.remove('on');
        t.setAttribute('aria-checked', 'false');
      });
      mgrTgl.classList.add('on');
      mgrTgl.setAttribute('aria-checked', 'true');
      return;
    }

    const adminRow = e.target.closest('.member-config__admin');
    const adminTgl = e.target.closest('.admin-toggle') || adminRow?.querySelector('.admin-toggle');
    if (adminTgl) {
      e.preventDefault();
      document.querySelectorAll('.admin-toggle').forEach(t => {
        t.classList.remove('on');
        t.setAttribute('aria-checked', 'false');
      });
      adminTgl.classList.add('on');
      adminTgl.setAttribute('aria-checked', 'true');
    }
  });

  document.getElementById('saveMembersBtn').addEventListener('click', async () => {
    requireAuth({ role: 'admin' }, async () => {
      tempMembers.forEach(m => {
        const inp = document.getElementById(`name-${m.id}`);
        if (inp) m.name = inp.value.trim() || m.name;
      });
      const billManagerId = tempMembers.find(m =>
        document.getElementById(`mgr-${m.id}`)?.classList.contains('on')
      )?.id || tempMembers[0]?.id || null;
      const adminId = tempMembers.find(m =>
        document.getElementById(`admin-${m.id}`)?.classList.contains('on')
      )?.id || tempMembers[0]?.id || null;
      try {
        STATE = await apiSaveConfig({ ...STATE.config, billManagerId, adminId }, tempMembers);
        toast('Members saved to server');
        renderTopbar();
        renderMembersConfig();
        renderRentSplitConfig();
        applySettingsReadonly();
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  });

  document.getElementById('saveCostsBtn').addEventListener('click', async () => {
    requireAuth({ role: 'admin' }, async () => {
      const config = {
        ...STATE.config,
        aptName: document.getElementById('cfgAptName').value.trim(),
        aptFloor: document.getElementById('cfgAptFloor').value.trim(),
        fixedCosts: {
          rent: parseFloat(document.getElementById('cfgRent').value) || 20000,
          gas: parseFloat(document.getElementById('cfgGas').value) || 0,
          water: parseFloat(document.getElementById('cfgWater').value) || 0,
          service: parseFloat(document.getElementById('cfgService').value) || 0,
          maid: parseFloat(document.getElementById('cfgMaid').value) || 0,
          wifi: parseFloat(document.getElementById('cfgWifi').value) || 0
        }
      };
      try {
        STATE = await apiSaveConfig(config, STATE.members);
        toast('Fixed costs saved to server');
        renderTopbar();
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  });

  document.getElementById('saveRentBtn').addEventListener('click', async () => {
    requireAuth({ role: 'admin' }, async () => {
      const rentSplit = {};
      STATE.members.forEach(m => {
        const tgl = document.getElementById(`tgl-${m.id}`);
        if (tgl && tgl.classList.contains('on')) {
          const val = parseFloat(document.getElementById(`val-${m.id}`).value);
          if (!isNaN(val) && val > 0) rentSplit[m.id] = val;
        }
      });
      try {
        STATE = await apiSaveConfig({ ...STATE.config, rentSplit }, STATE.members);
        toast('Rent split saved to server');
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  });

  document.getElementById('exportBackupBtn').addEventListener('click', () => {
    requireAuth({ role: 'admin' }, async () => {
      try {
        const backup = await apiExportBackup();
        downloadBackupFile(backup);
        toast('Backup downloaded');
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  });

  document.getElementById('restoreBackupBtn').addEventListener('click', () => {
    requireAuth({ role: 'admin' }, () => {
      document.getElementById('backupFileInput').click();
    });
  });

  document.getElementById('backupFileInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!canEditSettings()) {
      requireAuth({ role: 'admin' }, () => document.getElementById('backupFileInput').click());
      return;
    }
    let backup;
    try {
      backup = await readBackupFile(file);
    } catch (err) {
      toast(err.message, 'error');
      return;
    }
    const exportedAt = backup.exportedAt || backup.data?.exportedAt;
    const dateLabel = exportedAt ? new Date(exportedAt).toLocaleString() : 'unknown date';
    confirmDialog(
      'Restore backup?',
      `All current data will be replaced with the backup from ${dateLabel}. This cannot be undone.`,
      async () => {
        try {
          STATE = await apiRestoreBackup(backup);
          const verified = await apiVerifySession();
          if (verified) saveAuthSession(verified);
          else clearAuthSession();
          renderSidebarUser();
          applySettingsReadonly();
          toast('Backup restored');
          renderSettings();
          renderTopbar();
          const page = getPageFromHash();
          if (page === 'bills') updateMonthDisplay();
          if (page === 'dashboard') renderDashboard();
        } catch (err) {
          toast(err.message, 'error');
        }
      }
    );
  });

  document.getElementById('resetBillsBtn').addEventListener('click', () => {
    requireAuth({ role: 'admin' }, () => {
      confirmDialog('Reset all bills?', 'All electricity entries will be cleared. Configuration stays intact.', async () => {
        try {
          STATE = await apiResetBills();
          toast('All bill data reset');
          updateMonthDisplay();
        } catch (e) {
          toast(e.message, 'error');
        }
      });
    });
  });

  document.getElementById('resetMonthBtn').addEventListener('click', () => {
    requireAuth({ role: 'admin' }, () => {
      const month = document.getElementById('resetMonthSelect').value;
      const year = document.getElementById('resetYearSelect').value;
      const key = `${year}-${month}`;
      const label = `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
      confirmDialog(`Unlock ${label}?`, 'This removes the locked electricity bill for that month so you can enter it again.', async () => {
        try {
          STATE = await apiResetBillMonth(key);
          toast(`${label} unlocked`);
          if (monthKey(currentBillMonth) === key) updateMonthDisplay();
        } catch (e) {
          toast(e.message, 'error');
        }
      });
    });
  });

  document.getElementById('resetAllBtn').addEventListener('click', () => {
    requireAuth({ role: 'admin' }, () => {
      confirmDialog('Reset everything?', 'All members, config, and bills will be wiped permanently.', async () => {
        try {
          STATE = await apiResetAll();
          toast('Everything reset to defaults');
          renderSettings();
          renderTopbar();
        } catch (e) {
          toast(e.message, 'error');
        }
      });
    });
  });

  document.getElementById('loginCancel').addEventListener('click', closeLoginModal);
  document.getElementById('loginSubmit').addEventListener('click', async () => {
    const password = document.getElementById('loginPassword').value;
    if (!loginMemberId) { toast('Select a member', 'error'); return; }
    if (!password) { toast('Enter your password', 'error'); return; }
    try {
      const auth = await apiLogin(loginMemberId, password);
      saveAuthSession(auth);
      const cb = pendingAuthCallback;
      closeLoginModal();
      renderSidebarUser();
      applySettingsReadonly();
      const page = getPageFromHash();
      if (page === 'bills') updateMonthDisplay();
      if (page === 'settings') renderSettings();
      toast(`Welcome, ${auth.name}`);
      if (cb) cb();
    } catch (e) {
      toast(e.message || 'Sign in failed', 'error');
    }
  });
  document.getElementById('loginPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginSubmit').click();
  });

  document.getElementById('page-settings').addEventListener('click', e => {
    if (canEditSettings()) return;
    const target = e.target.closest('input, textarea, select, .toggle-switch, .photo-upload, .member-config__remove, .reset-pwd-btn, #addMemberBtn, #saveMembersBtn, #saveCostsBtn, #saveRentBtn, #exportBackupBtn, #restoreBackupBtn, #resetBillsBtn, #resetMonthBtn, #resetAllBtn');
    if (target) requireAuth({ role: 'admin' }, () => renderSettings());
  });

  document.getElementById('settingsReadonlyBanner').addEventListener('click', () => {
    if (!canEditSettings()) openLoginModal(() => renderSettings());
  });

  document.getElementById('confirmOk').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.remove('open');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });
  document.getElementById('confirmCancel').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.remove('open');
    confirmCallback = null;
  });

  document.querySelectorAll('.modal-backdrop').forEach(m => {
    m.addEventListener('click', e => {
      if (e.target === m) m.classList.remove('open');
    });
  });
}

/* ── Init ── */
async function init() {
  bindEvents();
  loadAuthSession();
  const chartReady = ensureChartJs().catch(err => {
    console.error(err);
    return null;
  });

  try {
    STATE = await apiGet();
    if (!STATE.expenses || typeof STATE.expenses !== 'object') STATE.expenses = {};
    syncOnline = true;
    const verified = await apiVerifySession();
    if (verified) saveAuthSession(verified);
    else clearAuthSession();
  } catch (e) {
    syncOnline = false;
    toast(e.message.includes('Redis') || e.message.includes('storage') ? e.message : 'Could not connect to server — check deployment', 'error');
    STATE = {
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
      expenses: {}
    };
  }

  await chartReady;

  document.getElementById('loader').classList.add('hidden');
  renderSidebarUser();
  try {
    navigate(getPageFromHash(), { skipHash: true });
  } catch (e) {
    console.error(e);
    toast('Page could not load — check your connection', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init().catch(console.error));
} else {
  init().catch(console.error);
}
