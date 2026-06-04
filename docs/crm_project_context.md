---
last_updated: 2026-05-29
updated_by: agent
trigger: Added non-blocking duplicate checks for mobile/email when registering salespeople or employees.
file_count: 64
table_count: 7 (CRM-specific new tables) + 11 (shared tables from Class Admin)
---

# ACADEX CRM — Project Context

## 1. Project Overview

ACADEX CRM is the internal control panel for the ACADEX ecosystem. It manages class admin accounts, wallets, salespeople, commissions, and platform analytics. Built with React 18 + TypeScript, Vite, and Supabase (shared database with Class Admin app).

## 2. File Registry

| File Path | Type | Purpose |
|-----------|------|---------|
| `src/main.tsx` | config | React app entry point, renders App |
| `src/App.tsx` | config | Root component with BrowserRouter routing and Sonner toaster |
| `src/index.css` | style | Full design system — theme tokens, resets, utility classes, and global component styles |
| `src/services/supabase.ts` | utility | Supabase client initialization from env vars |
| `src/services/auth.ts` | utility | CRM auth — login, logout, getUser, isSuperAdmin (queries crm_users table) |
| `src/services/db.ts` | utility | All Supabase data access functions (dashboard, classes, wallets, salespeople, commissions, CRM users, groups) |
| `src/services/export.ts` | utility | CSV and PDF export helpers using jsPDF autoTable and native Blob, including exportExpensesPDF |
| `src/services/cloudinary.ts` | utility | Unsigned Cloudinary upload helper to resolve secure file URLs |
| `src/hooks/use-mobile.tsx` | hook | Viewport width checker (≤768px = mobile) |
| `src/components/AppLayout.tsx` | component | Layout wrapper — sidebar + topbar + Outlet + auth guard |
| `src/components/AppLayout.module.css` | style | Styles for AppLayout component |
| `src/components/app-sidebar.tsx` | component | Navigation sidebar — role-based link filtering, collapsible, mobile support |
| `src/components/app-sidebar.module.css` | style | Styles for AppSidebar component |
| `src/components/topbar.tsx` | component | Top bar — route title, user info/role badge, logout button |
| `src/components/topbar.module.css` | style | Styles for Topbar component |
| `src/components/PhotoUploadField.tsx` | component | Reusable optional photo upload component with dragzone and preview thumbnail |
| `src/components/PhotoUploadField.module.css` | style | Styles for PhotoUploadField component |
| `src/pages/LoginPage.tsx` | page | CRM staff login — queries crm_users, stores session in localStorage |
| `src/pages/LoginPage.module.css` | style | Styles for LoginPage page |
| `src/pages/DashboardPage.tsx` | page | Overview stats, charts, recent activities feed |
| `src/pages/DashboardPage.module.css` | style | Styles for DashboardPage page |
| `src/pages/ClassesPage.tsx` | page | List all classes with search/filter, links to onboarding |
| `src/pages/ClassesPage.module.css` | style | Styles for ClassesPage page |
| `src/pages/ClassOnboardingPage.tsx` | page | 3-step wizard form to register a new class and assign salesperson |
| `src/pages/ClassOnboardingPage.module.css` | style | Styles for ClassOnboardingPage page |
| `src/pages/ClassDetailPage.tsx` | page | Deep-dive into one class — Overview, Batches, Wallet/Transactions, Management tools |
| `src/pages/ClassDetailPage.module.css` | style | Styles for ClassDetailPage page |
| `src/pages/SalesmanPage.tsx` | page | Manage salespeople team — list, commission rates, add salesman dialog |
| `src/pages/SalesmanPage.module.css` | style | Styles for SalesmanPage page |
| `src/pages/SalesmanDetailPage.tsx` | page | Salesman profile with assigned class grids and payout summaries |
| `src/pages/SalesmanDetailPage.module.css` | style | Styles for SalesmanDetailPage page |
| `src/pages/SalesmanClassDetailPage.tsx` | page | Detailed class parameters and live salesperson payment breakdown |
| `src/pages/SalesmanClassDetailPage.module.css` | style | Styles for SalesmanClassDetailPage page |
| `src/pages/WalletPage.tsx` | page | Centralized wallet management — search class finder, transaction history logs, add funds |
| `src/pages/WalletPage.module.css` | style | Styles for WalletPage page |
| `src/pages/PaymentsPage.tsx` | page | Track all payment transactions across the platform and export PDF logs |
| `src/pages/PaymentsPage.module.css` | style | Styles for PaymentsPage page |
| `src/pages/AnalyticsPage.tsx` | page | Platform metrics, average stats, uptime tracker, and visual trend line charts |
| `src/pages/AnalyticsPage.module.css` | style | Styles for AnalyticsPage page |
| `src/pages/EmployeePage.tsx` | page | Employee directory list and onboard employee modal form |
| `src/pages/EmployeePage.module.css` | style | Styles for EmployeePage page |
| `src/pages/ExpensePage.tsx` | page | Expense tracking log and record expense modal form with dynamic payee dropdown |
| `src/pages/ExpensePage.module.css` | style | Styles for ExpensePage page |
| `src/pages/NotFoundPage.tsx` | page | 404 fallback page |
| `src/pages/NotFoundPage.module.css` | style | Styles for NotFoundPage page |
| `index.html` | config | HTML entry — Google Fonts, meta tags, title |
| `vite.config.ts` | config | Vite config — React plugin, @/ path alias |
| `tsconfig.app.json` | config | TypeScript config — path aliases, ignoreDeprecations config |
| `netlify.toml` | config | Netlify SPA redirect rules |
| `.env` | config | Supabase URL and anon key |
| `package.json` | config | Project dependencies, scripts, and metadata |
| `package-lock.json` | config | Locked dependency tree for deterministic builds |
| `eslint.config.js` | config | ESLint configuration for code quality and linting rules |
| `tsconfig.json` | config | TypeScript project root configuration |
| `tsconfig.node.json` | config | TypeScript configuration for Vite/Node environment |
| `.gitignore` | config | Specifies files and directories to ignore in git version control |
| `README.md` | config | Project documentation overview and developer setup instructions |
| `schema.json` | config | Empty database schema declaration file |
| `docs/crm_project_context.md` | config | Project metadata, file registry, routing, hierarchy, and data flow documentation |
| `docs/crm_supabase_and_system_structure.md` | config | Supabase database schema, RLS, system architecture, and system integration documentation |
| `src/assets/hero.png` | asset | Hero illustration image used in the application |
| `src/assets/react.svg` | asset | React framework SVG icon logo |
| `src/assets/vite.svg` | asset | Vite build tool SVG icon logo |

## 3. Routing Structure

| Route | Page Component | Role Access | Description |
|-------|---------------|-------------|-------------|
| `/` | Redirect → `/login` | Public | Root redirect |
| `/login` | `LoginPage` | Public | CRM staff login page |
| `/dashboard` | `DashboardPage` | Both | Main metrics dashboard |
| `/classes` | `ClassesPage` | Both | Coaching classes list with search & filter |
| `/classes/new` | `ClassOnboardingPage` | Both | 3-step class onboarding wizard |
| `/classes/:id` | `ClassDetailPage` | Both | Details tabbed dashboard (Overview, Batches, Wallet, Groups) |
| `/salesman` | `SalesmanPage` | SUPER_ADMIN | Manage salespeople and commission rates |
| `/salesman/:id` | `SalesmanDetailPage` | Both | Salesperson performance dashboard & assigned classes |
| `/salesman/:salesmanId/classes/:classId` | `SalesmanClassDetailPage` | Both | Commission details for a salesperson's specific class |
| `/employees` | `EmployeePage` | SUPER_ADMIN | Internal employee directory listing |
| `/expenses` | `ExpensePage` | SUPER_ADMIN | Organization expenditure ledger logs |
| `/wallet` | `WalletPage` | SUPER_ADMIN | Platform-wide wallet balance logs and fund injection |
| `/payments` | `PaymentsPage` | Both | Unified transaction tracking list and PDF exports |
| `/analytics` | `AnalyticsPage` | SUPER_ADMIN | Advanced platform trends, avg students, and retention |
| `*` | `NotFoundPage` | Public | 404 Page Not Found |

## 4. Component Hierarchy

```
App
├── LoginPage [page]
├── NotFoundPage [page]
└── AppLayout [layout]
    ├── AppSidebar [shared]
    ├── Topbar [shared]
    ├── PhotoUploadField [shared]
    └── <Outlet>
        ├── DashboardPage [page]
        ├── ClassesPage [page]
        ├── ClassOnboardingPage [page] (3-step wizard)
        ├── ClassDetailPage [page]
        │   ├── OverviewTab (inline)
        │   ├── BatchesTab (inline)
        │   │   └── BatchDetailsModal (inline)
        │   ├── WalletTab (inline)
        │   │   └── AddFundsDialog (inline)
        │   ├── GroupsTab (inline)
        │   ├── EditClassDialog (inline)
        │   ├── ResetPasswordDialog (inline)
        │   └── SetupCredentialsDialog (inline)
        ├── SalesmanPage [page]
        │   ├── AddSalesmanDialog (inline)
        │   └── EditSalesmanDialog (inline)
        ├── EmployeePage [page]
        │   ├── AddEmployeeDialog (inline)
        │   └── EditEmployeeDialog (inline)
        ├── ExpensePage [page]
        │   └── AddExpenseDialog (inline)
        ├── SalesmanDetailPage [page]
        │   └── EditSalesmanDialog (inline)
        ├── SalesmanClassDetailPage [page]
        ├── WalletPage [page]
        │   └── AddFundsDialogInline (inline)
        ├── PaymentsPage [page]
        └── AnalyticsPage [page]
```

## 5. State Management

| Provider / Store | File | State Held | Consumers |
|-----------------|------|------------|-----------|
| localStorage `acadex_crm_auth` | `src/services/auth.ts` | CRM user session (userId, fullName, email, role, salespersonId, ts) | All pages, AppLayout, Sidebar, Topbar |

No React Context or global store is used — all state is local component state (`useState`) with data fetched on mount via `useEffect`.

## 6. Custom Hooks

| Hook | File | Purpose | Parameters | Return | Consumers | Supabase |
|------|------|---------|-----------|--------|-----------|----------|
| `useMobile` | `src/hooks/use-mobile.tsx` | Detect mobile viewport | `breakpoint?: number` (default 768) | `boolean` | AppLayout, AppSidebar | No |

## 7. Pages & Data Flow

| Page | Route | Data Reads | Data Writes | Components | Loading | Real-time |
|------|-------|-----------|-------------|------------|---------|-----------|
| LoginPage | `/login` | crm_users, salespeople | localStorage | — | spinner | No |
| DashboardPage | `/dashboard` | crm_class_registrations, students, wallets, wallet_transactions, class_owners, batch_enrollments, employees, crm_expenses, salespeople, class_salesperson_assignments | — | Recharts BarChart, LineChart | skeleton | No |
| ClassesPage | `/classes` | class_owners, users, crm_class_registrations, wallets, class_salesperson_assignments, salespeople, batch_enrollments, batches | — | — | skeleton | No |
| ClassOnboardingPage | `/classes/new` | salespeople | users, class_owners, wallets, crm_class_registrations, class_salesperson_assignments | 3-step wizard | spinner | No |
| ClassDetailPage | `/classes/:id` | crm_class_registrations, class_owners, users, wallets, class_salesperson_assignments, salespeople, batches, batch_enrollments, wallet_transactions, groups, lectures, tests, attendance, test_marks | wallets, wallet_transactions, crm_class_registrations, class_salesperson_assignments | OverviewTab, BatchesTab, WalletTab, GroupsTab, AddFundsDialog, EditClassDialog, ResetPasswordDialog | skeleton | No |
| SalesmanPage | `/salesman` | salespeople, class_salesperson_assignments, batches, batch_enrollments, class_owners, wallets, crm_class_registrations | crm_users, salespeople, class_salesperson_assignments | AddSalesmanDialog, EditSalesmanDialog | skeleton | No |
| SalesmanDetailPage | `/salesman/:id` | salespeople, class_salesperson_assignments, class_owners, users, wallets, crm_class_registrations, batches, batch_enrollments | salespeople, class_salesperson_assignments | EditSalesmanDialog | skeleton | No |
| SalesmanClassDetailPage | `/salesman/:salesmanId/classes/:classId` | salespeople, class_salesperson_assignments, class_owners, users, wallets, crm_class_registrations, batches, batch_enrollments | — | — | skeleton | No |
| EmployeePage | `/employees` | employees | employees | AddEmployeeDialog, EditEmployeeDialog | skeleton | No |
| ExpensePage | `/expenses` | crm_expenses, employees | crm_expenses | AddExpenseDialog | skeleton | No |
| WalletPage | /wallet | wallets, class_owners, users, wallet_transactions | wallets, wallet_transactions | AddFundsDialogInline | skeleton | Yes |
| PaymentsPage | `/payments` | wallet_transactions, class_owners, users | — | — | skeleton | No |
| AnalyticsPage | `/analytics` | students, wallet_transactions, wallets, crm_class_registrations | — | Recharts AreaChart, LineChart | skeleton | No |

## 8. Forms & Validation

| Form | Location | Fields | Validation |
|------|----------|--------|------------|
| Login | LoginPage | email*, password* | Required, show/hide password toggle |
| Class Onboarding Wizard | ClassOnboardingPage | Step 1: instituteName*, ownerFullName*, ownerMobile, alternateMobile, ownerEmail*, salespersonId, classPhotoFile, ownerPhotoFile, classLogoFile, officeAddress, city, state, pincode (6-digit), deductionPerStudent*, notes; Step 2: Section A (Mandatory Class Admin): username*, password*, confirmPassword*; Section B (Optional Payment Board): paymentBoardEnabled toggle, paymentBoardUsername*, paymentBoardPassword*, paymentBoardConfirmPassword* (conditional) | Step-by-step validations, automatic username suggestion for Section A (appends @acadex.in), conditional credentials validation for Section B when enabled (no suffix), deduction > 0. Selected images are uploaded to Cloudinary, and URLs saved inside the stringified notes column JSON. |
| Setup Credentials | ClassDetailPage > SetupCredentialsDialog | username*, password*, confirmPassword* | Required fields, checks that password and confirmPassword match |
| Add Funds | ClassDetailPage > AddFundsDialog / WalletPage > AddFundsDialogInline | amount*, paymentMode, reference, note | Amount > 0 required |
| Edit Class | ClassDetailPage > EditClassDialog | instituteName*, city, ownerFullName*, ownerMobile*, ownerEmail*, alternateMobile, officeAddress, state, pincode, deductionPerStudent*, status, salespersonIds | Required fields validation before calling DB update, supports multi-salesperson assignments |
| Add Salesperson | SalesmanPage > AddSalesmanDialog | fullName*, mobile*, email*, commissionPerStudent*, bankName, bankIfsc, bankAccountNumber, assignedClassIds, profilePhoto | Required fields checked, validates input, assigns selected classes to salesperson. Uploads optional profile photo to Cloudinary first and saves url to salespeople table. |
| Edit Salesperson | SalesmanPage/SalesmanDetailPage > EditSalesmanDialog | fullName*, mobile*, email*, commissionPerStudent*, bankName, bankIfsc, bankAccountNumber, assignedClassIds | Required fields checked, updates profile and updates assigned classes list |
| Add Employee | EmployeePage > AddEmployeeDialog | name*, mobile, address, role, bank_name, account_number, ifsc_code, assigned_salary, profilePhoto | Name required, salary must be numeric. Uploads optional profile photo to Cloudinary first and saves url to employees table. |
| Edit Employee | EmployeePage > EditEmployeeDialog | name*, mobile, address, role, bank_name, account_number, ifsc_code, assigned_salary, profilePhoto | Name required, salary must be numeric. Uploads or replaces profile photo via Cloudinary and updates profile_photo_url. |
| Add Expense | ExpensePage > AddExpenseDialog | title*, pay_to_type*, employee_id (conditional), pay_to_name (conditional), amount*, expense_date*, reason | Title, amount, date required; amount > 0; employee required if pay_to_type is EMPLOYEE; payee name required if pay_to_type is OTHER |

## 9. Auth UI Layer

- Login page at `/login` — queries `crm_users` table directly
- Session stored in `localStorage` under key `acadex_crm_auth`
- Auth guard in `AppLayout` via `useEffect` — redirects to `/login` if no session
- Role-based route protection via `ProtectedRoute` component in `App.tsx`
- Role-based UI hiding in Sidebar (nav links) and individual pages (buttons, columns)
- Two roles: `SUPER_ADMIN` (full access), `SALES_MANAGER` (limited access)

## 10. Supabase Client Usage Map

| File | Tables Queried/Modified | Operations |
|------|------------------------|------------|
| `src/services/auth.ts` | crm_users, salespeople | SELECT (login lookup + salesperson ID fetch) |
| `src/services/db.ts` | crm_class_registrations, students, batches, wallets, wallet_transactions, class_owners, users, batch_enrollments, class_salesperson_assignments, salespeople, crm_users, groups, lectures, tests, attendance, test_marks, employees, crm_expenses | SELECT, INSERT, UPDATE, DELETE |
| `src/pages/ClassDetailPage.tsx` | batch_enrollments, batches, students | SELECT (direct query for student growth curve load) |
| `src/pages/SalesmanPage.tsx` | salespeople | SELECT (duplicate check) |
| `src/pages/EmployeePage.tsx` | employees | SELECT (duplicate check) |
| `src/services/supabase.ts` | — | Client initialization only |

## 11. Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.6 | UI framework |
| react-dom | ^19.2.6 | React DOM renderer |
| react-router-dom | ^7.15.1 | Client-side routing |
| @supabase/supabase-js | ^2.106.1 | Supabase PostgreSQL client |
| recharts | ^3.8.1 | Platform charts |
| lucide-react | ^1.16.0 | Icon library |
| sonner | ^2.0.7 | Toast notifications |
| jspdf | ^4.2.1 | Client-side PDF generation |
| jspdf-autotable | ^5.0.8 | PDF AutoTable table generation plugin |
| clsx | ^2.1.1 | Conditional class names utility |
| class-variance-authority | ^0.7.1 | Variant-based component styling |

## 12. Build & Config

| Config File | Key Settings |
|-------------|-------------|
| `vite.config.ts` | React plugin, `@/` → `./src` path alias |
| `tsconfig.app.json` | ES2023 target, bundler moduleResolution, `@/*` path alias, JSX react-jsx |
| `netlify.toml` | SPA redirect: `/*` → `/index.html` (status 200) |

## 13. Environment Variables

| Variable | File(s) Using It | Purpose |
|----------|-----------------|---------|
| `VITE_SUPABASE_URL` | `src/services/supabase.ts` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `src/services/supabase.ts` | Supabase anonymous key |
| `VITE_CLOUDINARY_CLOUD_NAME` | `src/services/cloudinary.ts` | Cloudinary cloud identifier name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | `src/services/cloudinary.ts` | Unsigned upload preset for image uploads |

## 14. Known Issues & TODOs

- [ ] Password storage is plain text (matching Class Admin pattern) — hash with bcrypt before production
- [ ] No RLS policies on CRM tables — enable before production
- [ ] No real-time subscriptions — consider for wallet balance updates
- [ ] SALES_MANAGER role filtering on ClassesPage depends on `salespersonId` being present in localStorage auth
