# localhost — Apartment Bill Splitter

A simple web app that helps flatmates split monthly apartment bills fairly.  
Enter your rent, gas, water, electricity, maid, Wi‑Fi, and service charges — the app calculates how much each person pays and saves everything to a server so you don't lose data when you refresh the page.

Built with plain **HTML**, **CSS**, and **JavaScript** (no React, no build step). Deploy it free on **Vercel**.

---

## Table of contents

1. [What does this app do?](#what-does-this-app-do)
2. [Who is it for?](#who-is-it-for)
3. [Features](#features)
4. [How the bill math works](#how-the-bill-math-works)
5. [Project folder structure](#project-folder-structure)
6. [What you need before starting](#what-you-need-before-starting)
7. [Run the app on your computer (local setup)](#run-the-app-on-your-computer-local-setup)
8. [How to use the app](#how-to-use-the-app)
9. [Deploy to the internet (Vercel)](#deploy-to-the-internet-vercel)
10. [How data is saved](#how-data-is-saved)
11. [API reference (for developers)](#api-reference-for-developers)
12. [Troubleshooting](#troubleshooting)
13. [Tech stack](#tech-stack)

---

## What does this app do?

Imagine three friends share an apartment. Every month they get bills for:

- Rent, gas, water, and building service charge  
- Electricity (changes every month)  
- House maid and Wi‑Fi (fixed amounts)

**localhost** answers one question: *"How much should each person pay this month?"*

It also gives you:

- A **dashboard** with charts and yearly summaries  
- A **monthly bills** page to enter electricity and see the split  
- A **configuration** page to set members, fixed costs, and custom rent amounts  

All numbers are stored on a server — not just in your browser — so everyone sees the same data.

---

## Who is it for?

- Flatmates who want a fair, transparent bill split  
- Anyone managing a shared apartment in Bangladesh (uses ৳ Taka)  
- Beginners who want a real project they can run, edit, and deploy  

You do **not** need to know React or Node.js frameworks. Basic computer skills (installing Node.js, opening a terminal) are enough to run it locally.

---

## Features

| Feature | Description |
|--------|-------------|
| **Dashboard** | Stats, 6 charts, per-member breakdown for the current month |
| **Monthly Bills** | Navigate month by month, enter electricity, view locked bills |
| **Configuration** | Add members with photos, set fixed costs, custom rent splits |
| **Dark / Light theme** | Toggle in the top bar; preference saved in your browser |
| **Mobile friendly** | Sidebar menu + bottom navigation on phones |
| **Server persistence** | Data survives refresh; shared when deployed |
| **Locked bills** | Once a month's electricity is saved, it cannot be edited (only reset) |
| **Rounding gap chart** | Shows extra money collected from rounding splits up |

---

## How the bill math works

This is the most important section. Read it carefully if you want to trust the numbers.

### Step 1 — Fixed bucket (Rent + Gas + Water + Service)

These four costs are grouped into one **fixed bucket**.

Example default values:

| Item | Amount |
|------|--------|
| Rent | ৳20,000 |
| Gas | ৳1,080 |
| Water | ৳1,000 |
| Service | ৳2,000 |
| **Fixed bucket total** | **৳24,080** |

#### Custom fixed amounts (Rent Split)

In **Configuration → Rent Split**, you can give a member a **fixed contribution** toward this bucket.

Example: Parvez pays a fixed **৳6,500** (covers his share of rent + gas + water + service combined).

What's left in the bucket is split **equally** among members who do **not** have a fixed amount:

```
Remaining = Fixed bucket − Sum of all fixed contributions
Each free member pays = Remaining ÷ number of free members
```

With Parvez at ৳6,500 and two others (Shimanto, Tauqir) sharing the rest:

```
Remaining = 24,080 − 6,500 = 17,580
Each of Shimanto & Tauqir = 17,580 ÷ 2 = 8,790
```

### Step 2 — Variable costs (split equally with ceiling rounding)

These three costs are split **equally among all members**, rounded **up** to the nearest whole Taka:

| Cost | Split rule |
|------|------------|
| Electricity | `ceil(electricity ÷ number of members)` per person |
| House Maid | `ceil(maid ÷ number of members)` per person |
| Wi‑Fi | `ceil(wifi ÷ number of members)` per person |

**Ceiling** means always round up. Example with 3 members and electricity ৳910:

```
910 ÷ 3 = 303.33… → each person pays ৳304
Collected from electricity = 304 × 3 = ৳912
Actual bill = ৳910
Gap = 912 − 910 = ৳2 extra (rounding gap)
```

### Step 3 — Total per person

Each member's monthly total:

```
Total = Fixed bucket share + Electricity share + Maid share + Wi‑Fi share
```

### Full example — June 2026 (3 members, Parvez fixed ৳6,500, electricity ৳910)

| Member | Fixed bucket | Electricity | Maid | Wi‑Fi | **Total** |
|--------|-------------|-------------|------|-------|-----------|
| Shimanto | 8,790 | 304 | 834 | 267 | **10,195** |
| Tauqir | 8,790 | 304 | 834 | 267 | **10,195** |
| Parvez | 6,500 | 304 | 834 | 267 | **7,905** |
| **Collected** | | | | | **28,295** |

```
Actual bill = 24,080 + 910 + 2,500 + 800 = 28,290
Rounding gap = 28,295 − 28,290 = ৳5
```

The dashboard **Rounding Gap** chart tracks this small surplus each month.

---

## Project folder structure

```
Localhost/
├── index.html              ← Main app page (open this in the browser)
├── favicon.ico             ← Tab icon in the browser
├── package.json            ← Node.js project info and scripts
├── dev-server.mjs          ← Local development server
├── vercel.json             ← Vercel deployment settings
│
├── api/
│   └── store.js            ← Server API (saves/loads data)
│
├── assets/
│   ├── css/
│   │   ├── fonts.css       ← Self-hosted fonts
│   │   └── sharespace.css  ← All app styles
│   ├── js/
│   │   └── sharespace.js   ← All app logic (calculations, charts, UI)
│   ├── fonts/              ← Font files (.woff2)
│   └── images/
│       └── Logo.png        ← App logo
│
└── data/
    └── store.json          ← Local data file (created when you run locally)
                              Note: this file is git-ignored
```

---

## What you need before starting

### 1. Node.js (required for local development)

Node.js lets you run the small server on your computer.

1. Go to [https://nodejs.org](https://nodejs.org)  
2. Download the **LTS** version (recommended)  
3. Install it with default options  
4. Open **Terminal** (Mac/Linux) or **PowerShell** (Windows)  
5. Check it works:

```bash
node --version
npm --version
```

You should see version numbers like `v22.x.x` and `10.x.x`.

### 2. A code editor (optional but helpful)

[Visual Studio Code](https://code.visualstudio.com/) is free and works well.

### 3. Git (optional, needed for Vercel deploy)

Download from [https://git-scm.com](https://git-scm.com) if you want to push to GitHub and deploy.

---

## Run the app on your computer (local setup)

Follow these steps exactly if you are new to this.

### Step 1 — Open the project folder in terminal

**Windows (PowerShell):**

```powershell
cd "C:\Users\YourName\Downloads\Localhost"
```

Replace `YourName` with your actual Windows username and adjust the path if your folder is elsewhere.

**Mac / Linux:**

```bash
cd ~/Downloads/Localhost
```

### Step 2 — Install dependencies

This downloads one small package (`@upstash/redis`) used when deployed. Run once:

```bash
npm install
```

Wait until it finishes. You should see a `node_modules` folder appear.

### Step 3 — Start the local server

```bash
npm run dev
```

You should see:

```
ShareSpace running at http://localhost:3456
```

### Step 4 — Open the app

Open your browser and go to:

**http://localhost:3456**

You should see the localhost dashboard with a pulse loading animation, then the main app.

### Step 5 — Stop the server

In the terminal, press **Ctrl + C** to stop.

### Where is my data saved locally?

When running locally, all data is saved to:

```
data/store.json
```

This file is created automatically the first time you use the app. It is listed in `.gitignore` so your personal bill data is not accidentally pushed to GitHub.

---

## How to use the app

### Navigation

| Screen | How to open |
|--------|-------------|
| **Dashboard** | Sidebar or bottom nav → Home |
| **Monthly Bills** | Sidebar or bottom nav → Bills |
| **Configuration** | Sidebar or bottom nav → Settings |

On mobile, tap the **☰ menu** button (top left) to open the sidebar.

### Dashboard

- **Stat cards** — Fixed bucket total, member count, bills logged this year, rounding gap  
- **Charts** — Monthly totals, per-person contributions, category breakdown, electricity trend, member comparison, rounding gap  
- **Member Bills** — Each person's share for the current month (only if that month has a saved electricity bill)  

### Monthly Bills

1. Use **← →** arrows to pick a month  
2. Enter the **electricity bill amount** for that month  
3. Click **Save & Calculate**  
4. The bill becomes **locked** — you cannot change it without resetting  

You'll see:

- Summary pills (house rent total, electricity, actual bill, collected, gap)  
- Per-member cards with a full breakdown  
- A table with every expense row  

### Configuration

#### Members tab

- Add flatmates with name and optional profile photo  
- Click **Save Members** to store on the server  

#### Fixed Costs tab

Set your apartment address, floor badge, and monthly fixed amounts:

- Rent, Gas, Water, Service, Maid, Wi‑Fi  

Click **Save Fixed Costs**.

#### Rent Split tab

- Toggle **Fixed amount** for a member who pays a set sum toward the fixed bucket  
- Enter their amount (e.g. Parvez → ৳6,500)  
- Other members share the remainder equally  

Click **Save Rent Split**.

#### Danger Zone tab

- **Unlock Single Month** — Pick month + year to remove one locked electricity bill  
- **Reset all bills** — Clears all electricity entries; keeps members and settings  
- **Reset everything** — Wipes all data back to defaults  

---

## Deploy to the internet (Vercel)

Deploying puts your app online so flatmates can open it from any device.

### Step 1 — Push to GitHub

1. Create a new repository on [GitHub](https://github.com)  
2. In your project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2 — Import into Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign up (free)  
2. Click **Add New → Project**  
3. Import your GitHub repository  
4. Leave build settings as default (no build command needed)  
5. Click **Deploy**  

Your app will be live at a URL like `https://your-project.vercel.app`.

### Step 3 — Add Redis for permanent storage (important)

On Vercel, the filesystem is temporary. You need a database to keep data.

1. In your Vercel project, go to **Storage** or **Marketplace**  
2. Add **Upstash Redis** (free tier available)  
3. Connect it to your project — Vercel automatically sets these environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Redeploy the project  

Without Redis, data may reset when the server restarts.

### Step 4 — Verify

Open your Vercel URL. The green dot in the sidebar footer means the server is connected. A yellow dot means offline/fallback mode.

---

## How data is saved

The app talks to `/api/store` — a small serverless function.

| Environment | Where data lives |
|-------------|------------------|
| **Local** (`npm run dev`) | `data/store.json` on your computer |
| **Vercel (with Redis)** | Upstash Redis cloud database |
| **Vercel (no Redis)** | Not reliable — do not use in production |

### Data shape (simplified)

```json
{
  "config": {
    "aptName": "Your address",
    "aptFloor": "7TH FLOOR",
    "fixedCosts": { "rent": 20000, "gas": 1080, ... },
    "rentSplit": { "m3": 6500 }
  },
  "members": [
    { "id": "m1", "name": "Shimanto", "photo": "" }
  ],
  "bills": {
    "2026-06": { "electricity": 910, "locked": true, "savedAt": "..." }
  }
}
```

Month keys use format **`YYYY-MM`** (e.g. `2026-06` for June 2026).

---

## API reference (for developers)

Base URL: `/api/store`

| Method | Purpose |
|--------|---------|
| `GET` | Load all data |
| `POST` | Perform an action (see below) |
| `PUT` | Replace entire store (advanced) |
| `DELETE` | Delete all stored data |

### POST actions

**saveConfig** — Update settings or members

```json
{
  "action": "saveConfig",
  "payload": {
    "config": { "aptName": "...", "fixedCosts": { ... }, "rentSplit": { ... } },
    "members": [ { "id": "m1", "name": "...", "photo": "" } ]
  }
}
```

**saveBill** — Save and lock a month's electricity

```json
{
  "action": "saveBill",
  "payload": { "monthKey": "2026-06", "electricity": 910 }
}
```

**resetBillMonth** — Unlock one month's electricity bill

```json
{ "action": "resetBillMonth", "payload": { "monthKey": "2026-06" } }
```

**resetBills** — Clear all monthly bills

```json
{ "action": "resetBills" }
```

**resetAll** — Reset everything to defaults

```json
{ "action": "resetAll" }
```

---

## Troubleshooting

### "Could not connect to server" toast

- **Local:** Make sure `npm run dev` is running and you open `http://localhost:3456`  
- **Vercel:** Check that Redis is connected and the project redeployed  

### Charts not showing / "Chart is not defined"

- Hard refresh the page (**Ctrl + Shift + R** or **Cmd + Shift + R**)  
- Check your internet connection — Chart.js loads from a CDN  
- If offline, charts won't render (the rest of the app still works)  

### Page shows "Not found" at http://localhost:3456/

- Restart the dev server: `npm run dev`  
- Make sure you're in the correct project folder  

### "read-only file system" or saves fail on Vercel

This means **Upstash Redis is not connected**. Vercel's server cannot write files — it needs a database.

1. Open your project at [vercel.com](https://vercel.com) (e.g. [localhostbill.vercel.app](https://localhostbill.vercel.app/))  
2. Go to **Storage** → **Create Database** → **Upstash Redis**  
3. Connect it to your project (this sets `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`)  
4. **Redeploy** the project (Deployments → ⋯ → Redeploy)  

After that, saving bills, photos, and settings will work.

### Bill won't save — "Bill already locked"

- That month's electricity was already saved on the server  
- Go to **Configuration → Danger Zone → Unlock Single Month**, pick the month and year, click **Unlock Month**  
- Or use **Reset Bills** to clear all months at once  

### Sidebar doesn't open on mobile

- Tap the **☰** button in the top-left corner  
- Hard refresh if you recently updated the app  

### Fonts or logo look wrong

- Fonts are self-hosted in `assets/fonts/` — no internet needed  
- Logo is at `assets/images/Logo.png`  
- Favicon is `favicon.ico` in the project root  

### Data disappeared after deploy

- You likely didn't connect Redis on Vercel  
- Follow [Step 3 in Deploy](#step-3--add-redis-for-permanent-storage-important)  

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Charts | [Chart.js 4](https://www.chartjs.org/) (CDN) |
| Fonts | Figtree & Plus Jakarta Sans (self-hosted) |
| Local server | Node.js (`dev-server.mjs`) |
| Production API | Vercel Serverless Functions |
| Database | Upstash Redis (production) / JSON file (local) |

No webpack, no npm build step, no framework — just open `index.html` through the dev server or Vercel.

---

## License

Private project for personal / flatmate use. Fonts are under SIL Open Font License.

---

**Made for shared living — split fairly, track clearly.**
