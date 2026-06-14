# LocalHost — Apartment Bill Splitter

A full-stack web app that helps flatmates split monthly apartment bills fairly. Track rent, utilities, meals, and personal expenses — with role-based access, locked monthly bills, and a PostgreSQL-backed database so everyone sees the same data.

**v2.0** is built with **Next.js 14** (App Router), **PostgreSQL**, and **Prisma**. Deploy free on [Vercel](https://vercel.com) with a cloud database from [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app).

---

## Table of contents

1. [What does this app do?](#what-does-this-app-do)
2. [Who is it for?](#who-is-it-for)
3. [Features](#features)
4. [How the bill math works](#how-the-bill-math-works)
5. [Project structure](#project-structure)
6. [Prerequisites](#prerequisites)
7. [Local setup](#local-setup)
8. [How to use the app](#how-to-use-the-app)
9. [Deploy to Vercel](#deploy-to-vercel)
10. [Environment variables](#environment-variables)
11. [API overview](#api-overview)
12. [SEO & Google indexing](#seo--google-indexing)
13. [Troubleshooting](#troubleshooting)
14. [Tech stack](#tech-stack)

---

## What does this app do?

Imagine a group of friends sharing an apartment in Dhaka. Every month they deal with:

- **Fixed costs** — rent, gas, water, building service charge  
- **Variable costs** — electricity (entered each month)  
- **Optional costs** — house maid, Wi‑Fi (not everyone opts in)  
- **Meals** — shared shopping pool split by meal count  
- **Personal expenses** — individual spending with carry-forward fairness  

**LocalHost** answers: *"How much should each person pay this month?"*

It also provides:

- **Apartment registration** — each mess/flat signs up independently  
- **Member login** — Admin, Bill Manager, and Member roles  
- **Dashboard** — yearly charts, stats, and current-month breakdowns  
- **Meal management** — weekly checklist, shopping pool, per-meal cost  
- **Backup & restore** — export/import full apartment data as JSON  

All data lives in **PostgreSQL** — not in the browser — so it survives refreshes and works across devices.

---

## Who is it for?

- Flatmates who want a fair, transparent bill split  
- Mess and bachelor-flat managers in Bangladesh (uses ৳ Taka)  
- Groups of 2–15 people sharing one apartment  
- Developers who want a deployable Next.js + Prisma reference project  

Basic skills needed: install Node.js, run terminal commands, and (for production) set up a free PostgreSQL database.

---

## Features

| Feature | Description |
|--------|-------------|
| **Apartment auth** | Register once per apartment; sign in with name or registration ID |
| **Member roles** | Admin, Bill Manager, Member — with permission-based editing |
| **Dashboard** | Stat cards, 6+ charts, member bill cards for the current month |
| **Monthly bills** | Enter electricity, lock month, view per-member breakdown |
| **Meal management** | Weekly checklist, shopping pool, finalize meals for billing |
| **Expense tracker** | Personal spending with monthly carry-forward |
| **Fixed + optional costs** | Configurable line items; optional costs with per-member opt-in |
| **Rent split** | Custom fixed contributions; remainder split among free members |
| **Bank reference** | Bill Manager account shown via eye icon for manual transfers |
| **Password reset** | Email-based reset links (SMTP or Resend) |
| **Backup / restore** | Full JSON export; transactional import |
| **Dark / light theme** | Toggle in top bar; saved in `localStorage` |
| **Mobile responsive** | Sidebar + bottom navigation on phones |
| **SEO** | Sitemap, robots.txt, Open Graph, JSON-LD for Google |

---

## How the bill math works

### Step 1 — Fixed bucket

Rent, gas, water, and service charge form one **fixed bucket** (plus any custom in-bucket costs).

Default example:

| Item | Amount |
|------|--------|
| Rent | ৳20,000 |
| Gas | ৳1,080 |
| Water | ৳1,000 |
| Service | ৳2,000 |
| **Fixed bucket total** | **৳24,080** |

**Rent split:** Members can have a **fixed contribution** (e.g. Parvez → ৳6,500). The remainder is divided among **free members** using `Math.round`:

```
Remaining = Fixed bucket − Sum of fixed contributions
Free share = round(Remaining ÷ number of free members)
```

### Step 2 — Optional costs

Costs like house maid (৳2,500) and Wi‑Fi (৳800) are split **only among opted-in members**, using ceiling rounding:

```
Per head = ceil(optional cost ÷ opted-in count)
```

### Step 3 — Variable costs

Electricity is split equally with **ceiling** rounding:

```
Per head = ceil(electricity ÷ active members)
```

### Step 4 — Meal costs

```
Per meal cost = total shopping pool ÷ total meal count
Member meal cost = ceil(per meal cost × member's meal count)
```

Meal costs are included in the monthly bill after the Bill Manager **finalizes** meals for that month.

### Step 5 — Total per member

```
Total = fixed share + optional share + electricity + meals ± adjustments
```

Adjustments (lend/borrow) apply only to **locked** months. Member totals are floored at ৳0.

### Full example — June 2026

| Member | Fixed | Maid | Wi‑Fi | Elec | Meals | **Total** |
|--------|-------|------|-------|------|-------|-----------|
| Shimanto | 8,790 | 834 | 400 | 304 | 4,001 | **14,329** |
| Tauqir | 8,790 | 834 | 400 | 304 | 3,667 | **13,995** |
| Parvez | 6,500 | 834 | 0 | 304 | 3,334 | **10,972** |

The **rounding gap** (collected total minus actual bill) comes from ceiling splits and is tracked on the dashboard.

See `BRD.md` Section 12 for the full worked example.

---

## Project structure

```
Localhost/
├── app/                        ← Next.js App Router
│   ├── (app)/                  ← Authenticated pages
│   │   ├── dashboard/
│   │   ├── bills/
│   │   ├── meals/
│   │   ├── expenses/
│   │   └── settings/
│   ├── api/                    ← Route handlers (REST API)
│   ├── reset-password/[token]/
│   ├── layout.tsx              ← Root layout + SEO metadata
│   ├── page.tsx                ← Preloader + apartment auth
│   ├── sitemap.ts
│   └── robots.ts
├── components/                 ← React UI (sidebar, charts, modals)
├── lib/                        ← Auth, calculations, validation, Prisma
├── prisma/
│   ├── schema.prisma           ← Database schema
│   └── migrations/
├── public/assets/              ← Fonts, images, CSS (from original design)
├── BRD.md                      ← Full business requirements (v2.0)
├── package.json
├── vercel.json
└── .env.local.example
```

Legacy v1 files (`index.html`, `api/store.js`, `dev-server.mjs`) are kept for reference but are **not used** by v2.

---

## Prerequisites

1. **Node.js 20 LTS** — [nodejs.org](https://nodejs.org)  
2. **PostgreSQL 15+** — local install, Docker, or a free cloud tier  
3. **Git** — for pushing to GitHub and deploying on Vercel  

Verify Node.js:

```bash
node --version   # v20.x or v22.x
npm --version
```

---

## Local setup

### 1. Clone and install

```bash
cd Localhost
npm install
```

### 2. Configure environment

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

At minimum you need `DATABASE_URL`, `DIRECT_DATABASE_URL`, `JWT_SECRET`, and `ENCRYPTION_KEY`.

Generate an encryption key (32 bytes as hex):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run database migrations

```bash
npx prisma migrate dev
```

Or push schema without migration history:

```bash
npm run db:push
```

### 4. Start the dev server

```bash
npm run dev
```

Open **http://localhost:3000**

### 5. First use

1. Wait for the preloader animation  
2. Click **Register** and create your apartment  
3. You are logged in as **Admin** and redirected to **Configuration**  
4. Add members (default password: `1234`)  
5. Set fixed costs, optional costs, and rent split  
6. Sign in as a member from the sidebar to edit bills and expenses  

### Optional: Prisma Studio

Browse the database in a GUI:

```bash
npm run db:studio
```

---

## How to use the app

### Navigation

| Page | Path | Description |
|------|------|-------------|
| Home / Auth | `/` | Apartment sign in or register |
| Dashboard | `/dashboard` | Stats, charts, current month bills |
| Monthly Bills | `/bills` | Enter electricity, view locked breakdown |
| Meals | `/meals` | Weekly checklist, shopping, summary |
| Expenses | `/expenses` | Personal spending + carry-forward |
| Settings | `/settings` | Members, costs, backup, danger zone |

On mobile, use the **bottom nav** or tap **☰** for the sidebar.

### Roles

| Role | Can do |
|------|--------|
| **Admin** | Everything — config, members, roles, backup, danger zone |
| **Bill Manager** | Lock bills, meal checklist, shopping, adjustments |
| **Member** | View all data; edit own expenses; view bank details |

Click **Sign in to edit** in the sidebar to log in as a member.

### Monthly bills workflow

1. Go to **Bills** → pick the month  
2. Enter the **electricity** amount  
3. Click **Save & Lock** (Admin or Bill Manager)  
4. View per-member cards and summary pills  
5. Add **adjustments** (lend/borrow) after locking if needed  

### Meal workflow

1. Go to **Meals** → toggle meal slots each week  
2. Members add **shopping** items to the pool  
3. Per-meal cost updates automatically  
4. Bill Manager clicks **Finalize Meals** for the month  
5. Meal costs appear on the locked monthly bill  

### Configuration tabs

- **Members** — add flatmates, assign roles, send password reset  
- **Fixed Costs** — rent, gas, water, service, custom items  
- **Optional** — maid, Wi‑Fi, etc. with opt-in matrix  
- **Rent Split** — fixed contributions per member  
- **Meal Settings** — meals per day, names, week start day  
- **Backup** — export / import JSON  
- **Danger Zone** — unlock month, reset bills/meals/all  

---

## Deploy to Vercel

### 1. Create a PostgreSQL database

Use one of:

- [Neon](https://neon.tech) (recommended — free tier, built-in pooler)  
- [Supabase](https://supabase.com)  
- [Railway](https://railway.app)  

Copy both the **pooled** connection string (`DATABASE_URL`) and the **direct** URL (`DIRECT_DATABASE_URL`).

### 2. Push to GitHub

```bash
git add .
git commit -m "LocalHost v2.0 — Next.js rebuild"
git push -u origin main
```

### 3. Import into Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**  
2. Import your GitHub repository  
3. Framework preset: **Next.js** (auto-detected)  
4. Build command: `prisma generate && next build` (set in `vercel.json`)  
5. Add all [environment variables](#environment-variables)  
6. Click **Deploy**  

### 4. Run production migration (once)

After the first deploy, run migrations against your production database:

```bash
npx prisma migrate deploy
```

Or add a one-time deploy hook / run locally with production `DATABASE_URL`.

### 5. Verify

Open your Vercel URL (e.g. `https://your-app.vercel.app`). Register an apartment and confirm data persists after refresh.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL URL (use pooler in production) |
| `DIRECT_DATABASE_URL` | Yes | Direct PostgreSQL URL (for migrations) |
| `JWT_SECRET` | Yes | 64+ character random string for JWT signing |
| `ENCRYPTION_KEY` | Yes | 64-char hex string (32 bytes) for NID/bank encryption |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public app URL, e.g. `https://your-app.vercel.app` |
| `RESEND_API_KEY` | Email* | Resend API key (alternative to SMTP) |
| `SMTP_HOST` | Email* | SMTP host for password reset |
| `SMTP_PORT` | Email* | SMTP port (587 or 465) |
| `SMTP_USER` | Email* | SMTP username |
| `SMTP_PASS` | Email* | SMTP password |
| `SMTP_FROM` | Email* | Sender address, e.g. `noreply@yourdomain.com` |

\*At least one email provider (Resend or SMTP) is needed for password reset emails. Without it, resets can still be done manually by Admin.

---

## API overview

All routes are under `/api/`. Apartment session cookie (`apt_session`) is required for most routes. Mutating routes also require member session (`member_session`).

### Authentication

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/apartment/register` | Register apartment |
| POST | `/api/auth/apartment/login` | Apartment sign in |
| POST | `/api/auth/apartment/logout` | Sign out apartment |
| GET | `/api/auth/apartment/info` | Current apartment data |
| POST | `/api/auth/member/login` | Member sign in |
| POST | `/api/auth/member/logout` | Member sign out |
| GET | `/api/auth/member/verify` | Verify member session |
| POST | `/api/auth/member/request-reset` | Send password reset email |
| POST | `/api/auth/member/reset-password` | Set new password via token |

### Data

| Area | Routes |
|------|--------|
| Members | `GET/POST /api/members`, `PATCH/DELETE /api/members/[id]` |
| Config | `GET /api/config`, `PATCH /api/config/*` |
| Bills | `GET /api/bills`, `POST /api/bills/[monthKey]/lock`, `GET .../calculation` |
| Meals | `GET/PATCH /api/meals/[monthKey]/checklist`, `POST .../shopping`, `POST .../finalize` |
| Expenses | `GET/POST /api/expenses/[monthKey]` |
| Dashboard | `GET /api/dashboard/year-summary`, `GET .../current-month` |
| Backup | `GET /api/backup/export`, `POST /api/backup/restore` |
| Danger | `POST /api/danger/reset-bills`, `reset-meals`, `reset-all` |

Full specification: see `BRD.md` Section 10.

Month keys use format **`YYYY-MM`** (e.g. `2026-06`).

---

## SEO & Google indexing

LocalHost ships with search-engine basics out of the box:

- **Metadata** — title, description, Open Graph, Twitter cards in root layout  
- **Sitemap** — `/sitemap.xml` (auto-generated)  
- **Robots** — `/robots.txt` allows public pages, blocks `/api/`  
- **JSON-LD** — `WebApplication` structured data for rich results  

### Submit to Google Search Console

1. Deploy to Vercel and set `NEXT_PUBLIC_SITE_URL` to your live URL  
2. Go to [Google Search Console](https://search.google.com/search-console)  
3. Add your property (URL prefix)  
4. Verify ownership (HTML tag or DNS)  
5. Submit sitemap: `https://your-app.vercel.app/sitemap.xml`  

Authenticated app pages (`/dashboard`, `/bills`, etc.) require login and are not meant for public indexing. The landing page at `/` is the primary SEO entry point.

---

## Troubleshooting

### Build fails on Vercel — Prisma client not found

Ensure `postinstall` runs `prisma generate` (already in `package.json`). Redeploy after connecting env vars.

### "Invalid apartment credentials" on login

Check apartment name or registration ID and password. After 5 failed attempts, login is rate-limited for 15 minutes.

### Request timeout / slow loading on Vercel

This app uses serverless functions + PostgreSQL. Timeouts are usually caused by **database connection issues**, not your internet:

1. **`DATABASE_URL` must use the pooler URL** (Neon: hostname contains `-pooler`; Supabase: port `6543` transaction pooler)  
2. **`DIRECT_DATABASE_URL` is for migrations only** — never use it as `DATABASE_URL` on Vercel  
3. Add `&connection_limit=1` to the pooler URL (already applied automatically in production by the app)  
4. **Region alignment** — `vercel.json` deploys to `sin1` (Singapore). Create your Neon/Supabase database in **ap-southeast-1** or nearby to avoid cross-region latency  
5. After changing env vars, **redeploy** so all functions pick up the new connection string  

If timeouts persist, check Vercel → Project → Logs for `P1001`, `P1002`, or `P2024` (database connection / pool timeout).

### Database connection errors

- Confirm `DATABASE_URL` uses the **pooler** URL on Vercel (Neon: `-pooler` in hostname)  
- Use `DIRECT_DATABASE_URL` only for migrations, not runtime  
- Ensure `?sslmode=require` is in the connection string for cloud DBs  

### Password reset email not sent

Configure `RESEND_API_KEY` or all `SMTP_*` variables. Check Vercel function logs. Admin can set passwords directly from Settings → Members.

### Bill won't save — "Bill already locked"

Go to **Settings → Danger Zone → Unlock Single Month**, or unlock via API `DELETE /api/bills/[monthKey]/lock` (Admin only).

### Charts empty on dashboard

Charts need at least one **locked** month with electricity entered. Lock a bill on the Bills page first.

### Member default password

New members get password **`1234`**. They should change it via email reset or ask Admin to set a new password.

### Prisma migrate errors locally

```bash
npx prisma migrate reset   # WARNING: wipes local DB
npx prisma migrate dev
```

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Vanilla CSS (original `localhost.css` theme) |
| Charts | Chart.js 4 + react-chartjs-2 |
| Fonts | Figtree & Plus Jakarta Sans (self-hosted) |
| Backend | Next.js Route Handlers |
| ORM | Prisma 5 |
| Database | PostgreSQL 15+ |
| Auth | JWT (jose) + HTTP-only cookies |
| Passwords | bcrypt (cost 12) |
| Encryption | AES-256-GCM (NID, bank data) |
| Validation | Zod |
| Email | Nodemailer / Resend |
| Hosting | Vercel |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Run production server locally |
| `npm run db:migrate` | Create/apply migrations (dev) |
| `npm run db:push` | Push schema without migration files |
| `npm run db:studio` | Open Prisma Studio GUI |

---

## License

Private project for personal / flatmate use. Fonts are under SIL Open Font License.

---

**Made for shared living — split fairly, track clearly.**
