# Business Requirements Document (BRD)

## **localhost — Apartment Bill Splitter**

---

| Field | Details |
|---|---|
| **Document Title** | Business Requirements Document — localhost Apartment Bill Splitter |
| **Version** | 1.0 |
| **Status** | Final — Ready for Development |
| **Date** | June 2026 |
| **Prepared By** | Product Owner / Shimanto Rehman |
| **Currency** | Bangladeshi Taka (৳) |
| **Target Region** | Bangladesh (primary); adaptable globally |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Objectives](#2-business-objectives)
3. [Scope](#3-scope)
4. [Stakeholders](#4-stakeholders)
5. [User Personas](#5-user-personas)
6. [Functional Requirements](#6-functional-requirements)
   - 6.1 [Authentication & Role Management](#61-authentication--role-management)
   - 6.2 [Member Management](#62-member-management)
   - 6.3 [Fixed Cost Configuration](#63-fixed-cost-configuration)
   - 6.4 [Rent Split Configuration](#64-rent-split-configuration)
   - 6.5 [Monthly Bill Entry & Locking](#65-monthly-bill-entry--locking)
   - 6.6 [Bill Calculation Engine](#66-bill-calculation-engine)
   - 6.7 [Adjustments (Lend / Borrow)](#67-adjustments-lend--borrow)
   - 6.8 [Expense Tracker](#68-expense-tracker)
   - 6.9 [Dashboard & Analytics](#69-dashboard--analytics)
   - 6.10 [Data Backup & Restore](#610-data-backup--restore)
   - 6.11 [Danger Zone (Admin Reset Controls)](#611-danger-zone-admin-reset-controls)
   - 6.12 [UI & Navigation](#612-ui--navigation)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Data Model](#8-data-model)
9. [API Specification](#9-api-specification)
10. [Business Rules](#10-business-rules)
11. [Calculation Logic (Detailed)](#11-calculation-logic-detailed)
12. [Tech Stack](#12-tech-stack)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Security Requirements](#14-security-requirements)
15. [Constraints & Assumptions](#15-constraints--assumptions)
16. [Acceptance Criteria](#16-acceptance-criteria)
17. [Glossary](#17-glossary)

---

## 1. Executive Summary

**localhost** is a lightweight, web-based apartment bill-splitting application designed for small groups of flatmates (typically 2–10 people) sharing a residential apartment. It eliminates the manual, error-prone process of splitting utility bills by automating all calculations and persisting results to a shared server — so every flatmate sees the same numbers regardless of which device or browser they use.

The application handles two distinct financial domains:

1. **Household Bills** — Monthly recurring apartment costs (rent, electricity, gas, water, maid, Wi-Fi, service charge) split according to a configurable algorithm.
2. **Personal Expenses** — Individual out-of-pocket spending tracked per flatmate per month, with a carry-forward equity mechanism that ensures fairness over time.

The system is currently tailored for the Bangladeshi market (৳ Taka) but is architecturally currency-agnostic. It is built with zero front-end framework dependencies (plain HTML, CSS, JavaScript) and deploys for free on Vercel with Upstash Redis for persistent cloud storage.

---

## 2. Business Objectives

| # | Objective | Success Metric |
|---|---|---|
| BO-1 | Eliminate manual bill calculation errors among flatmates | Zero disputed bill amounts per month |
| BO-2 | Provide a single source of truth for all shared apartment costs | All flatmates read from the same server-stored data |
| BO-3 | Prevent unauthorized editing of locked monthly bills | Bills locked after entry cannot be changed without Admin approval |
| BO-4 | Track personal expense fairness across months | Carry-forward equity balance visible at all times |
| BO-5 | Support flexible, non-equal rent contributions | At least one member can pay a fixed rent amount; others split the remainder |
| BO-6 | Provide historical and trend analytics | Dashboard charts covering the full calendar year |
| BO-7 | Enable easy deployment and maintenance | App deployable in under 15 minutes via Vercel with no build step |
| BO-8 | Support data recovery | Full backup export/import with no data loss |

---

## 3. Scope

### 3.1 In Scope

- Multi-member apartment bill splitting with configurable fixed and variable costs
- Role-based access control (Admin, Bill Manager, Member)
- Monthly bill entry with an immutable locking mechanism
- Per-member adjustment entries (lend/borrow) by the Bill Manager
- Personal expense tracker with categorical tagging and monthly carry-forward
- Real-time dashboard with six Chart.js visualizations
- Dark/Light theme toggle with persisted user preference
- Mobile-responsive layout (sidebar + bottom navigation)
- Data backup (export to JSON) and restore (import from JSON)
- Vercel serverless deployment with Upstash Redis for cloud persistence
- Local development mode with file-system JSON storage

### 3.2 Out of Scope

- Payment gateway or actual money transfer integrations
- Email/SMS notifications or reminders
- Multi-apartment / multi-group tenancy
- Native mobile applications (iOS/Android)
- Multi-currency support (current version is ৳ Taka only)
- Custom reporting or PDF export beyond JSON backup
- Two-factor authentication
- Audit log / change history

---

## 4. Stakeholders

| Role | Description | Interest |
|---|---|---|
| **Admin** | Primary flatmate who sets up and manages the app | Full control over configuration, members, bills, and data |
| **Bill Manager** | Flatmate responsible for entering monthly bills | Saves and manages monthly electricity bills and adjustments |
| **Member** | All flatmates including Admin and Bill Manager | View their calculated share; track and enter personal expenses |
| **Developer / Deployer** | Person who deploys and maintains the app | Technical setup, environment variables, Redis connection |

---

## 5. User Personas

### Persona A — The Admin (e.g., Shimanto)
- Sets up the apartment configuration once
- Manages who can do what (assigns Bill Manager role)
- Resets locked months when mistakes happen
- Exports backups periodically
- Default password: `1234` (must be changed)

### Persona B — The Bill Manager (e.g., Tauqir)
- Receives the monthly electricity bill notification
- Enters the electricity amount each month and locks it
- Adds lend/borrow adjustments for one-off transactions
- Cannot change configuration or other settings

### Persona C — The Regular Member (e.g., Parvez)
- Views his monthly bill breakdown
- Logs his personal expenses (food, groceries, etc.)
- Cannot edit bills or configuration
- Has a fixed rent contribution different from others

---

## 6. Functional Requirements

---

### 6.1 Authentication & Role Management

#### 6.1.1 Login System

| ID | Requirement |
|---|---|
| AUTH-01 | Each member has a password stored as a SHA-256 hash (salted with `AUTH_SECRET` environment variable) |
| AUTH-02 | Default password for all new members is `1234` |
| AUTH-03 | Sessions are token-based (64-character random hex string), stored server-side |
| AUTH-04 | Sessions expire after 7 days of inactivity |
| AUTH-05 | On login, the client receives a session token stored in `sessionStorage` under key `localhost-auth` |
| AUTH-06 | The login UI is a modal with a visual member-bubble selector (animated petal layout) and a password input field |
| AUTH-07 | On page load, the client automatically verifies any stored session token against the server |
| AUTH-08 | Logging out revokes the token server-side and clears session storage |
| AUTH-09 | If session is invalid or expired, the client silently clears the stored auth and shows the "Sign in to edit" prompt in the sidebar |
| AUTH-10 | All mutating API actions require a valid session token passed in the request payload as `token` |

#### 6.1.2 Roles

| Role | Permissions |
|---|---|
| **Admin** | All actions: saveConfig, saveBill, saveAdjustments, resetBillMonth, resetBills, resetAll, exportBackup, restoreBackup, resetPassword, saveExpenses (for any member) |
| **Bill Manager** | saveBill, saveAdjustments, saveExpenses (own expenses only) |
| **Member** | Read-only access to all data; saveExpenses (own expenses only) |

- `config.adminId` and `config.billManagerId` store the member IDs of the Admin and Bill Manager respectively
- A single member can hold both Admin and Bill Manager roles simultaneously
- The first registered member defaults to both roles
- Roles are assigned by the Admin via the Configuration page

#### 6.1.3 Password Management

| ID | Requirement |
|---|---|
| PWD-01 | Admin can reset any member's password via the Members tab in Configuration |
| PWD-02 | Password must be at least 4 characters |
| PWD-03 | Passwords are never sent back to the client (stripped in `sanitizeForClient`) |

---

### 6.2 Member Management

| ID | Requirement |
|---|---|
| MEM-01 | Admin can add new members with a name and optional profile photo |
| MEM-02 | Profile photo is uploaded as a Base64 data URL (inline image) |
| MEM-03 | If no photo is provided, the system generates a color-coded avatar with the member's initials |
| MEM-04 | Members appear in all bill calculations, dashboard, bills pages, and login modal |
| MEM-05 | Up to 5 member avatars are displayed in the top bar avatar stack |
| MEM-06 | The Members tab shows a card grid; each card has: photo upload, name input, role badge, and password reset button |
| MEM-07 | Saving members preserves all existing password hashes (passwords are not reset on member save) |
| MEM-08 | New members added via save automatically get the default password (`1234`) |
| MEM-09 | Member IDs follow the pattern `m1`, `m2`, `m3` ... and are generated at creation time |

---

### 6.3 Fixed Cost Configuration

The Admin sets the following monthly fixed costs in **Configuration → Fixed Costs**:

| Field | Description | Example Default |
|---|---|---|
| **Apartment Address** | Display label for the address in the top bar | `H-38, R-13, Nikunja-2, Dhaka-1229` |
| **Floor / Unit Badge** | Short badge shown in the top bar | `7TH FLOOR` |
| **Base House Rent (৳)** | Monthly rent amount | ৳20,000 |
| **Gas Bill (৳)** | Monthly gas utility | ৳1,080 |
| **Water Bill (৳)** | Monthly water utility | ৳1,000 |
| **Service Charge (৳)** | Building service charge | ৳2,000 |
| **House Maid (৳)** | Monthly maid/cleaning cost | ৳2,500 |
| **WiFi Bill (৳)** | Monthly internet cost | ৳800 |

> **Business Rule:** Rent, Gas, Water, and Service form a single "Fixed Bucket" and are split via the Rent Split logic. Maid and WiFi are split equally among all members using ceiling rounding. Electricity is entered monthly and also split equally using ceiling rounding.

| ID | Requirement |
|---|---|
| CFG-01 | All fixed cost fields are numeric inputs |
| CFG-02 | Changes require Admin role; non-admins see the form in read-only mode |
| CFG-03 | Configuration is saved to the server immediately on click of "Save Fixed Costs" |
| CFG-04 | Fixed costs apply globally to all future and recalculated months |
| CFG-05 | Config changes do not retroactively modify locked bills (locked bills store a snapshot at calculation time) |

---

### 6.4 Rent Split Configuration

The Rent Split feature allows certain members to pay a **custom fixed amount** toward the Fixed Bucket (Rent + Gas + Water + Service combined), with the remaining balance split equally among all other members.

| ID | Requirement |
|---|---|
| RSP-01 | Each member can be toggled to "Fixed amount" mode in Configuration → Rent Split |
| RSP-02 | When "Fixed amount" is enabled, the admin enters the member's contribution to the fixed bucket |
| RSP-03 | Members without a fixed amount share the remainder equally |
| RSP-04 | A member with a fixed rent contribution still pays their equal share of Electricity, Maid, and WiFi |
| RSP-05 | The Rent Split grid shows all members with toggle + amount input |
| RSP-06 | Saving updates `config.rentSplit` on the server |
| RSP-07 | Setting `rentSplit[memberId] = null` or removing the key returns that member to equal-share mode |

---

### 6.5 Monthly Bill Entry & Locking

#### 6.5.1 Bill Entry

| ID | Requirement |
|---|---|
| BILL-01 | The Monthly Bills page shows one month at a time with previous/next navigation arrows |
| BILL-02 | The user enters the electricity bill amount for the displayed month |
| BILL-03 | On clicking "Save & Calculate", the bill is submitted to the server via the `saveBill` API action |
| BILL-04 | Only Admin or Bill Manager can save a bill; others are prompted to sign in |
| BILL-05 | Bills are stored under the key format `YYYY-MM` (e.g., `2026-06` for June 2026) |

#### 6.5.2 Bill Locking

| ID | Requirement |
|---|---|
| LOCK-01 | Once saved, a bill is immediately locked (`locked: true`) |
| LOCK-02 | A locked bill cannot be edited through the regular UI |
| LOCK-03 | Attempting to save a bill for a locked month returns HTTP 403 from the API |
| LOCK-04 | A locked month displays its full bill breakdown (summary pills, per-member cards, expense table) in read-only mode |
| LOCK-05 | The timestamp of when the bill was locked (`savedAt`) is stored with the bill |

#### 6.5.3 Bill Display (Locked Month)

When a month's electricity bill is locked, the page displays:

- **Summary Pills Row:** House Rent Total, Electricity amount, Actual Bill (total of all costs), Collected amount (from all members), Rounding Gap
- **Per-Member Cards:** One card per member showing fixed bucket share, electricity share, maid share, WiFi share, any adjustments, and the final total
- **Expense Table:** A full row-by-row table of every bill component

---

### 6.6 Bill Calculation Engine

This section documents the exact calculation algorithm that the system must implement.

#### Step 1 — Fixed Bucket

```
fixedBucket = rent + gas + water + service
```

For each member:
- If `rentSplit[memberId]` is set → their fixed bucket share = that value
- Otherwise → they are a "free member" and share the remainder equally

```
fixedContributions = sum of all rentSplit values
remaining = max(0, fixedBucket - fixedContributions)
freeShare = round(remaining / count_of_free_members)
```

> **Note:** The free share uses `Math.round`, not ceiling — this applies only to the fixed bucket portion.

#### Step 2 — Variable Costs (Ceiling Per-Head Split)

```
elecPerHead = ceil(electricity / memberCount)
maidPerHead = ceil(maid / memberCount)
wifiPerHead  = ceil(wifi  / memberCount)
```

All three use ceiling (`Math.ceil`) rounding.

#### Step 3 — Total Per Member

```
memberTotal = fixedBucketShare + elecPerHead + maidPerHead + wifiPerHead
```

#### Step 4 — Summary Totals

```
collectedTotal = sum of all memberTotal values
actualBill     = fixedBucket + electricity + maid + wifi
gap            = collectedTotal - actualBill    // always ≥ 0 due to ceiling rounding
houseRentTotal = fixedBucket + electricity
```

#### Step 5 — Adjustments (post-calculation)

If any adjustments exist for the month:
```
adjustedTotal = max(0, memberTotal + sum(lend amounts) - sum(borrow amounts))
```

| ID | Requirement |
|---|---|
| CALC-01 | Calculation is always performed client-side in real time from the stored data |
| CALC-02 | The server stores raw inputs only (electricity amount, member list, rent split config) |
| CALC-03 | Calculation result is never stored; it is derived on each page render |
| CALC-04 | If electricity is null for a month, `calcBill()` returns null (no calculation) |
| CALC-05 | If member count is 0, `calcBill()` returns null |

---

### 6.7 Adjustments (Lend / Borrow)

Adjustments allow the Bill Manager to record one-off financial corrections for a member within a locked month — for example, one flatmate lent money to another for a shared purchase.

| ID | Requirement |
|---|---|
| ADJ-01 | Adjustments are stored under `bills[monthKey].adjustments[memberId]` as an array |
| ADJ-02 | Each adjustment has: `id`, `type` (`lend` or `borrow`), `label` (description), `amount` |
| ADJ-03 | A `lend` adjustment **increases** the member's total (they are owed money back) |
| ADJ-04 | A `borrow` adjustment **decreases** the member's total (they borrowed from the pool) |
| ADJ-05 | Only the Bill Manager or Admin can add/remove adjustments |
| ADJ-06 | Adjustments can only be added to a **locked** month |
| ADJ-07 | Saving adjustments uses the `saveAdjustments` API action |
| ADJ-08 | Adjustments are displayed on both the Monthly Bills page and the Dashboard member cards |
| ADJ-09 | The member's final displayed total is the base total plus the net adjustment delta, floored at 0 |

---

### 6.8 Expense Tracker

The Expenses module is a personal spending tracker separate from the household bills. It tracks individual out-of-pocket purchases per flatmate and calculates a fairness-based carry-forward balance.

#### 6.8.1 Expense Entry

| ID | Requirement |
|---|---|
| EXP-01 | Each member can add expense items to their own list for any month |
| EXP-02 | Admin can edit any member's expense list |
| EXP-03 | Each expense item has: `id`, `name` (max 80 chars), `price` (positive number), `category`, `createdAt` |
| EXP-04 | Supported categories: Food, Groceries, Utilities, Transport, Household, Entertainment, Other |
| EXP-05 | Items with empty name or zero/negative price are filtered out on save |
| EXP-06 | Expenses are stored under `expenses[YYYY-MM].items[memberId]` as an array |
| EXP-07 | The Expenses page shows one month at a time with previous/next navigation |
| EXP-08 | For each member, the page shows their expense items, monthly spend, carry-in from prior month, grand total, and excess over the minimum spender |

#### 6.8.2 Expense Carry-Forward Logic

The expense engine implements a carry-forward equity mechanism:

```
For each member in month M:
  monthSpend    = sum of all item prices in that month
  carriedIn     = forwardOut from month M-1 (or 0 if first month)
  grandTotal    = monthSpend + carriedIn

base            = min(grandTotal) across all members
extra           = max(0, grandTotal - base)    per member
forwardOut      = extra                         (carries into next month)
```

> **Interpretation:** The member who spent the least sets the "base." Every other member's excess carries forward to the next month, ensuring they will eventually reconcile. The member at the base contributes nothing extra that month.

| ID | Requirement |
|---|---|
| EXP-09 | The carry-forward chain is computed recursively from the earliest recorded expense month |
| EXP-10 | Carry-in is always computed dynamically (not stored); it is derived from prior months' data |
| EXP-11 | The Expenses page displays a Member Expense Comparison chart for the current year |
| EXP-12 | Category-level breakdown (color-coded) is shown per member per month |

---

### 6.9 Dashboard & Analytics

The Dashboard is the default landing page and provides a full year's financial overview.

#### 6.9.1 Stat Cards

Four stat cards are displayed at the top of the Dashboard:

| Card | Value Shown | Sub-Label |
|---|---|---|
| Fixed Bucket / Month | Total of Rent + Gas + Water + Service + Maid + WiFi | "Rent + Gas + Water + Service" |
| Active Members | Count of registered flatmates | "Flatmates registered" |
| Bills This Year | Count of locked monthly bills | "YYYY · N months logged" |
| Year Gap (Ceiling) | Total rounding gap for the year | "Collected ৳X vs bill ৳Y" |

#### 6.9.2 Charts

Six Chart.js charts are rendered on the Dashboard:

| Chart ID | Title | Type | Data |
|---|---|---|---|
| `chartMonthly` | Monthly Total Cost | Bar (stacked) | Bills + Expenses combined per month |
| `chartPerson` | Per-Person Contribution | Bar | Cumulative per-member bill total for the year |
| `chartCategory` | Bill Category Breakdown | Doughnut | Yearly totals by category (rent, gas, water, service, electricity, maid, wifi) |
| `chartElec` | Electricity Trend | Line | Monthly electricity amounts for the year |
| `chartCompare` | Member Expense Contributions | Bar (grouped) | Monthly expense spending per flatmate |
| `chartGap` | Rounding Gap | Bar | Monthly ceiling-rounding surplus |

| ID | Requirement |
|---|---|
| DASH-01 | Charts use Chart.js 4 (loaded from CDN or local bundle) |
| DASH-02 | Charts adapt to dark/light theme (background, grid lines, ticks, tooltip colors) |
| DASH-03 | On window resize, charts are resized via ResizeObserver |
| DASH-04 | Legend positions switch between `right` (desktop) and `bottom` (mobile) automatically |
| DASH-05 | If Chart.js is unavailable (offline), charts are gracefully skipped without crashing the app |
| DASH-06 | Charts are re-rendered on theme toggle |

#### 6.9.3 Member Bills (Current Month)

Below the charts, the Dashboard shows per-member bill cards for the current month:
- Only shown if the current month's bill is locked
- Shows avatar, name, Bill Manager badge (if applicable), monthly total, percentage share, progress bar, and full breakdown
- Adjustments are shown inline on each card

---

### 6.10 Data Backup & Restore

| ID | Requirement |
|---|---|
| BAK-01 | Admin can export a full backup via Configuration → Backup → Export |
| BAK-02 | The backup is a JSON file containing: `app: "localhost"`, `version: 1`, `exportedAt` timestamp, and the full `data` object (config, members, bills, expenses, sessions) |
| BAK-03 | The file is auto-named `localhost-backup-YYYY-MM-DD.json` |
| BAK-04 | Admin can restore from a previously exported JSON file via Configuration → Backup → Restore |
| BAK-05 | Restore replaces all current server data with the backup contents |
| BAK-06 | Restore validates that the backup has required fields (`config`, `members` array, `bills` object) and returns HTTP 400 if invalid |
| BAK-07 | Restore action requires Admin role |
| BAK-08 | After restore, the UI reloads fresh data from the server |

---

### 6.11 Danger Zone (Admin Reset Controls)

| Action | Description | Requirement |
|---|---|---|
| **Unlock Single Month** | Removes one month's locked bill so it can be re-entered | Admin selects month + year from dropdowns; `resetBillMonth` API action |
| **Reset All Bill Data** | Clears all monthly bills; preserves members and configuration | `resetBills` API action; requires confirm dialog |
| **Reset Everything** | Wipes all data and reverts to factory default state | `resetAll` API action; requires confirm dialog; members, config, and bills are all cleared |

| ID | Requirement |
|---|---|
| DZ-01 | All Danger Zone actions require Admin role |
| DZ-02 | All Danger Zone actions require a confirmation dialog before execution |
| DZ-03 | Reset All recreates the default state with seeded default members and Parvez's rent split |
| DZ-04 | The month/year selectors for Unlock Single Month show a range from 2 years prior to 2 years future |

---

### 6.12 UI & Navigation

#### 6.12.1 Pages / Sections

| Page | Route (Hash) | Description |
|---|---|---|
| Dashboard | `#` (default) | Overview, stats, charts, current-month member cards |
| Monthly Bills | `#bills` | Month navigator, electricity entry, locked bill view |
| Expenses | `#expenses` | Personal expense tracker, month navigator |
| Configuration | `#settings` | Members, Fixed Costs, Rent Split, Backup, Danger Zone tabs |

#### 6.12.2 Navigation Components

| ID | Requirement |
|---|---|
| NAV-01 | Desktop: Left sidebar with logo, nav links, and authenticated user info at the bottom |
| NAV-02 | Mobile: Collapsible sidebar (triggered by ☰ menu button) with a backdrop overlay |
| NAV-03 | Mobile: Bottom navigation bar with four icon-button tabs (Home, Bills, Expenses, Settings) |
| NAV-04 | Active page is highlighted in both sidebar and bottom nav |
| NAV-05 | Page state is synced to the URL hash for deep linking |
| NAV-06 | Closing the sidebar on navigation is automatic |

#### 6.12.3 Theme

| ID | Requirement |
|---|---|
| THEME-01 | Dark mode is the default theme |
| THEME-02 | User can toggle Dark/Light via the sun/moon button in the top bar |
| THEME-03 | Theme preference is persisted to `localStorage` under key `localhost-theme` |
| THEME-04 | Theme switch causes charts to re-render with updated color palette |
| THEME-05 | CSS uses `data-theme="dark"` and `data-theme="light"` attribute on `<html>` |

#### 6.12.4 Loading Screen

| ID | Requirement |
|---|---|
| LOAD-01 | A full-screen loader overlay is shown on initial page load |
| LOAD-02 | The loader features: three concentric animated pulse rings, the app logo at the center, an animated ECG-style wave SVG, the app name "localhost", a "Preparing your dashboard" sub-label, and a progress bar |
| LOAD-03 | The loader is dismissed once data is fetched from the server and the UI is ready |

#### 6.12.5 Toast Notifications

| ID | Requirement |
|---|---|
| TOAST-01 | Toast messages slide in from the bottom right |
| TOAST-02 | Success toasts show a teal dot; error toasts show a red dot |
| TOAST-03 | Toasts auto-dismiss after 3.2 seconds |
| TOAST-04 | Multiple toasts stack vertically |

#### 6.12.6 Modals

| Modal | Trigger | Contents |
|---|---|---|
| Add Member | "Add Member" button in Members tab | Name input, photo upload, Cancel / Add Member buttons |
| Login | "Sign in" prompt / protected action | Member bubble selector, password input, Cancel / Sign in buttons |
| Confirm | Danger Zone actions | Custom title and description, Cancel / Confirm buttons |

#### 6.12.7 Top Bar

| Element | Description |
|---|---|
| ☰ Menu button | Toggles sidebar on mobile |
| Page title | Current page name |
| Address sub-label | Apartment address from config |
| Theme toggle | Sun/moon icon switch |
| Floor badge | Short floor/unit badge from config |
| Avatar stack | First 5 member avatars, overlapping |

#### 6.12.8 Sidebar Footer

| Element | Description |
|---|---|
| **Not logged in** | Avatar placeholder + "Sign in to edit" link |
| **Logged in** | Member avatar, name, sync dot, role label, "Sign out" button |
| Sync dot | Green = server connected; Yellow/off = offline/fallback mode |

---

## 7. Non-Functional Requirements

### 7.1 Performance

| ID | Requirement |
|---|---|
| PERF-01 | Initial page load (including data fetch) must complete in under 3 seconds on a standard broadband connection |
| PERF-02 | Bill calculation for any month must compute in under 50ms (client-side) |
| PERF-03 | Charts must render within 500ms after data is available |
| PERF-04 | Chart resize must not cause layout jank; use `requestAnimationFrame` |

### 7.2 Reliability

| ID | Requirement |
|---|---|
| REL-01 | If the server is unavailable, the app displays a yellow sync dot and an error toast |
| REL-02 | The app must not crash if Chart.js fails to load — charts are optional UI elements |
| REL-03 | All API calls must have error handling that surfaces friendly messages to the user |
| REL-04 | Data written to Redis must be atomic per request (no partial writes) |

### 7.3 Usability

| ID | Requirement |
|---|---|
| USE-01 | The application must be fully functional on screens 320px wide and above |
| USE-02 | All interactive elements must have accessible `aria-label` attributes |
| USE-03 | All form inputs must have visible labels |
| USE-04 | Color is never the sole means of conveying information (icons are paired with color) |
| USE-05 | The login bubble layout adapts dynamically based on the number of members |

### 7.4 Security

| ID | Requirement |
|---|---|
| SEC-01 | Passwords are hashed with SHA-256 (HMAC salted with `AUTH_SECRET`) before storage |
| SEC-02 | Session tokens are 32-byte cryptographically random hex strings |
| SEC-03 | Password hashes and session tokens are **never** returned to the client |
| SEC-04 | `AUTH_SECRET` must be set as a production environment variable; the dev default (`localhost-dev-secret-change-me`) is explicitly not suitable for production |
| SEC-05 | All mutating API endpoints require a valid session token |
| SEC-06 | CORS headers allow all origins (suitable for private/intranet use; tighten for public deployment) |

### 7.5 Maintainability

| ID | Requirement |
|---|---|
| MAINT-01 | No build step required; the app runs directly from source files |
| MAINT-02 | All application logic is in a single file (`assets/js/localhost.js`) for easy review |
| MAINT-03 | All styles are in `assets/css/localhost.css` with a clear CSS custom property (variable) design system |
| MAINT-04 | Fonts are self-hosted (`assets/fonts/`) — no external font dependency |
| MAINT-05 | The API is a single serverless function (`api/store.js`) handling all actions via a `action` dispatch pattern |

---

## 8. Data Model

### 8.1 Top-Level Store Object

```json
{
  "config": { ... },
  "members": [ ... ],
  "bills": { ... },
  "expenses": { ... },
  "sessions": { ... }
}
```

### 8.2 Config Object

```json
{
  "aptName": "H-38, R-13, Nikunja-2, Dhaka-1229",
  "aptFloor": "7TH FLOOR",
  "fixedCosts": {
    "rent":    20000,
    "gas":     1080,
    "water":   1000,
    "service": 2000,
    "maid":    2500,
    "wifi":    800
  },
  "rentSplit": {
    "m3": 6500
  },
  "billManagerId": "m1",
  "adminId": "m1"
}
```

### 8.3 Member Object

```json
{
  "id": "m1",
  "name": "Shimanto",
  "photo": "",
  "passwordHash": "<sha256-hex-string>"
}
```

> `passwordHash` is **never** sent to the client. It is stripped in `sanitizeForClient()`.

### 8.4 Bills Map

```json
{
  "2026-06": {
    "electricity": 910,
    "locked": true,
    "savedAt": "2026-06-01T12:00:00.000Z",
    "adjustments": {
      "m2": [
        {
          "id": "adj_abc123",
          "type": "lend",
          "label": "Bought groceries",
          "amount": 500
        }
      ]
    }
  }
}
```

### 8.5 Expenses Map

```json
{
  "2026-06": {
    "items": {
      "m1": [
        {
          "id": "exp_xyz789",
          "name": "Chicken",
          "price": 400,
          "category": "Food",
          "createdAt": "2026-06-05T10:00:00.000Z"
        }
      ]
    }
  }
}
```

### 8.6 Sessions Map

```json
{
  "<64-char-hex-token>": {
    "memberId": "m1",
    "expires": "2026-06-17T12:00:00.000Z"
  }
}
```

> Sessions are **never** sent to the client. Stripped in `sanitizeForClient()`.

### 8.7 Backup Envelope

```json
{
  "app": "localhost",
  "version": 1,
  "exportedAt": "2026-06-10T12:00:00.000Z",
  "data": { /* full store including sessions and passwordHash */ }
}
```

---

## 9. API Specification

**Base URL:** `/api/store`

All requests and responses use `Content-Type: application/json`.

### 9.1 GET `/api/store`

Returns the full sanitized store (no sessions, no password hashes).

**Response:** `200 OK`
```json
{
  "config": { ... },
  "members": [ ... ],
  "bills": { ... },
  "expenses": { ... }
}
```

---

### 9.2 POST `/api/store`

All write operations are POST requests with an `action` field and optional `payload`.

**Request Body:**
```json
{
  "action": "<action-name>",
  "payload": {
    "token": "<session-token-or-null>",
    ...
  }
}
```

#### Actions

| Action | Required Role | Description |
|---|---|---|
| `login` | None | Authenticate a member and return a session token |
| `logout` | Session | Revoke the current session token |
| `verifySession` | Session | Validate a stored token and return refreshed auth object |
| `resetPassword` | Admin | Set a new password hash for any member |
| `saveConfig` | Admin | Update `config` and/or `members` (preserving passwords) |
| `saveBill` | Admin or Bill Manager | Save and lock a month's electricity bill |
| `saveAdjustments` | Bill Manager (or Admin) | Update adjustments for a locked month |
| `resetBillMonth` | Admin | Unlock and delete one month's bill |
| `resetBills` | Admin | Clear all monthly bills |
| `resetAll` | Admin | Wipe entire store and return to default state |
| `exportBackup` | Admin | Return full data backup including sessions and password hashes |
| `restoreBackup` | Admin | Replace store with a validated backup payload |
| `saveExpenses` | Session (own) / Admin (any) | Save expense items for a member in a month |

#### Action Payloads

**login**
```json
{ "memberId": "m1", "password": "1234" }
```

**saveConfig**
```json
{
  "config": { "aptName": "...", "fixedCosts": { ... }, "rentSplit": { ... } },
  "members": [ { "id": "m1", "name": "Shimanto", "photo": "" } ]
}
```

**saveBill**
```json
{ "monthKey": "2026-06", "electricity": 910 }
```

**saveAdjustments**
```json
{
  "monthKey": "2026-06",
  "adjustments": {
    "m2": [ { "id": "adj_abc", "type": "lend", "label": "Groceries", "amount": 500 } ]
  }
}
```

**resetBillMonth**
```json
{ "monthKey": "2026-06" }
```

**resetPassword**
```json
{ "targetMemberId": "m2", "newPassword": "newpass" }
```

**saveExpenses**
```json
{
  "monthKey": "2026-06",
  "memberId": "m1",
  "items": [
    { "id": "exp_1", "name": "Chicken", "price": 400, "category": "Food", "createdAt": "..." }
  ]
}
```

**restoreBackup**
```json
{
  "backup": {
    "app": "localhost",
    "version": 1,
    "exportedAt": "...",
    "data": { ... }
  }
}
```

### 9.3 Error Responses

| HTTP Code | Code Field | Meaning |
|---|---|---|
| 400 | — | Invalid request body or missing required fields |
| 400 | `INVALID_BACKUP` | Backup file missing required fields |
| 401 | `AUTH_REQUIRED` | No valid session; must log in |
| 401 | `AUTH_FAILED` | Wrong member ID or password |
| 403 | `FORBIDDEN` | Authenticated but insufficient role |
| 403 | — | Bill already locked |
| 404 | — | Member or bill not found |
| 405 | — | HTTP method not allowed |
| 503 | `STORAGE_NOT_CONFIGURED` | Redis not connected on Vercel |
| 500 | — | Unhandled server error |

---

## 10. Business Rules

| ID | Rule |
|---|---|
| BR-01 | A month's bill can only be saved once. After saving, it is locked. |
| BR-02 | Once locked, a bill can only be unlocked by the Admin via Danger Zone → Unlock Single Month. |
| BR-03 | Adjustments can only be applied to locked months. |
| BR-04 | A member's bill total after adjustments cannot go below ৳0. |
| BR-05 | The maid, WiFi, and electricity costs are always split equally among ALL members regardless of rent split configuration. |
| BR-06 | Only the Fixed Bucket (Rent + Gas + Water + Service) is subject to the custom rent split. |
| BR-07 | The free members' share of the fixed bucket uses `Math.round` (not ceiling). |
| BR-08 | Per-head splits for electricity, maid, and WiFi use `Math.ceil` (ceiling rounding). |
| BR-09 | Any rounding gap (collected minus actual) is tracked and displayed; it is not distributed back. |
| BR-10 | Member passwords are never reset when the member list is saved — only via explicit Admin password reset. |
| BR-11 | The first member in the list is the default Admin and Bill Manager on a fresh install. |
| BR-12 | Expense carry-forward is directional: only members who spent MORE than the minimum carry their excess to the next month. |
| BR-13 | Expense carry-forward is computed from the first month that has any expense data; months before that have zero carry-in. |
| BR-14 | Bills and expenses are independent modules; they are displayed together on the Dashboard but calculated separately. |
| BR-15 | All data is stored centrally on the server; there is no offline-first or local-only mode in the production deployment. |
| BR-16 | The local development mode stores data in `data/store.json`; this file is excluded from git. |

---

## 11. Calculation Logic (Detailed)

### 11.1 Worked Example — June 2026

**Configuration:**
- Members: Shimanto (m1), Tauqir (m2), Parvez (m3)
- Rent: ৳20,000 | Gas: ৳1,080 | Water: ৳1,000 | Service: ৳2,000
- Maid: ৳2,500 | WiFi: ৳800
- Parvez's rentSplit: ৳6,500 (fixed)
- Electricity for June: ৳910

**Step 1 — Fixed Bucket:**
```
fixedBucket = 20,000 + 1,080 + 1,000 + 2,000 = 24,080
fixedContributions = 6,500   (Parvez only)
remaining = 24,080 - 6,500 = 17,580
freeShare = round(17,580 / 2) = 8,790   (Shimanto and Tauqir)
```

**Step 2 — Variable Costs:**
```
elecPerHead = ceil(910 / 3) = ceil(303.33) = 304
maidPerHead = ceil(2,500 / 3) = ceil(833.33) = 834
wifiPerHead  = ceil(800  / 3) = ceil(266.67) = 267
```

**Step 3 — Per-Member Totals:**

| Member | Fixed Bucket | Electricity | Maid | WiFi | Total |
|---|---|---|---|---|---|
| Shimanto | 8,790 | 304 | 834 | 267 | **10,195** |
| Tauqir | 8,790 | 304 | 834 | 267 | **10,195** |
| Parvez | 6,500 | 304 | 834 | 267 | **7,905** |

**Step 4 — Summary:**
```
collectedTotal = 10,195 + 10,195 + 7,905 = 28,295
actualBill     = 24,080 + 910 + 2,500 + 800 = 28,290
gap            = 28,295 - 28,290 = ৳5
```

### 11.2 Expense Carry-Forward Example

**Month 1 (May 2026):**

| Member | Spent | CarryIn | Grand Total | Base | Extra | Forward |
|---|---|---|---|---|---|---|
| Shimanto | 1,500 | 0 | 1,500 | — | — | — |
| Tauqir | 800 | 0 | 800 | 800 | — | — |
| Parvez | 1,200 | 0 | 1,200 | — | — | — |

```
base = 800 (Tauqir)
Shimanto extra = 1,500 - 800 = 700  → forwards ৳700
Tauqir   extra = 0                  → forwards ৳0
Parvez   extra = 1,200 - 800 = 400  → forwards ৳400
```

**Month 2 (June 2026):**

| Member | Spent | CarryIn | Grand Total |
|---|---|---|---|
| Shimanto | 600 | 700 | 1,300 |
| Tauqir | 900 | 0 | 900 |
| Parvez | 300 | 400 | 700 |

```
base = 700 (Parvez)
Shimanto extra = 1,300 - 700 = 600
Tauqir   extra = 900   - 700 = 200
Parvez   extra = 0
```

---

## 12. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend — Structure** | HTML5 | Single `index.html` with all pages rendered inline |
| **Frontend — Style** | Vanilla CSS3 | Custom properties (tokens), dark/light theme, glassmorphism |
| **Frontend — Logic** | Vanilla JavaScript (ES2020+) | No framework, no build step; `~2,600 lines` in one file |
| **Charts** | Chart.js 4 (`chart.umd.min.js`) | Bundled locally as fallback; also loaded from CDN |
| **Fonts** | Figtree + Plus Jakarta Sans | Self-hosted `.woff2` files; no external font CDN |
| **Local Server** | Node.js (`dev-server.mjs`) | Simple HTTP server for local development |
| **Production API** | Vercel Serverless Functions | `api/store.js` as the single API handler |
| **Cloud Database** | Upstash Redis (via `@upstash/redis`) | REST-based Redis; key: `sharespace:store` |
| **Local Database** | JSON file (`data/store.json`) | Used in local dev; git-ignored |
| **Package Manager** | npm | Single dependency: `@upstash/redis ^1.34.0` |
| **Deployment** | Vercel | Free tier; zero configuration required |

---

## 13. Deployment Architecture

### 13.1 Local Development

```
Developer machine
├── node dev-server.mjs         (HTTP server on port 3456)
├── Serves: index.html, assets/, chart.umd.min.js
├── Proxies: /api/store → api/store.js (Node handler)
└── Stores data: data/store.json (file system)
```

**Setup steps:**
1. Install Node.js LTS
2. `npm install` (installs `@upstash/redis`)
3. `npm run dev`
4. Open `http://localhost:3456`

### 13.2 Production (Vercel)

```
Internet
    │
    ▼
Vercel Edge Network
    │
    ├── Static files  →  index.html, assets/*, chart.umd.min.js
    │
    └── Serverless Function  →  api/store.js
                                    │
                                    └── Upstash Redis  (HTTPS REST API)
                                          Key: sharespace:store
```

**Environment Variables required:**

| Variable | Description |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Redis REST endpoint URL (set automatically by Vercel integration) |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST auth token (set automatically by Vercel integration) |
| `AUTH_SECRET` | HMAC secret for password hashing (set manually; required for security) |

**Deploy steps:**
1. Push to GitHub
2. Import repository to Vercel
3. Add Upstash Redis via Vercel Storage → Marketplace
4. Set `AUTH_SECRET` environment variable
5. Redeploy

### 13.3 Storage Fallback Behavior

| Scenario | Storage Used |
|---|---|
| Vercel + Redis connected | Upstash Redis (persistent) |
| Vercel + no Redis | Returns HTTP 503 `STORAGE_NOT_CONFIGURED` |
| Local (`npm run dev`) | `data/store.json` (file system) |

---

## 14. Security Requirements

| ID | Requirement |
|---|---|
| SEC-01 | All passwords are hashed using `SHA-256(AUTH_SECRET + ":" + password)` before being written to the store |
| SEC-02 | Session tokens are generated with `crypto.randomBytes(32)` (Node.js built-in `crypto` module) |
| SEC-03 | Session tokens expire after 7 days; expired tokens are cleaned up on validation |
| SEC-04 | The `sanitizeForClient()` function strips `sessions` map and all `passwordHash` fields before any response is sent |
| SEC-05 | The `AUTH_SECRET` environment variable must be changed from its default value before production use |
| SEC-06 | The default password for all members is `1234` — Admin must reset passwords for all members after initial setup |
| SEC-07 | PUT and DELETE HTTP methods are disabled (return 405) on the API — all mutations go through authenticated POST actions |
| SEC-08 | Photos are stored as Base64 data URLs inline in the JSON store — no external file storage or CDN exposure |
| SEC-09 | The app does not log or expose API tokens in client-side code |
| SEC-10 | CORS currently allows all origins (`*`) — should be restricted to the Vercel deployment URL in hardened deployments |

---

## 15. Constraints & Assumptions

| # | Constraint / Assumption |
|---|---|
| C-01 | The application is designed for **private, trusted** user groups (flatmates) — not for public multi-tenant use |
| C-02 | All monetary values are in Bangladeshi Taka (৳); no multi-currency support |
| C-03 | All amounts are non-negative integers; decimal inputs are accepted but truncated at the calculation level via ceiling/rounding |
| C-04 | Maximum practical member count is ~10; beyond that, the login bubble UI may become crowded |
| C-05 | Profile photos are Base64-encoded and stored in the JSON store — very large photos will bloat the Redis record |
| C-06 | Upstash Redis free tier stores up to 10,000 keys and 256MB; a typical installation with 3–5 members and 12 months of data uses well under 1MB |
| C-07 | The app has no real-time sync; all members must refresh to see updates made by others |
| C-08 | Charts require Chart.js to render; if the CDN is unreachable and the local bundle fails, charts will silently not render |
| C-09 | The Expenses module does not interact with bill calculations — they are separate and not summed for payment |
| C-10 | Month keys use the JavaScript `Date` local time zone, not UTC — all users should be in the same time zone |

---

## 16. Acceptance Criteria

### 16.1 Authentication

- [ ] A member can log in with their name and default password `1234`
- [ ] A session persists across browser tab refreshes but not across browser sessions (sessionStorage)
- [ ] An expired or invalid token results in automatic sign-out without crashing
- [ ] Admin can reset another member's password from the Members tab
- [ ] Non-admin cannot access any write operation

### 16.2 Bill Calculation

- [ ] Entering electricity ৳910 for 3 members with Parvez fixed at ৳6,500 yields: Shimanto ৳10,195, Tauqir ৳10,195, Parvez ৳7,905
- [ ] Rounding gap is correctly calculated and displayed
- [ ] Adding an adjustment of ৳500 lend to a member increases their total by ৳500
- [ ] A member's adjusted total never goes below ৳0

### 16.3 Locking

- [ ] After saving a bill, the electricity input is hidden and replaced with the locked bill view
- [ ] Attempting to save the same month again (via API) returns 403
- [ ] Admin can unlock a month from Danger Zone; after unlocking, the bill entry form is shown again

### 16.4 Expense Tracker

- [ ] A member can add expense items for the current month
- [ ] Carry-forward balance is correctly computed across consecutive months
- [ ] Admin can edit any member's expenses; non-admin can only edit their own

### 16.5 Dashboard

- [ ] All six charts render correctly with at least one locked bill in the system
- [ ] Stat cards show correct values for fixed bucket total, member count, bill count, and year gap
- [ ] Switching to light theme re-renders charts in the correct color scheme

### 16.6 Configuration

- [ ] Admin can add a new member; new member gets default password `1234`
- [ ] Saving members does not reset existing members' passwords
- [ ] Fixed costs and rent split changes are immediately reflected in the bill calculation
- [ ] Non-admin sees configuration in read-only mode with a readonly banner

### 16.7 Backup & Restore

- [ ] Export downloads a valid JSON file with all data
- [ ] Importing the exported file restores all data exactly
- [ ] Importing an invalid JSON file shows an error toast and does not corrupt data

### 16.8 Deployment

- [ ] App deploys to Vercel with no build command
- [ ] With Redis connected, data persists across Vercel function cold starts
- [ ] Without Redis, the app returns 503 and shows an actionable error message

---

## 17. Glossary

| Term | Definition |
|---|---|
| **Fixed Bucket** | The sum of Rent + Gas + Water + Service charges; this pool is distributed per the Rent Split configuration |
| **Free Member** | A member without a fixed rent contribution; they share the remainder of the fixed bucket equally |
| **Rent Split** | The configuration that assigns a fixed contribution to one or more members toward the fixed bucket |
| **Ceiling Rounding** | `Math.ceil(amount / n)` — always rounds up to the nearest integer; used for electricity, maid, WiFi per-head splits |
| **Rounding Gap** | The positive difference between total collected from all members and the actual bill, arising from ceiling rounding |
| **Locked Bill** | A monthly electricity bill that has been saved and cannot be edited without Admin intervention |
| **Adjustment** | A lend or borrow entry that modifies a member's final monthly total for one-off financial transactions |
| **Carry-Forward** | The excess expense amount a member carries to the next month because they spent more than the lowest spender |
| **Admin** | The member designated as `config.adminId`; has full control over all app settings and data |
| **Bill Manager** | The member designated as `config.billManagerId`; responsible for entering monthly bills and adjustments |
| **Session Token** | A 64-character hex string created at login, stored server-side with an expiry, and sent with every authenticated API request |
| `AUTH_SECRET` | A server-only environment variable used as a salt in the SHA-256 password hashing function |
| **Month Key** | The `YYYY-MM` format string used as the key for all monthly data (bills and expenses) |
| **Upstash Redis** | The cloud Redis service used for persistent data storage in the Vercel production environment |
| **Sanitize** | The process of removing sensitive fields (sessions, password hashes) before sending data to the browser |
| **Default State** | The factory-reset state of the application with three default members (Shimanto, Tauqir, Parvez) and default cost values |

---

*End of Business Requirements Document*

---

> **Document Control:** This BRD represents the complete, authoritative specification for the `localhost` Apartment Bill Splitter v1.0. Any deviation from these requirements during development must be reviewed against the business objectives in Section 2 and the acceptance criteria in Section 16.
