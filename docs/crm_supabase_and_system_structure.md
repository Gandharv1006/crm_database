---
last_updated: 2026-05-29
updated_by: agent
trigger: Added class_owners ALTER TABLE column additions in Section 11 migration script.
table_count: 7 (CRM-specific new tables: crm_users, salespeople, class_salesperson_assignments, salesperson_commissions, crm_class_registrations, employees, crm_expenses) + 2 (added shared tables)
---

# ACADEX CRM — Supabase & System Structure

## 1. Overview

ACADEX CRM shares a Supabase PostgreSQL instance with the ACADEX Class Admin app. The CRM introduces 5 new tables for managing CRM staff, salespeople, class assignments, commissions, and class registrations. It reads from existing Class Admin tables (users, class_owners, batches, students, wallets, etc.) but never modifies academic domain tables.

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE POSTGRESQL DB                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  CRM DOMAIN  │  │ SHARED DOMAIN│  │ CLASS ADMIN DOMAIN   │  │
│  │              │  │              │  │   (read-only by CRM) │  │
│  │  crm_users   │  │  users       │  │  batches             │  │
│  │  salespeople  │  │  class_owners│  │  batch_enrollments   │  │
│  │  class_sales- │  │  wallets     │  │  students            │  │
│  │  person_      │  │  wallet_     │  │  faculty             │  │
│  │  assignments  │  │  transactions│  │  lectures            │  │
│  │  salesperson_ │  │              │  │  tests               │  │
│  │  commissions  │  │              │  │  attendance          │  │
│  │  crm_class_   │  │              │  │  test_marks          │  │
│  │  registrations│  │              │  │  groups              │  │
│  │  employees    │  │              │  │                      │  │
│  │  crm_expenses │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐
│  ACADEX CRM      │       │  ACADEX CLASS    │
│  (React SPA)     │───────│  ADMIN (React)   │
│  This project    │       │  Existing app    │
└──────────────────┘       └──────────────────┘
```

## 3. React Frontend Overview

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Plain CSS Modules with premium dark-themed custom CSS design system
- **Routing**: React Router DOM v7 — 14 routes (2 public, 12 protected)
- **Pages**: 13 (Login, Dashboard, Classes, Onboarding Wizard, Class Detail, Salesman List, Salesman Detail, Salesman Class Detail, Wallet, Payments, Analytics, Employees, Expenses) + 1 NotFound
- **Auth**: Custom table-based auth (crm_users table → localStorage session)
- **State**: Local component state only (no global store)

## 4. Database Tables

### CRM-Specific Tables (NEW — created by CRM)

#### `crm_users`
CRM staff accounts (Super Admins and Sales Managers).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| crm_user_id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| full_name | VARCHAR(100) | NOT NULL | Staff member's name |
| email | VARCHAR(150) | UNIQUE, NOT NULL | Login email |
| mobile | VARCHAR(15) | — | Phone number |
| password_hash | VARCHAR(255) | NOT NULL, DEFAULT '' | Plain-text password (dev mode) |
| role | VARCHAR(30) | NOT NULL, CHECK IN ('SUPER_ADMIN','SALES_MANAGER') | CRM role |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

#### `salespeople`
Salesperson profiles linked to CRM users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| salesperson_id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| crm_user_id | INTEGER | UNIQUE, FK → crm_users(crm_user_id) ON DELETE CASCADE | Linked CRM account |
| full_name | VARCHAR(100) | NOT NULL | Salesperson name |
| mobile | VARCHAR(15) | — | Phone number |
| email | VARCHAR(150) | — | Email address |
| bank_name | VARCHAR(100) | — | Bank Name |
| bank_ifsc | VARCHAR(20) | — | Bank IFSC Code |
| bank_account_number | VARCHAR(50) | — | Bank Account Number |
| commission_per_student | NUMERIC(10,2) | NOT NULL, DEFAULT 20.00 | Commission rate per student |
| profile_photo_url | TEXT | — | Profile photo URL string from Cloudinary |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

#### `class_salesperson_assignments`
Which salesperson is assigned to which class owner.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| assignment_id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| owner_id | INTEGER | NOT NULL, FK → class_owners(owner_id) ON DELETE CASCADE | Class owner |
| salesperson_id | INTEGER | NOT NULL, FK → salespeople(salesperson_id) ON DELETE CASCADE | Assigned salesperson |
| assigned_at | TIMESTAMP | DEFAULT NOW() | Assignment timestamp |
| — | — | UNIQUE(owner_id, salesperson_id) | One assignment per pair |

#### `salesperson_commissions`
Commission records — one per class assignment (₹20 per class).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| commission_id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| salesperson_id | INTEGER | NOT NULL, FK → salespeople(salesperson_id) ON DELETE CASCADE | Who earned it |
| owner_id | INTEGER | NOT NULL, FK → class_owners(owner_id) ON DELETE CASCADE | Which class |
| amount | NUMERIC(10,2) | NOT NULL, DEFAULT 20.00 | Commission amount |
| description | TEXT | — | Description note |
| status | VARCHAR(20) | DEFAULT 'PENDING', CHECK IN ('PENDING','PAID') | Payment status |
| earned_at | TIMESTAMP | DEFAULT NOW() | When earned |

**Indexes**: `idx_commissions_salesperson(salesperson_id)`, `idx_commissions_owner(owner_id)`

#### `crm_class_registrations`
Tracks when a class was registered in the CRM.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| registration_id | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| owner_id | INTEGER | NOT NULL, UNIQUE, FK → class_owners(owner_id) ON DELETE CASCADE | Class owner |
| registered_by | INTEGER | FK → crm_users(crm_user_id) | Who registered |
| institute_name | VARCHAR(150) | — | Institute name snapshot |
| city | VARCHAR(80) | — | City snapshot |
| plan_type | VARCHAR(50) | DEFAULT 'STANDARD' | Plan type |
| status | VARCHAR(20) | DEFAULT 'ACTIVE', CHECK IN ('ACTIVE','INACTIVE','SUSPENDED') | Registration status |
| registered_at | TIMESTAMP | DEFAULT NOW() | Registration timestamp |
| notes | TEXT | — | Notes |

**Indexes**: `idx_crm_registrations_owner(owner_id)`

#### `employees`
Internal employee records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| employee_id | SERIAL | PRIMARY KEY | Auto-incrementing employee ID |
| name | VARCHAR(100) | NOT NULL | Employee full name |
| mobile | VARCHAR(15) | — | Mobile contact number |
| address | TEXT | — | Contact address |
| role | VARCHAR(50) | — | Employee role/designation |
| account_number | VARCHAR(50) | — | Bank account number |
| bank_name | VARCHAR(100) | — | Bank name |
| ifsc_code | VARCHAR(20) | — | Bank IFSC code |
| assigned_salary | NUMERIC(10,2) | NOT NULL, DEFAULT 0.00 | Monthly salary payout amount |
| profile_photo_url | TEXT | — | Profile photo URL string from Cloudinary |
| created_at | TIMESTAMP | DEFAULT NOW() | Onboarding date |

#### `crm_expenses`
Operational expenses ledger.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| expense_id | SERIAL | PRIMARY KEY | Auto-incrementing expense ID |
| title | VARCHAR(150) | NOT NULL | Title of the expense |
| pay_to_type | VARCHAR(20) | NOT NULL, CHECK IN ('EMPLOYEE','OTHER') | Type of payee |
| employee_id | INTEGER | FK → employees(employee_id) ON DELETE SET NULL | Reference to employee table |
| pay_to_name | VARCHAR(150) | — | Custom payee name if pay_to_type is OTHER |
| amount | NUMERIC(10,2) | NOT NULL | Expense amount |
| expense_date | DATE | NOT NULL, DEFAULT CURRENT_DATE | Date the expense occurred |
| reason | TEXT | — | Additional notes or description |
| created_at | TIMESTAMP | DEFAULT NOW() | Transaction log date |

### Shared Tables (from Class Admin — READ by CRM)

#### `users`
All user accounts across the ecosystem.

| Column | Type | Key Columns |
|--------|------|-------------|
| user_id | SERIAL PK | full_name, email, mobile, username, password_hash, role, created_at |

#### `class_owners`
Academy owner profiles.

| Column | Type | Constraints / Description |
|--------|------|-------------|
| owner_id | SERIAL PK | user_id (FK → users), institute_name, city, contact |
| class_admin_username | VARCHAR(100) | Username for Class Admin login |
| class_admin_password | VARCHAR(100) | Password for Class Admin login |
| payment_board_enabled | BOOLEAN | Toggle status for payment board credentials |
| payment_board_username | VARCHAR(100) | Username for payment board |
| payment_board_password | VARCHAR(100) | Password for payment board |
| wallet_balance_cache | NUMERIC(10,2) | Cached wallet balance for class owner |

#### `wallets`
One wallet per class owner.

| Column | Type | Key Columns |
|--------|------|-------------|
| wallet_id | SERIAL PK | owner_id (FK → class_owners), balance, deduction_per_student |

#### `wallet_transactions`
Deposit and deduction history.

| Column | Type | Key Columns |
|--------|------|-------------|
| transaction_id | SERIAL PK | owner_id, amount, transaction_type ('DEPOSIT'/'DEDUCTION'), description, created_at |

#### `batches`
Academic batches per class.

| Column | Type | Key Columns |
|--------|------|-------------|
| batch_id | SERIAL PK | owner_id, batch_name, batch_code, subject, start_date, status |

#### `batch_enrollments`
Student-to-batch mappings.

| Column | Type | Key Columns |
|--------|------|-------------|
| enrollment_id | SERIAL PK | batch_id (FK → batches), student_id (FK → students), roll_number |

#### `students`
Student profiles.

| Column | Type | Key Columns |
|--------|------|-------------|
| student_id | SERIAL PK | user_id (FK → users), guardian_name, guardian_contact, city, address |

#### `groups`
Chat groups per batch.

| Column | Type | Key Columns |
|--------|------|-------------|
| group_id | SERIAL PK | batch_id, group_name, group_type, created_at |

## 5. Entity Relationships

```
crm_users ──1:1──> salespeople
salespeople ──1:M──> class_salesperson_assignments
class_owners ──1:M──> class_salesperson_assignments
salespeople ──1:M──> salesperson_commissions
class_owners ──1:M──> salesperson_commissions
crm_users ──1:M──> crm_class_registrations (registered_by)
class_owners ──1:1──> crm_class_registrations
users ──1:1──> class_owners
class_owners ──1:1──> wallets
class_owners ──1:M──> wallet_transactions (via owner_id)
class_owners ──1:M──> batches
batches ──1:M──> batch_enrollments
students ──1:M──> batch_enrollments
batches ──1:M──> groups
employees ──1:M──> crm_expenses
```

## 6. RLS Policies

Currently **RLS is DISABLED** on all CRM tables for development. Before production deployment:
- Enable RLS on all 7 CRM tables
- Add policies restricting access to authenticated CRM users
- Consider migrating auth to native Supabase `auth.users`

| Table | RLS Status | Notes |
|-------|-----------|-------|
| crm_users | DISABLED | Dev mode — grant all |
| salespeople | DISABLED | Dev mode — grant all |
| class_salesperson_assignments | DISABLED | Dev mode — grant all |
| salesperson_commissions | DISABLED | Dev mode — grant all |
| crm_class_registrations | DISABLED | Dev mode — grant all |
| employees | DISABLED | Dev mode — grant all |
| crm_expenses | DISABLED | Dev mode — grant all |

## 7. Auth System

- **Method**: Custom table-based auth (NOT Supabase auth.users)
- **Login flow**: Query `crm_users` table by email + password_hash + is_active
- **Session**: Stored in `localStorage` under key `acadex_crm_auth`
- **Session payload**: `{ userId, fullName, email, role, salespersonId?, ts }`
- **Roles**: SUPER_ADMIN (full access), SALES_MANAGER (limited)
- **Password**: Plain text for development (same pattern as Class Admin)
- **Production plan**: Migrate to bcrypt hashing + Supabase native auth

## 8. Storage Buckets

No Supabase storage buckets are currently used by the CRM.

## 9. Realtime Subscriptions

- **Wallet transactions sync**: `WalletPage` subscribes to INSERT events on `wallet_transactions` to dynamically update active class wallet balances and transactions feed.

## 10. Edge Functions

No Supabase Edge Functions are currently used by the CRM.

## 11. SQL Migration Script

The following SQL should be run in the Supabase SQL editor to create the CRM tables (including the missing shared wallet tables):

```sql
-- class_owners credentials and wallet cache columns
ALTER TABLE public.class_owners ADD COLUMN IF NOT EXISTS class_admin_username VARCHAR(100);
ALTER TABLE public.class_owners ADD COLUMN IF NOT EXISTS class_admin_password VARCHAR(100);
ALTER TABLE public.class_owners ADD COLUMN IF NOT EXISTS payment_board_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.class_owners ADD COLUMN IF NOT EXISTS payment_board_username VARCHAR(100);
ALTER TABLE public.class_owners ADD COLUMN IF NOT EXISTS payment_board_password VARCHAR(100);
ALTER TABLE public.class_owners ADD COLUMN IF NOT EXISTS wallet_balance_cache NUMERIC(10,2) DEFAULT 0.00;

-- wallets
CREATE TABLE IF NOT EXISTS public.wallets (
  wallet_id             SERIAL PRIMARY KEY,
  owner_id              INTEGER NOT NULL UNIQUE REFERENCES public.class_owners(owner_id) ON DELETE CASCADE,
  balance               NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  deduction_per_student NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- wallet_transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  transaction_id   SERIAL PRIMARY KEY,
  owner_id         INTEGER NOT NULL REFERENCES public.wallets(owner_id) ON DELETE CASCADE,
  amount           NUMERIC(10,2) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'DEDUCTION')),
  description      TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- crm_users
CREATE TABLE IF NOT EXISTS crm_users (
  crm_user_id   SERIAL PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  mobile        VARCHAR(15),
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  role          VARCHAR(30) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'SALES_MANAGER')),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

INSERT INTO crm_users (full_name, email, mobile, password_hash, role)
VALUES ('CRM Admin', 'admin@acadex.in', '9999999999', 'admin123', 'SUPER_ADMIN')
ON CONFLICT DO NOTHING;

-- salespeople
CREATE TABLE IF NOT EXISTS salespeople (
  salesperson_id SERIAL PRIMARY KEY,
  crm_user_id    INTEGER UNIQUE REFERENCES crm_users(crm_user_id) ON DELETE CASCADE,
  full_name      VARCHAR(100) NOT NULL,
  mobile         VARCHAR(15),
  email          VARCHAR(150),
  bank_name      VARCHAR(100),
  bank_ifsc      VARCHAR(20),
  bank_account_number VARCHAR(50),
  commission_per_student NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  profile_photo_url TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- class_salesperson_assignments
CREATE TABLE IF NOT EXISTS class_salesperson_assignments (
  assignment_id  SERIAL PRIMARY KEY,
  owner_id       INTEGER NOT NULL REFERENCES class_owners(owner_id) ON DELETE CASCADE,
  salesperson_id INTEGER NOT NULL REFERENCES salespeople(salesperson_id) ON DELETE CASCADE,
  assigned_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner_id, salesperson_id)
);

-- salesperson_commissions
CREATE TABLE IF NOT EXISTS salesperson_commissions (
  commission_id  SERIAL PRIMARY KEY,
  salesperson_id INTEGER NOT NULL REFERENCES salespeople(salesperson_id) ON DELETE CASCADE,
  owner_id       INTEGER NOT NULL REFERENCES class_owners(owner_id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  description    TEXT,
  status         VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
  earned_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_salesperson ON salesperson_commissions(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_commissions_owner ON salesperson_commissions(owner_id);

-- crm_class_registrations
CREATE TABLE IF NOT EXISTS crm_class_registrations (
  registration_id SERIAL PRIMARY KEY,
  owner_id        INTEGER NOT NULL UNIQUE REFERENCES class_owners(owner_id) ON DELETE CASCADE,
  registered_by   INTEGER REFERENCES crm_users(crm_user_id),
  institute_name  VARCHAR(150),
  city            VARCHAR(80),
  plan_type       VARCHAR(50) DEFAULT 'STANDARD',
  status          VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  registered_at   TIMESTAMP DEFAULT NOW(),
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_crm_registrations_owner ON crm_class_registrations(owner_id);

-- employees
CREATE TABLE IF NOT EXISTS public.employees (
  employee_id     SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  mobile          VARCHAR(15),
  address         TEXT,
  role            VARCHAR(50),
  account_number  VARCHAR(50),
  bank_name       VARCHAR(100),
  ifsc_code       VARCHAR(20),
  assigned_salary NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  profile_photo_url TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- crm_expenses
CREATE TABLE IF NOT EXISTS public.crm_expenses (
  expense_id      SERIAL PRIMARY KEY,
  title           VARCHAR(150) NOT NULL,
  pay_to_type     VARCHAR(20) NOT NULL CHECK (pay_to_type IN ('EMPLOYEE', 'OTHER')),
  employee_id     INTEGER REFERENCES public.employees(employee_id) ON DELETE SET NULL,
  pay_to_name     VARCHAR(150),
  amount          NUMERIC(10,2) NOT NULL,
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  reason          TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
```

## 12. Environment & Deployment Variables

| Variable | Purpose | Where Used |
|----------|---------|-----------|
| `VITE_SUPABASE_URL` | Supabase project URL | `src/services/supabase.ts` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous API key | `src/services/supabase.ts` |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `src/services/cloudinary.ts` |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned upload preset | `src/services/cloudinary.ts` |

## 13. Security Model Summary

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| `anon` (Supabase) | Full access (RLS disabled for dev) | — |
| `authenticated` | Full access (RLS disabled for dev) | — |
| `SUPER_ADMIN` (CRM) | All features — dashboard, classes, onboarding wizard, details tab, wallet page, salesman list, payments ledger, employees directory, expenses ledger, and analytics page. | — |
| `SALES_MANAGER` (CRM) | Dashboard (general/own stats), assigned classes list/details, own salesman profile and assigned class commission details | Global wallet page, salesmen directory, platform analytics page, onboarding new classes, adding wallet funds, employees directory, expenses ledger |

**Production TODO**: Enable RLS, restrict anon access, migrate auth to Supabase native.

## 14. Key User Action Data Flows

### Class Registration (CRM)
1. CRM admin fills Onboarding Wizard → `users` INSERT (OWNER role, with custom Section A credentials) → `class_owners` INSERT → `wallets` INSERT (with custom deduction rate) → `crm_class_registrations` INSERT (with serialized JSON notes containing address, pincode, state, alternate mobile, `paymentBoardEnabled` flag, `classPhotoUrl`, `ownerPhotoUrl`, `classLogoUrl`, and optionally `paymentBoardUsername` and `paymentBoardPassword` if Section B credentials are enabled)
2. If salesperson assigned → `class_salesperson_assignments` INSERT. (Commissions are calculated dynamically live based on enrolled student counts: `students * commission_per_student`)

### Wallet Top-up (CRM)
1. CRM admin clicks Add Funds → `wallets` UPDATE (balance += amount) → `wallet_transactions` INSERT (type: DEPOSIT, with payment metadata)

### Salesperson Onboarding
1. CRM admin fills Add Salesman form → `crm_users` INSERT (role: SALES_MANAGER) → `salespeople` INSERT (with customized commission per student, bank details, assigned area, and optional `profile_photo_url` from Cloudinary)

### Commission Calculation (Dynamic)
1. Live payment breakdown: count distinct `student_id` in `batch_enrollments` for all batches of a class → multiply by `commission_per_student` set on salesperson profile.

### Employee Onboarding
1. CRM admin registers employee details → `employees` INSERT (with optional `profile_photo_url` from Cloudinary).

### Expense Voucher Logging
1. CRM admin records expense title, payee selection, amount, date, and description → `crm_expenses` INSERT (with conditional mapping to `employee_id` or custom string `pay_to_name`).
