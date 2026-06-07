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
let charts = {};
let tempMembers = [];
let newMemberPhoto = '';
let confirmCallback = null;

/* ── API ── */
async function parseApiResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || 'Request failed';
    if (data.code === 'STORAGE_NOT_CONFIGURED' || /read-only file system|EROFS/i.test(msg)) {
      throw new Error('Server storage is not set up. In Vercel → Storage → add Upstash Redis, then redeploy.');
    }
    throw new Error(msg);
  }
  return data;
}

async function apiGet() {
  const res = await fetch(API);
  return parseApiResponse(res);
}

async function apiSaveConfig(config, members) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'saveConfig', payload: { config, members } })
  });
  const data = await parseApiResponse(res);
  return data.data;
}

async function apiSaveBill(monthKey, electricity) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'saveBill', payload: { monthKey, electricity } })
  });
  const data = await parseApiResponse(res);
  return data.data;
}

async function apiResetBills() {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'resetBills' })
  });
  const data = await parseApiResponse(res);
  return data.data;
}

async function apiResetBillMonth(monthKey) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'resetBillMonth', payload: { monthKey } })
  });
  const data = await parseApiResponse(res);
  return data.data;
}

async function apiResetAll() {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'resetAll' })
  });
  const data = await parseApiResponse(res);
  return data.data;
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

function getYearData() {
  const year = new Date().getFullYear();
  const months = [];
  const totals = [];
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

    if (bd && bd.electricity != null && bd.locked) {
      const c = calcBill(d);
      if (c) {
        totals.push(c.collectedTotal);
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
        continue;
      }
    }
    totals.push(0);
    actualTotals.push(0);
    elecs.push(0);
    gaps.push(0);
  }

  return { months, totals, actualTotals, elecs, gaps, memberTotals, categoryTotals, yearGap: gaps.reduce((s, g) => s + g, 0) };
}

/* ── Navigation ── */
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link, .bottom-nav__btn').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll(`[data-page="${page}"]`).forEach(n => n.classList.add('active'));

  const titles = { dashboard: 'Dashboard', bills: 'Monthly Bills', settings: 'Configuration' };
  document.getElementById('topbarTitle').textContent = titles[page] || page;

  closeSidebar();

  if (page === 'dashboard') renderDashboard().catch(err => console.error(err));
  if (page === 'bills') renderBillsPage();
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
  const calc = calcBill(now);
  const bd = STATE.bills[monthKey(now)];

  document.getElementById('currentMonthChip').textContent = monthLabel(now);

  if (!bd || !bd.locked || bd.electricity == null) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
      <h3>No bill for ${monthLabel(now)}</h3>
      <p>Enter the electricity bill under <strong>Monthly Bills</strong> to unlock calculations.</p>
    </div>`;
    return;
  }

  if (!calc || !calc.results.length) {
    grid.innerHTML = `<div class="empty"><h3>Add members in Configuration</h3></div>`;
    return;
  }

  grid.innerHTML = calc.results.map((r, i) => {
    const pct = Math.round(r.total / calc.collectedTotal * 100);
    return `
      <div class="member-card" style="animation-delay:${i * 0.1}s">
        <div class="member-card__head">
          ${avatarHTML({ photo: r.photo, name: r.name }, i, 'lg')}
          <div>
            <div class="member-card__name">${r.name}</div>
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
        label: 'Collected',
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

  // 5. Member comparison
  destroyChart('compare');
  const ctx5 = document.getElementById('chartCompare').getContext('2d');
  const memberMonthly = STATE.members.map(m => {
    const arr = [];
    for (let mo = 0; mo < 12; mo++) {
      const d = new Date(new Date().getFullYear(), mo, 1);
      const bd = STATE.bills[monthKey(d)];
      if (bd && bd.locked) {
        const c = calcBill(d);
        const r = c?.results.find(x => x.id === m.id);
        arr.push(r ? r.total : 0);
      } else arr.push(0);
    }
    return arr;
  });

  charts.compare = new Chart(ctx5, {
    type: 'bar',
    data: {
      labels: yd.months,
      datasets: STATE.members.map((m, i) => ({
        label: m.name,
        data: memberMonthly[i],
        backgroundColor: memberColor(i) + '99',
        borderColor: memberColor(i),
        borderWidth: 1,
        borderRadius: 4
      }))
    },
    options: {
      ...defaults,
      plugins: {
        ...defaults.plugins,
        legend: { display: true, position: window.innerWidth < 640 ? 'bottom' : 'top', labels: { color: ct.tick, font: { size: 11 }, boxWidth: 10 } }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: ct.tick, font: { size: 10 } } },
        y: { stacked: true, grid: { color: ct.grid }, ticks: { color: ct.tick, callback: v => '৳' + v.toLocaleString() } }
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
  const calc = calcBill(currentBillMonth);

  if (!bd.locked || bd.electricity == null) {
    body.innerHTML = `
      <div class="elec-gate">
        <div class="elec-gate__icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <h3>Electricity Bill Required</h3>
        <p>Enter the electricity amount for <strong>${monthLabel(currentBillMonth)}</strong>. Once saved, it cannot be changed without a reset.</p>
        <div class="elec-gate__row">
          <input class="form-input" type="number" id="elecInput" placeholder="e.g. 910" min="1"/>
          <button class="btn btn-primary" id="submitElecBtn">Submit & Lock</button>
        </div>
      </div>`;

    document.getElementById('submitElecBtn').onclick = async () => {
      const v = parseFloat(document.getElementById('elecInput').value);
      if (!v || v <= 0) { toast('Enter a valid amount', 'error'); return; }
      try {
        STATE = await apiSaveBill(key, v);
        toast(`Electricity ${fmt(v)} locked for ${monthLabel(currentBillMonth)}`);
        updateMonthDisplay();
      } catch (e) {
        toast(e.message, 'error');
      }
    };
    return;
  }

  if (!calc || !calc.results.length) {
    body.innerHTML = `<div class="empty"><h3>No members configured</h3><p>Add members in Configuration first.</p></div>`;
    return;
  }

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
              <div class="member-card__name">${r.name}</div>
              <div class="member-card__total" style="font-size:26px">${fmt(r.total)}</div>
            </div>
          </div>
          ${Object.entries(r.breakdown).map(([k, v]) => `
            <div class="bill-row">
              <span class="bill-row__label">${BILL_LABELS[k]}</span>
              <span class="bill-row__value">${fmt(v)}</span>
            </div>
          `).join('')}
          <div class="bill-row" style="border-top:1px solid rgba(45,212,191,0.22);margin-top:8px;padding-top:12px">
            <span class="bill-row__label" style="font-weight:700;color:var(--text)">Total Payable</span>
            <span class="bill-row__value" style="color:var(--accent);font-size:16px">${fmt(r.total)}</span>
          </div>
        </div>
      `).join('')}
    </div>
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
            ${calc.results.map(r => `<td>${fmt(r.total)}</td>`).join('')}
          </tr>
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
}

/* ── Settings ── */
function renderSettings() {
  populateResetMonthPickers();
  renderMembersConfig();
  renderFixedCostsConfig();
  renderRentSplitConfig();
}

function renderMembersConfig() {
  tempMembers = JSON.parse(JSON.stringify(STATE.members));
  const grid = document.getElementById('membersGrid');
  grid.innerHTML = tempMembers.map((m, i) => `
    <div class="member-config" id="mc-${m.id}">
      <button class="member-config__remove" data-id="${m.id}" title="Remove">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div style="display:flex;align-items:center;gap:16px">
        <div class="photo-upload" id="photo-${m.id}">
          ${m.photo ? `<img src="${m.photo}" id="img-${m.id}"/>` : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}
          <div class="photo-upload__badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg></div>
          <input type="file" accept="image/*" data-id="${m.id}" class="photo-input"/>
        </div>
        <div style="flex:1">
          <label class="form-label">Member Name</label>
          <input class="form-input" value="${m.name}" id="name-${m.id}" style="font-family:var(--font-head);font-weight:700"/>
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.photo-input').forEach(input => {
    input.addEventListener('change', e => {
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
      const id = btn.dataset.id;
      confirmDialog('Remove member?', 'They will be removed from all future calculations.', () => {
        tempMembers = tempMembers.filter(m => m.id !== id);
        renderMembersConfig();
        toast('Member removed — save to apply');
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
          <div class="toggle ${hasFixed ? 'on' : ''}" id="tgl-${m.id}" data-id="${m.id}"></div>
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

  document.querySelectorAll('.toggle').forEach(tgl => {
    tgl.addEventListener('click', () => {
      tgl.classList.toggle('on');
      const id = tgl.dataset.id;
      const on = tgl.classList.contains('on');
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

  document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      ['members', 'costs', 'rent', 'danger'].forEach(id => {
        document.getElementById(`tab-${id}`).style.display = id === tab.dataset.tab ? 'block' : 'none';
      });
    });
  });

  document.getElementById('addMemberBtn').addEventListener('click', () => {
    document.getElementById('newMemberName').value = '';
    document.getElementById('newMemberPreview').style.display = 'none';
    document.getElementById('newMemberFile').value = '';
    newMemberPhoto = '';
    document.getElementById('addModal').classList.add('open');
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

  document.getElementById('saveMembersBtn').addEventListener('click', async () => {
    tempMembers.forEach(m => {
      const inp = document.getElementById(`name-${m.id}`);
      if (inp) m.name = inp.value.trim() || m.name;
    });
    try {
      STATE = await apiSaveConfig(STATE.config, tempMembers);
      toast('Members saved to server');
      renderTopbar();
      renderRentSplitConfig();
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  document.getElementById('saveCostsBtn').addEventListener('click', async () => {
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

  document.getElementById('saveRentBtn').addEventListener('click', async () => {
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

  document.getElementById('resetBillsBtn').addEventListener('click', () => {
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

  document.getElementById('resetMonthBtn').addEventListener('click', () => {
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

  document.getElementById('resetAllBtn').addEventListener('click', () => {
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
  const chartReady = ensureChartJs().catch(err => {
    console.error(err);
    return null;
  });

  try {
    STATE = await apiGet();
    document.getElementById('syncDot').classList.remove('offline');
  } catch (e) {
    document.getElementById('syncDot').classList.add('offline');
    toast(e.message.includes('Redis') || e.message.includes('storage') ? e.message : 'Could not connect to server — check deployment', 'error');
    STATE = {
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

  await chartReady;

  document.getElementById('loader').classList.add('hidden');
  try {
    await renderDashboard();
  } catch (e) {
    console.error(e);
    toast('Charts could not load — check your connection', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init().catch(console.error));
} else {
  init().catch(console.error);
}
