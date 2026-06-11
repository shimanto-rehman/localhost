# Business Requirements Document (BRD)

## **LocalHost — Apartment Bill Sharing Application**

---

| Field | Details |
|---|---|
| **Document Title** | Business Requirements Document — LocalHost Apartment Bill Sharing Application |
| **Version** | 2.0 |
| **Status** | Final — Ready for Development |
| **Date** | June 2026 |
| **Prepared By** | Product Owner / Shimanto Rehman |
| **Currency** | Bangladeshi Taka (৳) |
| **Target Region** | Bangladesh (primary); adaptable globally |
| **Frontend Framework** | Next.js (App Router) |
| **Backend** | Next.js API Routes (Server Actions / Route Handlers) |
| **Database** | PostgreSQL (via Prisma ORM) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Objectives](#2-business-objectives)
3. [Scope](#3-scope)
4. [Stakeholders](#4-stakeholders)
5. [User Personas](#5-user-personas)
6. [System Architecture Overview](#6-system-architecture-overview)
7. [Functional Requirements](#7-functional-requirements)
   - 7.1 [Apartment Registration & Login](#71-apartment-registration--login)
   - 7.2 [Member Authentication & Role Management](#72-member-authentication--role-management)
   - 7.3 [Member Profile & Personal Information](#73-member-profile--personal-information)
   - 7.4 [Password Reset via Email](#74-password-reset-via-email)
   - 7.5 [Member Management (Configuration)](#75-member-management-configuration)
   - 7.6 [Bill Manager Bank Account](#76-bill-manager-bank-account)
   - 7.7 [Fixed Cost Configuration](#77-fixed-cost-configuration)
   - 7.8 [Optional Cost Configuration](#78-optional-cost-configuration)
   - 7.9 [Rent Split Configuration](#79-rent-split-configuration)
   - 7.10 [Monthly Bill Entry & Locking](#710-monthly-bill-entry--locking)
   - 7.11 [Bill Calculation Engine](#711-bill-calculation-engine)
   - 7.12 [Adjustments (Lend / Borrow)](#712-adjustments-lend--borrow)
   - 7.13 [Meal Management](#713-meal-management)
   - 7.14 [Expense Tracker (Shopping / Personal)](#714-expense-tracker-shopping--personal)
   - 7.15 [Dashboard & Analytics](#715-dashboard--analytics)
   - 7.16 [Monthly Bills Summary Page](#716-monthly-bills-summary-page)
   - 7.17 [Data Backup & Restore](#717-data-backup--restore)
   - 7.18 [Danger Zone (Admin Reset Controls)](#718-danger-zone-admin-reset-controls)
   - 7.19 [UI & Navigation](#719-ui--navigation)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Database Schema](#9-database-schema)
10. [API Specification](#10-api-specification)
11. [Business Rules](#11-business-rules)
12. [Calculation Logic (Detailed)](#12-calculation-logic-detailed)
13. [Tech Stack](#13-tech-stack)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Security Requirements](#15-security-requirements)
16. [Input Validation & Sanitization Rules](#16-input-validation--sanitization-rules)
17. [Constraints & Assumptions](#17-constraints--assumptions)
18. [Acceptance Criteria](#18-acceptance-criteria)
19. [Glossary](#19-glossary)

---

## 1. Executive Summary

**LocalHost** is a full-stack, web-based apartment bill-sharing and household management application designed for groups of flatmates (typically 2–15 people) sharing a residential apartment, particularly targeting the Bangladeshi mess/flat-sharing market.

The application solves three interconnected problems that arise in shared living:

1. **Utility Bill Splitting** — Monthly recurring apartment costs (rent, electricity, gas, water, and configurable optional utilities) split according to a flexible, configurable algorithm with support for custom rent contributions.
2. **Meal Cost Management** — A weekly meal checklist system per member, calculating per-meal costs from a shared shopping pool, with monthly summaries integrated into the main bill.
3. **Personal Expense Tracking** — Individual out-of-pocket spending logged per flatmate per month with a carry-forward equity mechanism ensuring long-term fairness.

**v2.0** is a ground-up rebuild using **Next.js** (App Router) for the frontend and backend, with **PostgreSQL** as the persistent relational database. This replaces the original vanilla JavaScript + Redis architecture and introduces:

- Apartment-level multi-tenancy (each apartment registers once; all members belong to that apartment)
- Full member profile management (NID, email, phone, hometown)
- Email-based password reset
- A configurable Fixed + Optional cost system
- Meal management with weekly checklists and per-meal cost calculation
- Bill Manager bank account storage with an in-app payment reference card
- Prisma ORM for type-safe database access

---

## 2. Business Objectives

| # | Objective | Success Metric |
|---|---|---|
| BO-1 | Eliminate manual bill calculation errors among flatmates | Zero disputed bill amounts per month after system adoption |
| BO-2 | Provide a single shared source of truth for all apartment costs | All flatmates see identical figures from a PostgreSQL-backed database |
| BO-3 | Prevent unauthorized editing of locked monthly bills | Bills locked after entry cannot be changed without Admin approval |
| BO-4 | Track meal fairness automatically | Per-meal cost computed automatically; members can see their meal bill in real time |
| BO-5 | Support flexible, non-equal rent contributions | One or more members can pay a custom fixed amount; others share the remainder |
| BO-6 | Provide historical and trend analytics | Dashboard charts covering full calendar year for bills, meals, and expenses |
| BO-7 | Enable independent apartment registration | Any apartment can register and use the system independently |
| BO-8 | Ensure data security and personal privacy | Passwords hashed, NID/email data encrypted at rest, role-based access enforced at API level |
| BO-9 | Support seamless payment reference | Bill Manager bank account shown on demand to facilitate manual bank transfers |
| BO-10 | Support data recovery | Full backup export/import with zero data loss |

---

## 3. Scope

### 3.1 In Scope

- **Apartment registration and login** (multi-apartment tenancy)
- **Member-level authentication** with role-based access control (Admin, Bill Manager, Member)
- **Full member profiles** with NID, email, phone, hometown, country
- **Email-based password reset** with secure tokenized links
- **Configurable fixed costs** and **configurable optional costs** (per-member opt-in)
- **Meal management** with weekly checklists, shopping input, per-meal cost calculation, and monthly summaries
- **Monthly bill entry** with locking and unlock mechanism
- **Bill Calculation Engine** integrating fixed costs, optional costs, and meal costs
- **Adjustment entries** (lend/borrow) per member per locked month
- **Personal expense tracker** with categorical tagging and carry-forward
- **Dashboard** with charts covering bills, meals, and expenses
- **Bill Manager bank account** with in-app reference card
- **Data backup** (export JSON) and restore (import JSON)
- **Dark/Light theme** with user preference persistence
- **Fully mobile-responsive** layout
- **Dynamic input validation** with inline error feedback

### 3.2 Out of Scope

- Payment gateway or real-time money transfer (bank account is for manual reference only)
- SMS notifications
- Native mobile applications (iOS/Android)
- Multi-currency support (৳ Taka only in v2.0)
- Audit log / change history trail
- Two-factor authentication (2FA)
- PDF invoice or report generation
- AI-based expense prediction or budgeting

---

## 4. Stakeholders

| Role | Description | Interest |
|---|---|---|
| **Apartment Owner / Registrant** | The person who registers the apartment (provides NID, address) | Apartment setup; owns the Admin role |
| **Admin** | Primary flatmate managing the app day-to-day | Full control over configuration, members, bills, meals, and data |
| **Bill Manager** | Flatmate responsible for entering monthly bills and collecting payments | Enters bills, manages meal checklist, saves adjustments, shares bank info |
| **Member** | All registered flatmates | View their bill share, log meals and personal expenses, view bank details for payment |
| **Developer / DevOps** | Person deploying and maintaining the system | Next.js + PostgreSQL setup, environment variables, hosting |

---

## 5. User Personas

### Persona A — The Admin / Apartment Owner (e.g., Shimanto)
- Registers the apartment with full address and NID details
- Invites and adds flatmates as members
- Configures fixed and optional costs each month
- Sets Meal configuration (meals per day, optional categories)
- Manages roles and can reset any member's password
- Exports backups periodically
- Views full dashboard analytics

### Persona B — The Bill Manager (e.g., Tauqir)
- Receives monthly utility bills physically
- Enters and locks electricity and other variable amounts
- Manages the weekly meal checklist (confirms meals for each member)
- Adds lend/borrow adjustments for one-off transactions
- Shares bank account details (input by Admin) for members to transfer money

### Persona C — The Regular Member (e.g., Parvez)
- Has a fixed rent contribution different from others
- Views his monthly breakdown including rent, utilities, meals
- Logs personal shopping expenses
- Can reset his own password via email link
- Sees Bill Manager bank details when he clicks the eye icon to pay

---

## 6. System Architecture Overview

```
Browser (Next.js App Router — React Server Components + Client Components)
    │
    ├── /app/(auth)/               → Preloader → Apartment Login / Register
    ├── /app/(app)/dashboard/      → Dashboard page
    ├── /app/(app)/bills/          → Monthly Bills page
    ├── /app/(app)/meals/          → Meal Management page
    ├── /app/(app)/expenses/       → Personal Expenses page
    └── /app/(app)/settings/       → Configuration page
    │
    ▼
Next.js API Route Handlers (/app/api/...)
    │
    ├── Apartment Auth       → /api/auth/apartment/register | login | logout
    ├── Member Auth          → /api/auth/member/login | logout | verify | reset-password
    ├── Members              → /api/members
    ├── Config               → /api/config
    ├── Bills                → /api/bills
    ├── Meals                → /api/meals | /api/meals/checklist | /api/meals/shopping
    ├── Expenses             → /api/expenses
    ├── Adjustments          → /api/adjustments
    └── Backup               → /api/backup/export | import
    │
    ▼
Prisma ORM
    │
    ▼
PostgreSQL Database
```

### Two-Layer Session System

| Layer | Purpose | Storage | Duration |
|---|---|---|---|
| **Apartment Session** | Identifies which apartment's data to show | HTTP-only cookie (`apt_session`) | 30 days (configurable) |
| **Member Session** | Identifies the logged-in member within the apartment | HTTP-only cookie (`member_session`) | 7 days |

Both sessions are JWT tokens signed with `JWT_SECRET` environment variable.

---

## 7. Functional Requirements

---

### 7.1 Apartment Registration & Login

This is the **first screen** the user sees after the preloader animation. It gates access to the entire application. All data within the app belongs to a single registered apartment; no member data is visible before the apartment is authenticated.

#### 7.1.1 Preloader

| ID | Requirement |
|---|---|
| PRE-01 | On initial page load, a full-screen preloader animation is shown |
| PRE-02 | The preloader shows: three concentric pulse rings, the LocalHost logo, an animated ECG/wave SVG, the app name "LocalHost", and a sub-label "Preparing your home" |
| PRE-03 | A progress bar animates during the preloader |
| PRE-04 | After the preloader completes, the system checks for a valid apartment session cookie |
| PRE-05 | If a valid apartment session exists, the user is redirected to the Dashboard |
| PRE-06 | If no apartment session exists, the Apartment Login / Register screen is shown |

#### 7.1.2 Apartment Login Screen

| ID | Requirement |
|---|---|
| APT-01 | The screen has two tabs: **Sign In** and **Register** |
| APT-02 | Sign In requires: Apartment Name OR Registration ID, and Apartment Password |
| APT-03 | On successful sign-in, an apartment-level JWT is issued, stored as an HTTP-only cookie (`apt_session`) |
| APT-04 | The apartment session lasts 30 days and is renewed on each successful request |
| APT-05 | Failed sign-in returns a generic error: "Invalid apartment credentials" (no enumeration of whether name or password was wrong) |
| APT-06 | After 5 consecutive failed login attempts from the same IP within 10 minutes, the login is rate-limited for 15 minutes |

#### 7.1.3 Apartment Registration

The Register form collects comprehensive apartment identity information.

**Required Fields:**

| Field | Label | Type | Validation |
|---|---|---|---|
| `apt_name` | Apartment / Mess Name | Text | 2–80 chars; must be unique |
| `apt_password` | Apartment Password | Password | Min 8 chars; at least one number |
| `apt_password_confirm` | Confirm Password | Password | Must match `apt_password` |
| `address_road` | Road Number / Street | Text | Required; 2–100 chars |
| `address_postal` | Postal Code | Text | Required; 4–10 chars |
| `address_city` | City | Text | Required; 2–60 chars |
| `address_country` | Country | Select | Required; defaults to Bangladesh |
| `registrant_name` | Registrant Full Name | Text | Required; 2–80 chars |
| `registrant_nid` | Registrant NID Number | Text | Required; 10 or 17 digits for BD NID |
| `registrant_phone` | Registrant Phone | Tel | Required; Bangladesh format: +880XXXXXXXXXX |
| `registrant_email` | Registrant Email | Email | Required; valid email format; unique |

**Optional Fields (collected at registration, used for future features):**

| Field | Label | Type |
|---|---|---|
| `member_count_hint` | Approximate Number of Members | Number (1–20) |
| `apt_floor` | Floor / Unit Badge | Text (e.g., "7TH FLOOR") |
| `apt_type` | Accommodation Type | Select: Mess / Bachelor Flat / Family Flat / Shared House |
| `move_in_date` | Move-in Date | Date |

| ID | Requirement |
|---|---|
| REG-01 | All required fields must pass client-side validation before form submission is allowed |
| REG-02 | All required fields also pass server-side validation; API returns field-level error objects |
| REG-03 | Apartment Name must be unique across all apartments in the system |
| REG-04 | Registrant email must be unique across all apartments |
| REG-05 | On successful registration, the apartment and registrant member record are created in the same database transaction |
| REG-06 | The registrant is automatically created as a Member with the Admin role |
| REG-07 | A unique Apartment Registration ID (e.g., `APT-2026-XXXXX`) is generated and shown after registration |
| REG-08 | On registration success, the user is automatically logged in (apartment session created) and redirected to the Configuration page to complete setup |
| REG-09 | NID numbers are stored encrypted in the database |

#### 7.1.4 Apartment Info Display

| ID | Requirement |
|---|---|
| APT-INFO-01 | Apartment name is displayed in the sidebar header and Dashboard title |
| APT-INFO-02 | Full address (Road, City, Postal Code, Country) is displayed in the topbar sub-label and on the Dashboard |
| APT-INFO-03 | Floor/Unit badge is displayed as a pill badge in the topbar |
| APT-INFO-04 | Apartment Registration ID is displayed in the sidebar footer or About section |
| APT-INFO-05 | Move-in date and accommodation type are shown in the About/Info panel |

---

### 7.2 Member Authentication & Role Management

Member authentication is a **second layer** on top of the apartment session. It is accessed via the sidebar.

#### 7.2.1 Member Login

| ID | Requirement |
|---|---|
| MAUTH-01 | The member login is a modal triggered from the "Sign in to edit" button in the sidebar |
| MAUTH-02 | The login modal shows a visual member-bubble selector: member avatars arranged in an animated petal/orbit layout; the selected member's avatar is enlarged at the center |
| MAUTH-03 | Clicking a member bubble selects that member; their name appears as a label below the bubble field |
| MAUTH-04 | Below the bubble field is a password input |
| MAUTH-05 | On successful login, a member-level JWT is issued, stored as an HTTP-only cookie (`member_session`) lasting 7 days |
| MAUTH-06 | On page reload, the system automatically verifies the member session by calling the `/api/auth/member/verify` endpoint |
| MAUTH-07 | Logging out revokes the member JWT (stored in a server-side blocklist in Redis or PostgreSQL) and clears the cookie |
| MAUTH-08 | After 5 failed login attempts for a specific member within 5 minutes, that member's login is locked for 10 minutes |
| MAUTH-09 | The sidebar shows the authenticated member's avatar, name, role, and a "Sign out" button when logged in |
| MAUTH-10 | All mutating API endpoints require both a valid apartment session and a valid member session |

#### 7.2.2 Roles & Permissions Matrix

| Permission | Admin | Bill Manager | Member |
|---|---|---|---|
| View all data | ✅ | ✅ | ✅ |
| Register / Edit apartment config | ✅ | ❌ | ❌ |
| Add / Remove members | ✅ | ❌ | ❌ |
| Assign roles | ✅ | ❌ | ❌ |
| Reset any member's password | ✅ | ❌ | ❌ |
| Configure fixed costs | ✅ | ❌ | ❌ |
| Configure optional costs | ✅ | ❌ | ❌ |
| Configure meal settings | ✅ | ❌ | ❌ |
| Enter / lock monthly bills | ✅ | ✅ | ❌ |
| Enter meal checklist | ✅ | ✅ | ❌ |
| Add/remove meal shopping items | ✅ | ✅ | ❌ |
| Add bill adjustments | ✅ | ✅ | ❌ |
| Input bank account info | ✅ | ❌ | ❌ |
| View bank account info | ✅ | ✅ | ✅ (eye button) |
| Edit own expenses | ✅ | ✅ | ✅ |
| Edit any member's expenses | ✅ | ❌ | ❌ |
| Reset own password (via email) | ✅ | ✅ | ✅ |
| Unlock bill months | ✅ | ❌ | ❌ |
| Reset all bills / reset all data | ✅ | ❌ | ❌ |
| Export / import backup | ✅ | ❌ | ❌ |

---

### 7.3 Member Profile & Personal Information

Each member has a profile card in the Configuration → Members tab. The Admin can see and edit all fields; members can see their own card.

**Member Profile Fields:**

| Field | Label | Type | Required | Notes |
|---|---|---|---|---|
| `name` | Full Name | Text | ✅ | 2–80 chars |
| `photo` | Profile Photo | Image upload | ❌ | Stored as Base64 or uploaded to object storage |
| `email` | Email Address | Email | ❌ | Used for password reset; must be unique if provided |
| `phone` | Phone Number | Tel | ❌ | Bangladesh: +880XXXXXXXXXX |
| `nid` | NID Number | Text | ❌ | 10 or 17 digits; stored encrypted |
| `hometown` | Hometown | Text | ❌ | 2–80 chars |
| `country` | Country | Select | ❌ | Defaults to Bangladesh |
| `move_in_date` | Move-in Date | Date | ❌ | When this member joined |
| `is_active` | Active Member | Toggle | ✅ | Inactive members are excluded from cost calculations |

| ID | Requirement |
|---|---|
| PROF-01 | Each member card in Configuration → Members shows all profile fields in an expandable form |
| PROF-02 | Email and NID fields are masked by default (shown as `****` with a reveal toggle) |
| PROF-03 | NID is stored encrypted (AES-256) in the database; only decrypted server-side on Admin request |
| PROF-04 | Email is used for password reset; if no email is set, email-based reset is unavailable |
| PROF-05 | Phone is displayed on the member card for flatmates' reference |
| PROF-06 | A member can view their own profile but cannot edit it without Admin approval (Admin saves all profile changes) |
| PROF-07 | Move-in date is used to determine which months the member participates in billing |

---

### 7.4 Password Reset via Email

| ID | Requirement |
|---|---|
| RESET-01 | Each member's profile card in Configuration → Members has a "Send Reset Link" button (Admin only) or the member can request it from the login modal |
| RESET-02 | On triggering a reset, the system sends an email to the member's registered email address |
| RESET-03 | The email contains a secure, time-limited reset link (valid for 1 hour) |
| RESET-04 | The reset link is a unique token stored in the `password_reset_tokens` table with an expiry timestamp |
| RESET-05 | Clicking the link opens a page where the member enters and confirms a new password |
| RESET-06 | After successful reset, the token is invalidated and the member is redirected to the login modal |
| RESET-07 | If a member has no registered email, the Admin must manually set a new password from the Configuration page |
| RESET-08 | Admin can also directly set a new password for any member from the profile card (without email) |
| RESET-09 | Password must be at least 8 characters; at least one number and one letter |
| RESET-10 | All password reset actions are logged with a timestamp in the `audit_events` table |
| RESET-11 | Email is sent via a configured SMTP provider (e.g., Resend, SendGrid, Nodemailer); `SMTP_*` environment variables required |

---

### 7.5 Member Management (Configuration)

| ID | Requirement |
|---|---|
| MEM-01 | Admin can add new members via a modal with fields: Full Name, Photo, Email, Phone, NID, Hometown, Country, Move-in Date |
| MEM-02 | New members are automatically assigned the default password (`1234`); Admin must notify them to reset via email |
| MEM-03 | Admin can deactivate a member (is_active = false); deactivated members are excluded from new bill calculations |
| MEM-04 | Deactivated members are shown with a visual "Inactive" badge; their historical bill data is preserved |
| MEM-05 | Admin can assign the Bill Manager role to any active member |
| MEM-06 | Admin can re-assign the Admin role to another member (creates a confirmation step) |
| MEM-07 | Member cards in the grid show: avatar, name, role badge, phone, email (masked), active status, profile expand button |
| MEM-08 | Up to 5 member avatars are displayed in the topbar avatar stack |
| MEM-09 | Member IDs are UUID v4 generated at creation |

---

### 7.6 Bill Manager Bank Account

The Admin can optionally store the Bill Manager's bank account details for payment reference purposes.

**Bank Account Form Fields:**

| Field | Label | Type | Validation |
|---|---|---|---|
| `account_number` | Bank Account Number | Text | 9–18 digits |
| `bank_name` | Bank Name | Text | Required if any field filled; 2–80 chars |
| `branch_name` | Branch Name | Text | 2–80 chars |
| `routing_number` | Routing Number | Text | 9 digits (BD routing) |
| `account_type` | Account Type | Select | Savings / Current / DPS / Other |
| `mobile_banking` | Mobile Banking Number | Tel | Optional; e.g., bKash/Nagad: +880XXXXXXXXXX |
| `mobile_banking_type` | Mobile Banking Provider | Select | bKash / Nagad / Rocket / Other |

| ID | Requirement |
|---|---|
| BANK-01 | The bank account form is in Configuration → Members tab, within the Bill Manager's profile card, visible only to Admin |
| BANK-02 | The bank account information is optional; if not provided, the bank info feature is hidden |
| BANK-03 | If bank account is provided, an eye (👁) icon button appears on: the Bill Manager's member card in Monthly Bills page, and in the Meal Management page |
| BANK-04 | Clicking the eye icon opens a modal or popover showing the full bank account reference card |
| BANK-05 | The bank reference card displays: Account Number (formatted), Bank Name, Branch, Routing Number, Account Type, and any Mobile Banking number |
| BANK-06 | The bank reference card has a "Copy Account Number" button |
| BANK-07 | Bank account data is stored encrypted (AES-256) in the database |
| BANK-08 | Only the Admin can enter or modify bank account details; all members can view via the eye icon |

---

### 7.7 Fixed Cost Configuration

Fixed costs are monthly recurring apartment costs that are always applicable to all members (or split via the Rent Split configuration). The Admin configures these in Configuration → Fixed Costs.

**Fixed Cost Categories:**

| Cost Item | Default | Behaviour |
|---|---|---|
| Base House Rent (৳) | ৳20,000 | Included in Fixed Bucket; split via Rent Split config |
| Gas Bill (৳) | ৳1,080 | Included in Fixed Bucket |
| Water Bill (৳) | ৳1,000 | Included in Fixed Bucket |
| Building Service Charge (৳) | ৳2,000 | Included in Fixed Bucket |

> **The Fixed Bucket = Rent + Gas + Water + Service.** This is distributed according to the Rent Split configuration.

Additionally, the Admin can define **custom fixed cost line items** beyond the defaults:

| ID | Requirement |
|---|---|
| FCOST-01 | Admin can add unlimited custom fixed cost line items with a Name and monthly Amount |
| FCOST-02 | Each custom fixed cost item has an "Include in Fixed Bucket" toggle: if ON, it joins the Rent+Gas+Water+Service bucket; if OFF, it is split equally per head using ceiling rounding |
| FCOST-03 | All fixed cost amounts are positive integers |
| FCOST-04 | Fixed costs are stored at the apartment level in the `fixed_costs` table |
| FCOST-05 | Changes to fixed costs are effective from the next month; locked months retain a snapshot of the fixed costs at the time of locking |
| FCOST-06 | The total Fixed Bucket amount is prominently displayed on the Fixed Costs configuration page |

---

### 7.8 Optional Cost Configuration

Optional costs are costs that not all members participate in. Each optional cost can be toggled per member.

**Default Optional Costs:**

| Cost Item | Example Amount |
|---|---|
| House Maid | ৳2,500 |
| Wi-Fi Bill | ৳800 |

The Admin can create custom optional cost items (e.g., "Gym Membership", "Newspaper", "Parking Fee").

| ID | Requirement |
|---|---|
| OCOST-01 | Admin can add unlimited custom optional cost line items with a Name and monthly Amount |
| OCOST-02 | Each optional cost item has a per-member opt-in checkbox in the Rent Split / Cost Allocation tab |
| OCOST-03 | By default, all active members opt in to all optional costs |
| OCOST-04 | Admin can uncheck specific members from specific optional costs |
| OCOST-05 | An optional cost is split **equally** (ceiling rounding) **only among opted-in members** |
| OCOST-06 | If zero members opt in, the optional cost is simply excluded from the month's bill |
| OCOST-07 | Optional cost participation is stored per member per cost item in `optional_cost_members` table |
| OCOST-08 | The Configuration page shows a matrix grid: rows = optional cost items, columns = members, cells = checkboxes |
| OCOST-09 | On the Monthly Bills Summary page, each optional cost is shown as a separate line item in the cost breakdown table |

---

### 7.9 Rent Split Configuration

| ID | Requirement |
|---|---|
| RSP-01 | Each member can be set to "Fixed amount" mode, contributing a custom amount to the Fixed Bucket |
| RSP-02 | Free members (without a fixed amount) share the remainder of the Fixed Bucket equally |
| RSP-03 | The free members' share uses `Math.round` (not ceiling) |
| RSP-04 | A member with a fixed rent contribution still pays their equal ceiling-rounded share of optional and variable costs they are opted in to |
| RSP-05 | A helper display on the Rent Split tab shows: Fixed Bucket Total, Sum of Fixed Contributions, Remaining, and Per Free Member Share — updated in real time as the admin adjusts values |

---

### 7.10 Monthly Bill Entry & Locking

#### 7.10.1 Variable Bills (Entered Monthly)

| Bill | Description |
|---|---|
| Electricity | Entered manually each month by Admin or Bill Manager |
| Any other Admin-defined variable cost | e.g., seasonal water charge — Admin can designate a cost as "variable" |

| ID | Requirement |
|---|---|
| VBILL-01 | Monthly Bills page shows one month at a time with previous/next navigation arrows |
| VBILL-02 | A month/year selector or dropdown allows jumping to any month |
| VBILL-03 | Admin or Bill Manager enters the electricity amount; other variable costs are also entered here |
| VBILL-04 | On clicking "Save & Lock", all variable amounts are saved and the month is locked |
| VBILL-05 | Once locked, variable inputs become read-only and a "Locked" badge is shown |
| VBILL-06 | The `savedAt` timestamp is stored with the locked bill |
| VBILL-07 | Attempting to save a bill for an already-locked month returns HTTP 403 |

#### 7.10.2 Bill Locking

| ID | Requirement |
|---|---|
| LOCK-01 | Locking a bill captures a snapshot of: electricity amount, all fixed costs, all optional costs, all rent split assignments, and active member list |
| LOCK-02 | The snapshot is stored with the bill so that config changes do not retroactively alter locked months |
| LOCK-03 | A locked month shows: summary pills, per-member cost cards (including adjustments and meal costs), and a full expense table |
| LOCK-04 | Admin can unlock a month via Danger Zone → Unlock Single Month |

---

### 7.11 Bill Calculation Engine

The calculation engine computes each member's total monthly cost by combining:
1. Fixed Bucket share (Rent Split logic)
2. Optional costs (per opted-in members)
3. Variable costs (electricity, split equally by ceiling)
4. Meal costs (from Meal Management module)
5. ± Adjustments (lend/borrow)

#### Step 1 — Fixed Bucket

```
fixedBucket = rent + gas + water + service + (sum of custom fixed costs marked "in bucket")

For each member:
  if rentSplit[memberId] is set → fixedBucketShare = rentSplit[memberId]
  else → member is a "free member"

fixedContributions = sum of all set rentSplit values
remaining = max(0, fixedBucket - fixedContributions)
freeMembersCount = count of free active members
freeShare = round(remaining / freeMembersCount)
```

#### Step 2 — Optional Costs

```
For each optional cost item (i):
  optedInMembers[i] = active members where optIn[memberId][i] = true
  perHeadCost[i] = ceil(optionalCost[i].amount / optedInMembers[i].count)

For each member:
  optionalCostShare[m] = sum over all optional costs where member is opted in of perHeadCost[i]
```

#### Step 3 — Variable Costs

```
elecPerHead = ceil(electricity / activeMembers.count)
(Other variable cost items follow the same pattern)
```

#### Step 4 — Meal Cost

```
See Section 7.13 — Meal Management for full meal cost calculation.
mealCost[m] = member's total meal cost for the month
```

#### Step 5 — Total Per Member

```
memberTotal[m] = fixedBucketShare[m]
              + optionalCostShare[m]
              + elecPerHead
              + (other variable costs per head)
              + mealCost[m]
              ± adjustmentDelta[m]

adjustedTotal[m] = max(0, memberTotal[m])
```

#### Step 6 — Summary Totals

```
collectedTotal = sum of adjustedTotal for all members
actualBill     = fixedBucket + optionalCosts + electricity + (other variable) + totalMealCost
gap            = collectedTotal - actualBill   (always ≥ 0 due to ceiling rounding)
```

| ID | Requirement |
|---|---|
| CALC-01 | Calculations are performed server-side on demand using the bill snapshot stored at lock time |
| CALC-02 | If electricity is null (not yet entered), no total is calculated for that month |
| CALC-03 | Meal costs are included in the locked bill snapshot once meals are finalized |
| CALC-04 | A member with zero meals in a month has ৳0 meal cost |

---

### 7.12 Adjustments (Lend / Borrow)

| ID | Requirement |
|---|---|
| ADJ-01 | Adjustments can only be added to a locked month |
| ADJ-02 | Each adjustment has: `id`, `memberId`, `type` (lend/borrow), `label`, `amount` |
| ADJ-03 | A `lend` entry increases the member's total (they lent money and are owed back) |
| ADJ-04 | A `borrow` entry decreases the member's total (they borrowed from the pool) |
| ADJ-05 | Only Admin or Bill Manager can add/remove adjustments |
| ADJ-06 | Adjustments are shown on the Monthly Bills page and Dashboard member cards |
| ADJ-07 | A member's net total after adjustments is floored at ৳0 |

---

### 7.13 Meal Management

The Meal Management module is a dedicated page for tracking which members had meals on which days, calculating per-meal cost from a shared shopping pool, and rolling this into the monthly bill.

#### 7.13.1 Page Layout

The Meal Management page is divided into two sections:

1. **Weekly Meal Checklist** (upper section)
2. **Monthly Meal Cost Summary** (lower section)

#### 7.13.2 Navigation Controls

| ID | Requirement |
|---|---|
| MEAL-NAV-01 | A Month + Year dropdown at the top of the page selects the billing period; defaults to current month and year |
| MEAL-NAV-02 | A "Previous Week" (←) and "Next Week" (→) button set navigates through the weeks of the selected month |
| MEAL-NAV-03 | The week navigation is bounded to weeks within the selected month |
| MEAL-NAV-04 | The current week is shown by default |
| MEAL-NAV-05 | A week indicator label shows the date range (e.g., "Week 2 — Jun 9 to Jun 15, 2026") |

#### 7.13.3 Weekly Meal Checklist Card

The checklist is presented as a visual card/table with the following structure:

- **Rows:** One row per member
- **Columns:** One column per day of the week (Sat–Fri for Bangladesh, configurable)
- **Cells:** Meal status indicators per day per member

Each cell shows the meal slots for that day (e.g., Lunch, Dinner based on configuration). Each slot is a tappable/clickable toggle button.

| ID | Requirement |
|---|---|
| MEAL-CL-01 | Each row starts with the member's circular avatar photo (or initials avatar) and name |
| MEAL-CL-02 | Each column header shows the day abbreviation (Sat, Sun, Mon...) and the calendar date (e.g., "Jun 10") |
| MEAL-CL-03 | Each cell shows meal slot buttons for that day (e.g., one button per meal: Lunch, Dinner) |
| MEAL-CL-04 | A checked (confirmed) meal slot is visually distinct: filled color, checkmark icon |
| MEAL-CL-05 | An unchecked meal slot is outlined/ghost styled |
| MEAL-CL-06 | Only the Bill Manager or Admin can toggle meal slots |
| MEAL-CL-07 | Non-Bill-Manager members see the checklist in read-only mode |
| MEAL-CL-08 | Changes to meal slots are saved immediately on toggle (auto-save) via PATCH request |
| MEAL-CL-09 | A meal count badge per member per week is shown at the end of each row (e.g., "12 meals") |
| MEAL-CL-10 | A total meal count per day is shown at the bottom of each column |
| MEAL-CL-11 | Future dates are shown but toggles for future dates are disabled |
| MEAL-CL-12 | The card scrolls horizontally on small screens |
| MEAL-CL-13 | A "Mark All" and "Clear All" quick-action button is available per row (for Admin/Bill Manager) |

#### 7.13.4 Meal Configuration (in Configuration Panel)

| Setting | Description | Default |
|---|---|---|
| Meals per Day | Number of meal slots per day (1, 2, or 3) | 2 (Lunch + Dinner) |
| Meal Names | Customizable labels for each slot | Lunch, Dinner |
| Meal Start Day | First day of the meal week | Saturday (Bangladeshi standard) |
| Meal Rate Override | Fixed per-meal rate (optional, bypasses calculated rate) | Off (calculated from shopping) |

| ID | Requirement |
|---|---|
| MEAL-CFG-01 | Admin configures meal settings in Configuration → Meal Settings tab |
| MEAL-CFG-02 | Changing meals-per-day does not retroactively affect locked months |
| MEAL-CFG-03 | Meal slot names are shown as column sub-headers in the checklist card |

#### 7.13.5 Meal Shopping (Cost Input)

Each member logs their shopping expenditures into a shared pool for the month. The Bill Manager or Admin can also add items on behalf of others.

| ID | Requirement |
|---|---|
| MEAL-SHOP-01 | On the Meal Management page, there is a "Shopping" section below the checklist showing a list of all shopping entries for the selected month |
| MEAL-SHOP-02 | Each shopping entry has: Member (who purchased), Item Name, Amount (৳), Date |
| MEAL-SHOP-03 | Members can add their own shopping entries if logged in |
| MEAL-SHOP-04 | Admin and Bill Manager can add entries for any member |
| MEAL-SHOP-05 | Entries can be deleted by the member who added them or by Admin/Bill Manager |
| MEAL-SHOP-06 | The total shopping pool for the month is prominently displayed |
| MEAL-SHOP-07 | A breakdown by member showing each person's shopping contribution total is shown |

#### 7.13.6 Per-Meal Cost Calculation

```
totalShoppingPool  = sum of all shopping entry amounts for the month
totalMealCount     = sum of all confirmed meal slots across all members for the month
perMealCost        = totalShoppingPool / totalMealCount   (rounded to 2 decimal places)

For each member (m):
  memberMealCount[m] = count of confirmed meal slots for m in the month
  memberMealCost[m]  = ceil(perMealCost × memberMealCount[m])

mealSurplus = sum(memberMealCost) - totalShoppingPool  (rounding surplus ≥ 0)
```

| ID | Requirement |
|---|---|
| MEAL-CALC-01 | Per-meal cost is recalculated live as shopping amounts and meal counts change |
| MEAL-CALC-02 | Per-meal cost is displayed prominently on the Meal Management page (e.g., "Per Meal: ৳167.50 today") |
| MEAL-CALC-03 | If total meal count is 0, per-meal cost displays as ৳0 (no division by zero) |
| MEAL-CALC-04 | Member meal cost is included in the Monthly Bill Summary row as "🍽 Meals" |
| MEAL-CALC-05 | The meal cost snapshot is stored with the locked bill |

#### 7.13.7 Monthly Meal Cost Summary

Below the weekly checklist, a summary section shows:

| Column | Description |
|---|---|
| Member Avatar + Name | Member identity |
| Total Meals (month) | Count of confirmed meals |
| Shopping Contribution | Total amount this member added to the pool |
| Meal Cost Due | `memberMealCost[m]` — what they owe for meals |
| Net (Due − Contributed) | Positive = owes money; Negative = overpaid (refund due) |

| ID | Requirement |
|---|---|
| MEAL-SUM-01 | The monthly summary is visible at the bottom of the Meal Management page |
| MEAL-SUM-02 | The summary shows total shopping pool, per-meal cost, and total meals counted |
| MEAL-SUM-03 | A "Finalize Meals" button (Admin/Bill Manager only) locks the meal data for the month; after this, the checklist becomes read-only for that month |
| MEAL-SUM-04 | Meal data can be unfinalized by Admin (from Danger Zone) if corrections are needed |
| MEAL-SUM-05 | Net balance column uses color coding: red = owes money, green = overpaid, grey = settled |
| MEAL-SUM-06 | The Bill Manager's eye (👁) icon appears next to the collection summary, showing bank details |

---

### 7.14 Expense Tracker (Shopping / Personal)

The Expense Tracker is a separate module from Meal Management. It tracks individual discretionary spending with a carry-forward fairness mechanism.

| ID | Requirement |
|---|---|
| EXP-01 | Each member can add personal expense items with: Item Name (max 80 chars), Price (৳), Category, Date |
| EXP-02 | Supported categories: Food, Groceries, Utilities, Transport, Household, Entertainment, Medical, Other |
| EXP-03 | The Expenses page shows one month at a time with previous/next navigation |
| EXP-04 | Admin can edit any member's expenses; members can only edit their own |
| EXP-05 | Items with empty name or ≤0 price are rejected by validation |
| EXP-06 | Carry-forward: the member who spent the least sets the "base"; all others carry their excess to the next month |
| EXP-07 | Carry-in from previous month and carry-forward to next month are displayed per member |
| EXP-08 | A Member Expense Comparison chart (bar) is shown on the Expenses page for the current year |
| EXP-09 | Category-level color-coded breakdown is shown per member per month |

---

### 7.15 Dashboard & Analytics

The Dashboard is the default page after apartment login. It provides a full-year financial overview.

#### 7.15.1 Stat Cards (Top Row)

| Card | Value | Sub-Label |
|---|---|---|
| Fixed Bucket / Month | Total fixed costs | "Rent + Gas + Water + Service" |
| Active Members | Count | "Flatmates registered" |
| Bills This Year | Count of locked months | "YYYY · N months logged" |
| Total Meals This Month | Count of meal slots | "Across all members" |
| Year Collected | Total collected this year | "From all bills + meals" |
| Year Gap | Total rounding surplus | "Ceiling rounding surplus" |

#### 7.15.2 Charts

| Chart | Type | Data |
|---|---|---|
| Monthly Total Cost | Stacked Bar | Bills + Meals + Expenses per month |
| Per-Person Contribution | Bar | Cumulative per-member bill total for the year |
| Bill Category Breakdown | Doughnut | Fixed, Optional, Electricity, Meals by yearly total |
| Electricity Trend | Line | Monthly electricity amounts |
| Meal Cost Trend | Line | Monthly per-meal cost and total meal cost |
| Member Expense Contributions | Grouped Bar | Monthly personal expense spend per member |
| Rounding Gap | Bar | Monthly ceiling-rounding surplus |

| ID | Requirement |
|---|---|
| DASH-01 | Charts are rendered with Chart.js 4 |
| DASH-02 | Charts adapt to dark/light theme |
| DASH-03 | Charts resize responsively using ResizeObserver |
| DASH-04 | Apartment name and address are prominently displayed on the Dashboard |
| DASH-05 | The current month's member bill cards are shown (same as existing, now including meal row) |

---

### 7.16 Monthly Bills Summary Page

The Monthly Bills page shows a locked month's full financial breakdown.

#### 7.16.1 Summary Pills Row

| Pill | Content |
|---|---|
| House Rent Total | Fixed Bucket total |
| Electricity | Monthly electricity amount |
| Meals Total | Total meal cost for the month |
| Optional Costs | Sum of all optional cost totals |
| Actual Bill | Total of all real costs |
| Collected | Sum of all member totals |
| Gap | Collected − Actual Bill |

#### 7.16.2 Per-Member Cards

Each member card shows:
- Avatar, name, role badge (Bill Manager eye icon if bank info exists)
- Fixed Bucket share
- Per optional cost line (only if member opted in)
- Electricity share
- Meal cost line
- Any adjustments
- **Total**

#### 7.16.3 Full Expense Table

A table with every cost component as a row, showing per-member columns.

| ID | Requirement |
|---|---|
| MBILL-01 | All cost components (fixed, optional, electricity, meals, adjustments) appear as separate rows |
| MBILL-02 | Column totals match the member cards |
| MBILL-03 | Row totals match the summary pills |
| MBILL-04 | Meal cost row has a "🍽 Meals" label with a link to the Meal Management page |

---

### 7.17 Data Backup & Restore

| ID | Requirement |
|---|---|
| BAK-01 | Admin can export a full backup as a JSON file from Configuration → Backup |
| BAK-02 | The backup includes: apartment config, members (excluding NID/passwords), bills, meal data, expenses, adjustments |
| BAK-03 | NID numbers are excluded from backup exports for privacy |
| BAK-04 | The file is named `localhost-backup-YYYY-MM-DD.json` |
| BAK-05 | Admin can import a backup file to restore all data |
| BAK-06 | Import validates the backup envelope (`app`, `version`, required fields) |
| BAK-07 | Import replaces all current data in a database transaction; if any step fails, the entire restore is rolled back |
| BAK-08 | After restore, the UI reloads fresh data |

---

### 7.18 Danger Zone (Admin Reset Controls)

| Action | Description | Confirmation Required |
|---|---|---|
| Unlock Single Month | Remove lock from one month's bill | ✅ |
| Unfinalize Meal Month | Remove meal finalization for one month | ✅ |
| Reset All Bill Data | Clear all locked bills; keep members and config | ✅ Double-confirm |
| Reset All Meal Data | Clear all meal and shopping records | ✅ Double-confirm |
| Reset Everything | Wipe all data; restore factory defaults | ✅ Type "RESET" to confirm |

| ID | Requirement |
|---|---|
| DZ-01 | All Danger Zone actions require Admin role |
| DZ-02 | "Reset Everything" requires the Admin to type the word "RESET" into a text box before confirming |
| DZ-03 | All resets are logged in `audit_events` table |

---

### 7.19 UI & Navigation

#### 7.19.1 Pages

| Page | Path | Description |
|---|---|---|
| Preloader → Apartment Auth | `/` | First screen; login or register apartment |
| Dashboard | `/dashboard` | Stats, charts, current month overview |
| Monthly Bills | `/bills` | Month navigator, bill entry, locked bill view |
| Meal Management | `/meals` | Weekly checklist, shopping, monthly summary |
| Expenses | `/expenses` | Personal expense tracker |
| Configuration | `/settings` | Members, Costs, Rent Split, Meal Settings, Backup, Danger Zone tabs |
| Password Reset | `/reset-password/[token]` | Public page (no apartment session required) |

#### 7.19.2 Configuration Tabs

| Tab | Contents |
|---|---|
| Members | Member cards with profile info, password reset, role assignment, bank account form (for Bill Manager) |
| Fixed Costs | Apartment address, custom fixed cost line items, fixed bucket preview |
| Optional Costs | Custom optional cost items with per-member opt-in matrix |
| Rent Split | Per-member fixed contribution toggles with real-time remainder calculation |
| Meal Settings | Meals per day, meal names, start day of week, rate override |
| Backup | Export / Import controls |
| Danger Zone | Unlock, reset, and wipe controls |

#### 7.19.3 Navigation Components

| ID | Requirement |
|---|---|
| NAV-01 | Desktop: Left sidebar with logo, apartment name, nav links, and member auth at the bottom |
| NAV-02 | Mobile: Collapsible sidebar via ☰ hamburger button; backdrop overlay |
| NAV-03 | Mobile: Bottom navigation bar with five icon-button tabs (Home, Bills, Meals, Expenses, Settings) |
| NAV-04 | Active page is highlighted in both sidebar and bottom nav |
| NAV-05 | URL path reflects the current page for deep linking |
| NAV-06 | The topbar shows: page title, apartment address sub-label, theme toggle, floor badge, avatar stack |

#### 7.19.4 Theme

| ID | Requirement |
|---|---|
| THEME-01 | Dark mode is the default |
| THEME-02 | Toggle via sun/moon button in topbar |
| THEME-03 | Preference persisted in `localStorage` |
| THEME-04 | Charts re-render on theme switch |

#### 7.19.5 Toast Notifications

- Success: teal dot, auto-dismiss in 3.2 seconds
- Error: red dot, auto-dismiss in 5 seconds (longer to read)
- Info: blue dot, auto-dismiss in 3.2 seconds
- Multiple toasts stack from the bottom right

---

## 8. Non-Functional Requirements

### 8.1 Performance

| ID | Requirement |
|---|---|
| PERF-01 | Initial page load (including apartment session check) ≤ 3 seconds on broadband |
| PERF-02 | Monthly bill calculation API response ≤ 500ms |
| PERF-03 | Dashboard chart data API response ≤ 1 second |
| PERF-04 | Meal checklist toggle (auto-save) round-trip ≤ 400ms |
| PERF-05 | Database queries must be indexed on: `apartment_id`, `month_key`, `member_id` |

### 8.2 Reliability

| ID | Requirement |
|---|---|
| REL-01 | PostgreSQL connection pooling (PgBouncer or equivalent) for production |
| REL-02 | All destructive operations (restore, reset) are wrapped in database transactions |
| REL-03 | API errors surface user-friendly messages; raw stack traces are never sent to the client |
| REL-04 | If charts fail to render (Chart.js error), the rest of the page is unaffected |

### 8.3 Usability

| ID | Requirement |
|---|---|
| USE-01 | Fully functional on screens 320px wide and above |
| USE-02 | All interactive elements have `aria-label` attributes |
| USE-03 | All form inputs have visible labels |
| USE-04 | Dynamic inline validation (field-level errors appear as the user types or on blur) |
| USE-05 | Color is never the sole means of conveying information |
| USE-06 | The meal checklist scrolls horizontally on mobile with sticky member name column |
| USE-07 | Loading skeletons are shown while data is fetching (no empty flashes) |

### 8.4 Scalability

| ID | Requirement |
|---|---|
| SCALE-01 | The database schema is designed to support multiple apartments (multi-tenant) — each record is scoped by `apartment_id` |
| SCALE-02 | A single PostgreSQL database can serve all apartments; data is partitioned by `apartment_id` at query level |
| SCALE-03 | The system is designed to handle up to 50 members per apartment and 5 years of bill history |

---

## 9. Database Schema

All tables include `created_at` and `updated_at` timestamps automatically managed by Prisma.

### 9.1 `apartments`

```sql
apartments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id VARCHAR(20) UNIQUE NOT NULL,  -- e.g., APT-2026-XXXXX
  name            VARCHAR(80) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  address_road    VARCHAR(100) NOT NULL,
  address_postal  VARCHAR(20) NOT NULL,
  address_city    VARCHAR(60) NOT NULL,
  address_country VARCHAR(60) NOT NULL DEFAULT 'Bangladesh',
  apt_floor       VARCHAR(30),
  apt_type        VARCHAR(30),           -- Mess / Bachelor Flat / etc.
  move_in_date    DATE,
  member_count_hint INT,
  registrant_name VARCHAR(80) NOT NULL,
  registrant_nid  TEXT NOT NULL,         -- AES-256 encrypted
  registrant_phone VARCHAR(20) NOT NULL,
  registrant_email VARCHAR(255) UNIQUE NOT NULL,
  admin_member_id UUID,                  -- FK to members (set after first member created)
  bill_manager_id UUID,                  -- FK to members
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### 9.2 `members`

```sql
members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id    UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  name            VARCHAR(80) NOT NULL,
  photo_url       TEXT,                  -- Base64 data URL or object storage URL
  email           VARCHAR(255),          -- Unique per apartment
  phone           VARCHAR(20),
  nid             TEXT,                  -- AES-256 encrypted
  hometown        VARCHAR(80),
  country         VARCHAR(60) DEFAULT 'Bangladesh',
  move_in_date    DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash   TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### 9.3 `bank_accounts`

```sql
bank_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id    UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  account_number  TEXT NOT NULL,         -- AES-256 encrypted
  bank_name       VARCHAR(80) NOT NULL,
  branch_name     VARCHAR(80),
  routing_number  VARCHAR(20),
  account_type    VARCHAR(20),           -- Savings / Current / DPS / Other
  mobile_banking_number TEXT,            -- AES-256 encrypted
  mobile_banking_type VARCHAR(20),       -- bKash / Nagad / Rocket / Other
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### 9.4 `fixed_costs`

```sql
fixed_costs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id    UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  name            VARCHAR(80) NOT NULL,
  amount          INTEGER NOT NULL DEFAULT 0,
  in_fixed_bucket BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### 9.5 `optional_costs`

```sql
optional_costs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id    UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  name            VARCHAR(80) NOT NULL,
  amount          INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### 9.6 `optional_cost_members` (Opt-in Matrix)

```sql
optional_cost_members (
  optional_cost_id UUID NOT NULL REFERENCES optional_costs(id) ON DELETE CASCADE,
  member_id        UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  opted_in         BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (optional_cost_id, member_id)
)
```

### 9.7 `rent_splits`

```sql
rent_splits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id    UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  fixed_amount    INTEGER,               -- NULL = free member (share remainder)
  UNIQUE(apartment_id, member_id)
)
```

### 9.8 `monthly_bills`

```sql
monthly_bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id    UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  month_key       VARCHAR(7) NOT NULL,   -- 'YYYY-MM'
  electricity     INTEGER,
  is_locked       BOOLEAN NOT NULL DEFAULT FALSE,
  locked_at       TIMESTAMPTZ,
  locked_by       UUID REFERENCES members(id),
  snapshot        JSONB NOT NULL DEFAULT '{}', -- Full config snapshot at lock time
  UNIQUE(apartment_id, month_key)
)
```

### 9.9 `bill_adjustments`

```sql
bill_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id         UUID NOT NULL REFERENCES monthly_bills(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES members(id),
  type            VARCHAR(10) NOT NULL CHECK (type IN ('lend', 'borrow')),
  label           VARCHAR(120) NOT NULL,
  amount          INTEGER NOT NULL,
  created_by      UUID REFERENCES members(id),
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

### 9.10 `meal_config`

```sql
meal_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id      UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE UNIQUE,
  meals_per_day     INTEGER NOT NULL DEFAULT 2,
  meal_names        TEXT[] NOT NULL DEFAULT ARRAY['Lunch', 'Dinner'],
  week_start_day    INTEGER NOT NULL DEFAULT 6, -- 0=Sun, 6=Sat (Bangladesh default)
  rate_override     INTEGER,            -- NULL = use calculated rate
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
)
```

### 9.11 `meal_records`

```sql
meal_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id    UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  meal_date       DATE NOT NULL,
  meal_slot       INTEGER NOT NULL,     -- 0 = Lunch, 1 = Dinner, etc.
  is_confirmed    BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_by    UUID REFERENCES members(id),
  confirmed_at    TIMESTAMPTZ,
  UNIQUE(apartment_id, member_id, meal_date, meal_slot)
)
```

### 9.12 `meal_shopping`

```sql
meal_shopping (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id    UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES members(id),  -- Who purchased
  month_key       VARCHAR(7) NOT NULL,
  item_name       VARCHAR(80) NOT NULL,
  amount          INTEGER NOT NULL,
  purchase_date   DATE NOT NULL,
  added_by        UUID REFERENCES members(id),
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

### 9.13 `meal_months` (Finalization)

```sql
meal_months (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id    UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  month_key       VARCHAR(7) NOT NULL,
  is_finalized    BOOLEAN NOT NULL DEFAULT FALSE,
  finalized_at    TIMESTAMPTZ,
  finalized_by    UUID REFERENCES members(id),
  snapshot        JSONB NOT NULL DEFAULT '{}', -- Meal cost snapshot at finalization
  UNIQUE(apartment_id, month_key)
)
```

### 9.14 `expenses`

```sql
expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id    UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES members(id),
  month_key       VARCHAR(7) NOT NULL,
  item_name       VARCHAR(80) NOT NULL,
  price           INTEGER NOT NULL,
  category        VARCHAR(40) NOT NULL DEFAULT 'Other',
  expense_date    DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

### 9.15 `password_reset_tokens`

```sql
password_reset_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,  -- SHA-256 hash of the URL token
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

### 9.16 `audit_events`

```sql
audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id    UUID NOT NULL REFERENCES apartments(id),
  actor_member_id UUID REFERENCES members(id),
  action          VARCHAR(80) NOT NULL,  -- e.g., 'RESET_ALL', 'UNLOCK_MONTH', 'PASSWORD_RESET'
  target_type     VARCHAR(40),           -- e.g., 'bill', 'member'
  target_id       UUID,
  meta            JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

### 9.17 `member_sessions` (Token Blocklist)

```sql
member_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token_jti       TEXT NOT NULL UNIQUE,  -- JWT ID for revocation
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

---

## 10. API Specification

All API routes are under `/api/`. Apartment session cookie (`apt_session`) is required for all routes except apartment auth. Member session cookie (`member_session`) is required for mutating routes.

### 10.1 Apartment Authentication

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/apartment/register` | None | Register a new apartment |
| POST | `/api/auth/apartment/login` | None | Sign in apartment |
| POST | `/api/auth/apartment/logout` | Apt session | Sign out apartment |
| GET | `/api/auth/apartment/info` | Apt session | Get current apartment data |

### 10.2 Member Authentication

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/member/login` | Apt session | Member sign in (returns member JWT) |
| POST | `/api/auth/member/logout` | Apt + Member session | Revoke member session |
| GET | `/api/auth/member/verify` | Apt + Member session | Verify and refresh member session |
| POST | `/api/auth/member/request-reset` | Apt session | Send password reset email |
| POST | `/api/auth/member/reset-password` | Token (URL) | Set new password via reset token |

### 10.3 Members (Admin)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/members` | Apt session | List all members |
| POST | `/api/members` | Admin | Add a new member |
| PATCH | `/api/members/[id]` | Admin | Update member profile |
| DELETE | `/api/members/[id]` | Admin | Deactivate a member |
| PUT | `/api/members/[id]/password` | Admin | Set member password directly |
| GET | `/api/members/[id]/bank-account` | Apt + Member session | Get Bill Manager bank details |
| PUT | `/api/members/[id]/bank-account` | Admin | Set Bill Manager bank account |

### 10.4 Configuration

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/config` | Apt session | Get all config (costs, rent split, meal config) |
| PATCH | `/api/config/apartment` | Admin | Update apartment info |
| PATCH | `/api/config/roles` | Admin | Assign Admin / Bill Manager roles |
| GET | `/api/config/fixed-costs` | Apt session | List fixed cost items |
| POST | `/api/config/fixed-costs` | Admin | Add a fixed cost item |
| PATCH | `/api/config/fixed-costs/[id]` | Admin | Update a fixed cost item |
| DELETE | `/api/config/fixed-costs/[id]` | Admin | Delete a fixed cost item |
| GET | `/api/config/optional-costs` | Apt session | List optional cost items with opt-in matrix |
| POST | `/api/config/optional-costs` | Admin | Add an optional cost item |
| PATCH | `/api/config/optional-costs/[id]` | Admin | Update an optional cost item |
| DELETE | `/api/config/optional-costs/[id]` | Admin | Delete an optional cost item |
| PATCH | `/api/config/optional-costs/[id]/members` | Admin | Update per-member opt-in |
| GET | `/api/config/rent-split` | Apt session | Get rent split assignments |
| PATCH | `/api/config/rent-split` | Admin | Update rent split assignments |
| GET | `/api/config/meal-settings` | Apt session | Get meal configuration |
| PATCH | `/api/config/meal-settings` | Admin | Update meal configuration |

### 10.5 Bills

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/bills` | Apt session | List all bills (all months) |
| GET | `/api/bills/[monthKey]` | Apt session | Get one month's bill data |
| POST | `/api/bills/[monthKey]/lock` | Admin or BM | Save and lock a month's bill |
| DELETE | `/api/bills/[monthKey]/lock` | Admin | Unlock a month's bill |
| GET | `/api/bills/[monthKey]/calculation` | Apt session | Get computed breakdown for a month |

### 10.6 Adjustments

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/bills/[monthKey]/adjustments` | Apt session | Get adjustments for a month |
| POST | `/api/bills/[monthKey]/adjustments` | Admin or BM | Add an adjustment |
| DELETE | `/api/bills/[monthKey]/adjustments/[id]` | Admin or BM | Delete an adjustment |

### 10.7 Meals

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/meals/[monthKey]` | Apt session | Get all meal data for a month |
| GET | `/api/meals/[monthKey]/checklist` | Apt session | Get weekly checklist data |
| PATCH | `/api/meals/[monthKey]/checklist` | Admin or BM | Toggle a meal slot |
| GET | `/api/meals/[monthKey]/shopping` | Apt session | Get shopping entries for a month |
| POST | `/api/meals/[monthKey]/shopping` | Member session | Add a shopping entry |
| DELETE | `/api/meals/[monthKey]/shopping/[id]` | Member session (own) / Admin-BM | Delete a shopping entry |
| POST | `/api/meals/[monthKey]/finalize` | Admin or BM | Finalize meals for a month |
| DELETE | `/api/meals/[monthKey]/finalize` | Admin | Unfinalize meals for a month |
| GET | `/api/meals/[monthKey]/summary` | Apt session | Get per-member meal cost summary |

### 10.8 Expenses

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/expenses/[monthKey]` | Apt session | Get all expenses for a month |
| POST | `/api/expenses/[monthKey]` | Member session | Add an expense item |
| PATCH | `/api/expenses/[monthKey]/[id]` | Member session (own) / Admin | Update an expense item |
| DELETE | `/api/expenses/[monthKey]/[id]` | Member session (own) / Admin | Delete an expense item |

### 10.9 Dashboard

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard/year-summary` | Apt session | Get full year data for charts |
| GET | `/api/dashboard/current-month` | Apt session | Get current month bill + meal snapshot |

### 10.10 Backup

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/backup/export` | Admin | Export full backup JSON |
| POST | `/api/backup/restore` | Admin | Import and restore a backup JSON |

### 10.11 Danger Zone

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/danger/reset-bills` | Admin | Clear all bill data |
| POST | `/api/danger/reset-meals` | Admin | Clear all meal data |
| POST | `/api/danger/reset-all` | Admin | Wipe all data |

---

## 11. Business Rules

| ID | Rule |
|---|---|
| BR-01 | A month's bill can only be saved once; after saving, it is locked |
| BR-02 | Once locked, a bill can only be unlocked by the Admin via Danger Zone |
| BR-03 | Adjustments can only be applied to **locked** months |
| BR-04 | A member's adjusted total is always ≥ ৳0 |
| BR-05 | Optional costs are split **only among opted-in active members** using ceiling rounding |
| BR-06 | Fixed Bucket (Rent + Gas + Water + Service + in-bucket custom costs) is split via Rent Split config |
| BR-07 | Free members share the Fixed Bucket remainder using `Math.round` |
| BR-08 | Electricity and fixed-split custom costs use `Math.ceil` per head |
| BR-09 | Meal cost is added to a member's monthly bill only after meals are finalized |
| BR-10 | Meal checklist can only be edited by Bill Manager or Admin |
| BR-11 | Per-meal cost = total shopping pool ÷ total meal count (no ceiling — it is fractional) |
| BR-12 | Per-member meal cost = `ceil(perMealCost × memberMealCount)` |
| BR-13 | A member with zero meals in a month has ৳0 meal cost |
| BR-14 | If total meal count = 0, per-meal cost = ৳0 (no division by zero) |
| BR-15 | Shopping entries and meal checklist entries are independent: a member can shop without eating and vice versa |
| BR-16 | Bank account data is visible to all members via the eye icon but can only be edited by Admin |
| BR-17 | A deactivated member is excluded from all cost calculations for months after deactivation |
| BR-18 | Passwords are never returned to the client; they are stripped before any API response |
| BR-19 | NID numbers are stored encrypted and are never included in backup exports |
| BR-20 | Password reset tokens expire in 1 hour and are single-use |
| BR-21 | After 5 consecutive failed member logins, that member's login is locked for 10 minutes |
| BR-22 | The expense carry-forward is directional: only members who spent MORE than the minimum carry their excess forward |
| BR-23 | Bills, meals, and expenses are independent modules; they are combined only in the Monthly Bills Summary |
| BR-24 | Locked bill snapshots store a complete copy of all config at lock time, making them immune to future config changes |
| BR-25 | The Meal Management shopping pool is shared across all members; individual shopping contributions are tracked separately from meal consumption |

---

## 12. Calculation Logic (Detailed)

### 12.1 Worked Example — June 2026

**Configuration:**
- Members: Shimanto (free), Tauqir (free), Parvez (fixed ৳6,500)
- Fixed Costs: Rent ৳20,000 | Gas ৳1,080 | Water ৳1,000 | Service ৳2,000
- Optional Costs: Maid ৳2,500 (all opted in) | WiFi ৳800 (Shimanto + Tauqir opted in, Parvez opted out)
- Electricity: ৳910

**Step 1 — Fixed Bucket:**
```
fixedBucket = 20,000 + 1,080 + 1,000 + 2,000 = 24,080
fixedContributions = 6,500
remaining = 24,080 - 6,500 = 17,580
freeShare = round(17,580 / 2) = 8,790
```

**Step 2 — Optional Costs:**
```
Maid: ceil(2,500 / 3) = 834  ← all 3 opted in
WiFi: ceil(800 / 2) = 400    ← only Shimanto + Tauqir opted in; Parvez pays ৳0
```

**Step 3 — Electricity:**
```
elecPerHead = ceil(910 / 3) = 304
```

**Step 4 — Meal (assume Shimanto 24 meals, Tauqir 22 meals, Parvez 20 meals; pool ৳11,000):**
```
totalMeals = 24 + 22 + 20 = 66
perMealCost = 11,000 / 66 = 166.67
Shimanto meal = ceil(166.67 × 24) = ceil(4,000.08) = 4,001
Tauqir meal   = ceil(166.67 × 22) = ceil(3,666.74) = 3,667
Parvez meal   = ceil(166.67 × 20) = ceil(3,333.40) = 3,334
mealSurplus   = (4,001 + 3,667 + 3,334) - 11,000 = 11,002 - 11,000 = 2
```

**Step 5 — Totals:**

| Component | Shimanto | Tauqir | Parvez |
|---|---|---|---|
| Fixed Bucket | 8,790 | 8,790 | 6,500 |
| Maid | 834 | 834 | 834 |
| WiFi | 400 | 400 | 0 |
| Electricity | 304 | 304 | 304 |
| Meals | 4,001 | 3,667 | 3,334 |
| **Total** | **14,329** | **13,995** | **10,972** |

```
collectedTotal = 14,329 + 13,995 + 10,972 = 39,296
actualBill     = 24,080 + 2,500 + 800 + 910 + 11,000 = 39,290
gap            = 39,296 - 39,290 = ৳6
```

### 12.2 Expense Carry-Forward Example

| | Month 1 (May) | | | Month 2 (June) | | |
|---|---|---|---|---|---|---|
| Member | Spent | Base | Forward | CarryIn | Grand | Extra |
| Shimanto | 1,500 | — | 700 | 700 | 1,300 | 600 |
| Tauqir | 800 | 800 | 0 | 0 | 900 | 200 |
| Parvez | 1,200 | — | 400 | 400 | 700 | 0 |

---

## 13. Tech Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| **Frontend Framework** | Next.js (App Router) | v14+ |
| **React** | React 18 | Server + Client Components |
| **Styling** | Vanilla CSS (CSS Modules) or Tailwind CSS | CSS custom properties for theming |
| **Charts** | Chart.js 4 | Via `react-chartjs-2` wrapper |
| **Fonts** | Figtree + Plus Jakarta Sans | Self-hosted or Google Fonts |
| **Backend** | Next.js Route Handlers (API Routes) | `app/api/...` pattern |
| **ORM** | Prisma | v5+ |
| **Database** | PostgreSQL | v15+ |
| **Authentication** | `jose` (JWT) | HTTP-only cookie sessions |
| **Password Hashing** | `bcryptjs` | Cost factor 12 |
| **Encryption (NID/Bank)** | `crypto` (AES-256-GCM) | Node.js built-in |
| **Email** | Resend or Nodemailer + SMTP | For password reset |
| **Validation** | `zod` | Server-side schema validation |
| **Environment Config** | `.env.local` + Vercel env vars | |
| **Dev Database** | Docker PostgreSQL or Railway.app | |
| **Production Hosting** | Vercel (Next.js) + Railway/Supabase/Neon (PostgreSQL) | |
| **Connection Pooling** | PgBouncer or Prisma Accelerate | For production |

---

## 14. Deployment Architecture

### 14.1 Local Development

```
Developer Machine
├── Next.js dev server (npm run dev → port 3000)
│     ├── App Router pages (/app/...)
│     └── API Route Handlers (/app/api/...)
│
└── PostgreSQL (Docker or Railway free tier)
      └── Database: localhost_dev
```

**Setup steps:**
1. Install Node.js 20 LTS
2. Install PostgreSQL (or use Docker: `docker compose up -d postgres`)
3. Copy `.env.local.example` → `.env.local` and fill in `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `SMTP_*`
4. `npm install`
5. `npx prisma migrate dev`
6. `npm run dev`
7. Open `http://localhost:3000`

### 14.2 Production (Vercel + PostgreSQL Cloud)

```
Internet
    │
    ▼
Vercel Edge Network
    │
    ├── Next.js App (Static + SSR + API Routes)
    │
    └── API Route Handlers
          │
          └── PostgreSQL (Neon / Railway / Supabase)
                via Prisma + Connection Pooling
```

### 14.3 Required Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (with pooler) | ✅ |
| `DIRECT_DATABASE_URL` | Direct PostgreSQL URL (for migrations) | ✅ |
| `JWT_SECRET` | ≥64-char random string for JWT signing | ✅ |
| `ENCRYPTION_KEY` | 32-byte hex string for AES-256 encryption | ✅ |
| `NEXTAUTH_URL` | App base URL (e.g., `https://your-app.vercel.app`) | ✅ |
| `SMTP_HOST` | Email SMTP host | ✅ (for email reset) |
| `SMTP_PORT` | Email SMTP port | ✅ |
| `SMTP_USER` | Email SMTP username | ✅ |
| `SMTP_PASS` | Email SMTP password | ✅ |
| `SMTP_FROM` | Sender address (e.g., `noreply@yourdomain.com`) | ✅ |
| `RESEND_API_KEY` | Alternative: Resend API key | Alternative to SMTP |

---

## 15. Security Requirements

| ID | Requirement |
|---|---|
| SEC-01 | Passwords are hashed with **bcrypt** (cost factor 12) |
| SEC-02 | NID numbers and bank account details are encrypted with **AES-256-GCM** using `ENCRYPTION_KEY` |
| SEC-03 | JWTs are signed with `JWT_SECRET`; HS256 algorithm |
| SEC-04 | JWT tokens include a `jti` (JWT ID) claim for server-side revocation |
| SEC-05 | All cookies are `HttpOnly`, `Secure` (HTTPS), and `SameSite=Strict` |
| SEC-06 | Password hashes and session tokens are **never** returned in any API response |
| SEC-07 | NID data is excluded from all backup exports |
| SEC-08 | `ENCRYPTION_KEY` and `JWT_SECRET` must be set as environment variables; no hard-coded secrets |
| SEC-09 | Rate limiting: 5 failed apartment login attempts → 15-minute IP block; 5 failed member login attempts → 10-minute member account lock |
| SEC-10 | Password reset tokens are stored as SHA-256 hashes of the URL token; the plain token is never stored |
| SEC-11 | All API inputs are validated with `zod` schemas server-side; malformed inputs return 400 |
| SEC-12 | SQL injection is prevented by Prisma's parameterized queries |
| SEC-13 | XSS is prevented by React's automatic JSX escaping |
| SEC-14 | CSRF protection via `SameSite=Strict` cookies |
| SEC-15 | Apartment session is scoped: all queries include an `apartment_id` filter derived from the session — never from user input |

---

## 16. Input Validation & Sanitization Rules

All inputs are validated **both client-side** (real-time, per-field) and **server-side** (via Zod schemas). Client-side validation provides immediate feedback; server-side validation is the authoritative gate.

### 16.1 Apartment Registration

| Field | Client Validation | Server Validation |
|---|---|---|
| Apartment Name | Required; 2–80 chars; shown immediately on blur | Unique in DB; 2–80 chars |
| Password | Min 8 chars; at least 1 number; strength meter | Min 8 chars; at least 1 number |
| Confirm Password | Must match password (live check) | Must match |
| Road No / Address | Required; 2–100 chars | Required; 2–100 chars |
| Postal Code | Required; 4–10 chars; alphanumeric | Required; 4–10 chars |
| City | Required; 2–60 chars | Required; 2–60 chars |
| Country | Required; dropdown | Required; from allowed list |
| NID | Required; 10 or 17 digits (BD) | Required; 10 or 17 digits |
| Phone | Required; BD format +880XXXXXXXXXX | Required; regex validation |
| Email | Required; valid email format | Required; unique in DB |

### 16.2 Member Profile

| Field | Validation |
|---|---|
| Name | Required; 2–80 chars |
| Email | Valid email; unique within apartment if provided |
| Phone | BD format or international format |
| NID | 10 or 17 digits if provided |
| Hometown | 2–80 chars if provided |
| Move-in Date | Valid date; not in the future |

### 16.3 Cost Configuration

| Field | Validation |
|---|---|
| Cost Name | Required; 2–80 chars |
| Amount | Required; positive integer ≥ 0; max ৳9,999,999 |

### 16.4 Meal Shopping

| Field | Validation |
|---|---|
| Item Name | Required; 1–80 chars |
| Amount | Required; positive integer > 0 |
| Date | Required; valid date; not in the future; within selected month |

### 16.5 General Rules

- All text inputs are trimmed of leading/trailing whitespace before saving
- HTML special characters are escaped on output (React handles this automatically)
- Numeric inputs reject non-numeric characters client-side
- File uploads (profile photo) are validated: max 5MB; allowed types: JPEG, PNG, WebP
- Month key format is validated as `YYYY-MM` regex on all API routes

---

## 17. Constraints & Assumptions

| # | Constraint / Assumption |
|---|---|
| C-01 | The application is designed for **private, trusted** user groups (flatmates) |
| C-02 | All monetary values are in Bangladeshi Taka (৳); single-currency system |
| C-03 | All amounts are positive integers in Taka; decimal paise values are not supported |
| C-04 | Maximum practical member count per apartment is 15 |
| C-05 | Profile photos stored as Base64 have a practical limit of ~2MB per photo to avoid bloating the database; consider object storage for larger images |
| C-06 | Meal checklist is manual (Bill Manager confirms meals); there is no automated attendance tracking |
| C-07 | Shopping pool for meals is per-month; it does not carry over across months |
| C-08 | The app has no real-time sync (WebSockets); members must refresh to see updates |
| C-09 | Expense Tracker carry-forward and Meal Management are separate modules; they are not combined |
| C-10 | Month keys use the server's local time zone; all users are assumed to be in the same time zone (Asia/Dhaka) |
| C-11 | Email delivery depends on the configured SMTP provider; email features are unavailable if SMTP is not configured |
| C-12 | The PostgreSQL database must be version 15+ for `gen_random_uuid()` and JSONB features |
| C-13 | Prisma migrations are run manually in production (not auto-migrated on startup) |
| C-14 | An apartment can have only one Admin at a time; re-assigning Admin creates a new Admin and demotes the old one |

---

## 18. Acceptance Criteria

### 18.1 Apartment Registration & Login

- [ ] Registering with all required fields creates an apartment record and logs in automatically
- [ ] Registering with a duplicate apartment name returns a field-level error: "This apartment name is already taken"
- [ ] Signing in with correct credentials sets the `apt_session` cookie and shows the dashboard
- [ ] Invalid credentials return a generic error; no enumeration of which field was wrong
- [ ] The preloader animation runs before checking session; session check happens after animation completes

### 18.2 Member Authentication

- [ ] Member can log in from the sidebar modal using bubble selector + password
- [ ] After login, sidebar shows avatar, name, and role
- [ ] Logging out clears the member session cookie and shows the "Sign in to edit" prompt
- [ ] A non-admin member cannot access any admin-only UI elements (buttons are hidden or show an error)
- [ ] After 5 failed login attempts, the member is locked out for 10 minutes with a countdown message

### 18.3 Member Profile & Password Reset

- [ ] Admin can add a new member with all optional fields filled; member is saved to DB
- [ ] New member default password is `1234`
- [ ] Admin can send a password reset email; the reset link arrives at the member's email
- [ ] The reset link opens a password form; submitting a new password updates the hash and invalidates the token
- [ ] Using an expired or already-used reset link shows an error page
- [ ] NID field in the member card is masked by default; Admin can reveal it via a toggle
- [ ] Member without a set email cannot receive a password reset email; Admin must reset manually

### 18.4 Cost Configuration

- [ ] Admin adds a custom fixed cost "Gas Cylinder — ৳500"; it appears in all future bill calculations
- [ ] Admin marks a custom optional cost "WiFi — ৳800"; unchecking Parvez removes him from the WiFi split
- [ ] Parvez's WiFi cost becomes ৳0; Shimanto and Tauqir each pay `ceil(800/2) = ৳400`
- [ ] Rent Split page shows real-time remaining amount as Admin types a fixed contribution

### 18.5 Monthly Bill Calculation

- [ ] Entering electricity ৳910 with the correct config yields the worked example totals in Section 12.1
- [ ] Locking a bill stores a snapshot; changing a fixed cost after locking does not alter the locked month
- [ ] Adding a ৳500 lend adjustment to Tauqir increases his total by ৳500
- [ ] A member's total after adjustments cannot go below ৳0

### 18.6 Meal Management

- [ ] Bill Manager can toggle a meal slot; the change saves immediately and shows a confirmation animation
- [ ] Non-Bill-Manager members see the checklist in read-only mode
- [ ] Adding shopping items updates the per-meal cost in real time on the page
- [ ] With 66 total meals and ৳11,000 shopping pool, per-meal cost = ৳166.67; Shimanto (24 meals) owes ৳4,001
- [ ] Week navigation arrows move through the correct weeks within the selected month
- [ ] Finalizing meals locks the checklist and adds meal costs to the monthly bill summary
- [ ] Admin can unfinalize a meal month from Danger Zone

### 18.7 Bank Account

- [ ] Admin fills in bank account form for the Bill Manager member; data is saved
- [ ] Eye icon appears on the Bill Manager card in the Monthly Bills and Meal pages
- [ ] Clicking the eye icon shows the bank reference card with formatted account number
- [ ] "Copy Account Number" button copies the number to clipboard
- [ ] Non-admin members cannot see or access the bank account form

### 18.8 Dashboard

- [ ] All seven charts render with at least one locked month of data
- [ ] Switching to light theme re-renders charts in the correct color scheme
- [ ] Stat cards show correct values including meals this month
- [ ] Apartment name and address are shown on the dashboard

### 18.9 Backup & Restore

- [ ] Export downloads a valid JSON file with all data except NID and password hashes
- [ ] Importing the exported file restores all data exactly in a single transaction
- [ ] Importing an invalid backup file returns an error and does not corrupt data
- [ ] After restore, the UI shows fresh data without a page reload

---

## 19. Glossary

| Term | Definition |
|---|---|
| **Fixed Bucket** | Sum of Rent + Gas + Water + Service + any custom costs marked "in bucket"; distributed via Rent Split config |
| **Free Member** | Member without a fixed rent contribution; shares the Fixed Bucket remainder equally |
| **Rent Split** | Config assigning a fixed contribution amount to one or more members for the Fixed Bucket |
| **Optional Cost** | A recurring cost not all members participate in; only opted-in members pay per-head |
| **Ceiling Rounding** | `Math.ceil(amount / n)` — always rounds up; used for electricity, optional costs per head |
| **Rounding Gap** | Surplus from ceiling rounding: collected total minus actual bill |
| **Locked Bill** | A monthly bill saved by Admin/Bill Manager; immutable without Admin unlock |
| **Snapshot** | A stored copy of all configuration at the time a bill or meal month is locked |
| **Adjustment** | A lend/borrow entry that modifies a member's final monthly total |
| **Carry-Forward** | Expense excess carried to the next month; ensures long-term fairness |
| **Meal Slot** | One meal occurrence (e.g., Lunch or Dinner) for one member on one day |
| **Shopping Pool** | Sum of all shopping entry amounts for a month; divided by total meal count to get per-meal cost |
| **Per-Meal Cost** | `totalShoppingPool / totalMealCount` — the cost of one meal unit |
| **Finalized Meals** | A month's meal data confirmed and locked by Bill Manager; triggers meal cost inclusion in the bill |
| **Bill Manager** | Member designated as `billManagerId`; can lock bills and manage the meal checklist |
| **Admin** | Member designated as `adminId`; has full system access |
| **Apartment Session** | JWT stored in `apt_session` cookie; identifies the apartment (30-day lifespan) |
| **Member Session** | JWT stored in `member_session` cookie; identifies the logged-in member (7-day lifespan) |
| **JTI** | JWT ID — unique identifier per token for server-side session revocation |
| **Prisma** | TypeScript ORM used for type-safe PostgreSQL queries and schema migrations |
| **Month Key** | `YYYY-MM` format string; key for all monthly data (bills, meals, expenses) |
| **Apt Registration ID** | Unique system-generated ID for an apartment (e.g., `APT-2026-XXXXX`) |
| **NID** | National Identity Document number (Bangladesh); 10 or 17 digits |
| **AES-256-GCM** | Symmetric encryption algorithm used for NID and bank account data at rest |

---

*End of Business Requirements Document*

---

> **Document Control:** This BRD v2.0 supersedes v1.0 and represents the complete, authoritative specification for the **LocalHost** Apartment Bill Sharing Application. It is optimized for implementation in Next.js with a PostgreSQL database. Any deviation from these requirements during development must be validated against the Business Objectives in Section 2 and the Acceptance Criteria in Section 18.

> **AI Implementation Note:** This document is self-contained. All calculation examples (Section 12), schema definitions (Section 9), API routes (Section 10), and validation rules (Section 16) are sufficient to implement the system without additional context. Start with the database schema (Section 9), then implement auth (Sections 7.1–7.2), then build features in the order listed in Section 7.
