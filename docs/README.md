# ZICTIA Customer Portal — Technical Documentation

## 1. Technologies Used

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.3.1 | UI library |
| | TypeScript | 5.4.5 | Type safety |
| | Tailwind CSS | 3.4.3 | Utility-first styling |
| | Vite | 5.2.12 | Build tool & dev server |
| | React Router DOM | 6.23.1 | Client-side routing |
| | react-i18next | 14.1.2 | Bilingual support (EN / SW) |
| | react-query | 3.39.3 | Server-state caching |
| | Zustand | 4.5.2 | Client state (auth) |
| | recharts | 2.12.7 | Analytics charts |
| | axios | 1.7.2 | HTTP client |
| **Backend** | Node.js | >= 20.0.0 | Runtime |
| | Express | 4.19.2 | Web framework |
| | TypeScript | 5.4.5 | Type safety |
| | Prisma ORM | 5.14.0 | Database access & migrations |
| | PostgreSQL | 15+ | Primary database |
| | Redis | 7+ | Sessions, rate limits, job queue |
| | Bull | 4.12.9 | Background job queue |
| | JWT (jsonwebtoken) | 9.0.2 | Authentication (RS256) |
| | bcrypt | 5.1.1 | Password hashing |
| | Zod | 3.23.8 | Request validation |
| | Winston | 3.13.0 | Structured logging |
| | MinIO SDK | 7.1.3 | S3-compatible file storage |
| | Nodemailer | 6.9.13 | Email delivery |
| | Morgan | 1.10.0 | HTTP request logging |
| **Infra** | nginx | — | Reverse proxy / static file server |
| | MinIO | — | Object storage (on-premise S3) |

---

## 2. Database Name and Configuration

- **Database name:** `zictia_portal`
- **Schema:** `public`
- **Connection URL format:**
  ```
  postgresql://<user>:<password>@<host>:<port>/zictia_portal?schema=public
  ```
- **Default local credentials (dev):**
  ```
  postgresql://zictia:zictia_dev_pass@localhost:5432/zictia_portal?schema=public
  ```
- **ORM:** Prisma (`schema.prisma` located at `backend/prisma/schema.prisma`)
- **Migration command:** `npx prisma migrate deploy` (or `npm run db:migrate`)
- **Seed command:** `npx tsx src/scripts/seed.ts` (or `./manage.sh seed`)

---

## 3. User Roles and Their Credentials

### Account-Level Roles (Customer users)
| Role | Description |
|------|-------------|
| `ACCOUNT_ADMIN` | Full control over the account; can manage sub-users, billing, and tickets. |
| `TECHNICAL_USER` | Can create technical tickets and view services. |
| `BILLING_USER` | Can view/pay invoices and manage billing contacts. |
| `READ_ONLY` | Can view dashboard, services, and invoices only. |

### Staff Roles (ZICTIA employees)
| Role | Description |
|------|-------------|
| `STAFF_CSR` | Customer support representative; handles tickets and account inquiries. |
| `STAFF_TECHNICIAN` | Technical staff; resolves infrastructure and service issues. |
| `STAFF_MANAGER` | Operational manager; can approve accounts, orders, and view analytics. |
| `ADMIN` | Super-user; full system access including settings and audit logs. |

### Default / Test Credentials

Running `./manage.sh seed` (or `npx tsx src/scripts/seed.ts`) creates a fully populated dataset. **Default password for all seeded users:** `Zanzibar2025!`

#### Customer Accounts (pre-approved, `ACTIVE`)

| Account | Organisation | Type | Users (Email → Role) |
|---------|-------------|------|---------------------|
| Government | Wizara ya Teknolojia ya Habari na Mawasiliano Zanzibar | `GOVERNMENT` | `juma.mwinyi@zanzibar.go.tz` → ACCOUNT_ADMIN<br>`asha.suleiman@zanzibar.go.tz` → TECHNICAL_USER<br>`haji.ally@zanzibar.go.tz` → BILLING_USER<br>`mzee.kombo@zanzibar.go.tz` → READ_ONLY |
| Corporate | Zanzibar Seacliff Hotels Ltd | `CORPORATE` | `fatuma.abdalla@seacliff.co.tz` → ACCOUNT_ADMIN<br>`omar.nassor@seacliff.co.tz` → TECHNICAL_USER<br>`mariam.rajabu@seacliff.co.tz` → BILLING_USER<br>`abdi.hussein@seacliff.co.tz` → READ_ONLY |
| SME | Stone Town Digital Solutions | `SME` | `suleiman.mussa@stonedigital.co.tz` → ACCOUNT_ADMIN<br>`khadija.said@stonedigital.co.tz` → TECHNICAL_USER<br>`yusuf.hamad@stonedigital.co.tz` → BILLING_USER<br>`zuhura.mohamed@stonedigital.co.tz` → READ_ONLY |
| Individual | — | `INDIVIDUAL` | `ali.hamza.znz@gmail.com` → ACCOUNT_ADMIN<br>`latifa.salim.znz@gmail.com` → READ_ONLY |
| ISP | ZanzibarNet Solutions Ltd | `ISP` | `idriss.makame@zanzibarnet.co.tz` → ACCOUNT_ADMIN<br>`swabra.issa@zanzibarnet.co.tz` → TECHNICAL_USER<br>`nassor.omar@zanzibarnet.co.tz` → BILLING_USER |

#### ZICTIA Staff Account (internal)

| Email | Role | Full Name |
|-------|------|-----------|
| `admin.zictia@zictia.go.tz` | ADMIN | Ramadhani Juma Khamis |
| `mwanahawa.said@zictia.go.tz` | STAFF_MANAGER | Mwanahawa Said Bakari |
| `khamis.abdalla@zictia.go.tz` | STAFF_TECHNICIAN | Khamis Abdalla Nassor |
| `halima.rajabu@zictia.go.tz` | STAFF_CSR | Halima Rajabu Mwinyi |

> **Note:** All new customer registrations (via `/auth/register`) are created with `ACCOUNT_ADMIN` role and `PENDING_APPROVAL` status. An `ADMIN` or `STAFF_MANAGER` must approve the account before login succeeds.

---

## 4. Login Methods

1. **Email + Password**
   - Endpoint: `POST /api/auth/login`
   - Body: `{ email, password, rememberDevice? }`
   - Returns: `accessToken`, `refreshToken`, `expiresIn`, `user` object.
   - Lockout: 5 failed attempts locks the account for 15 minutes.

2. **Token Refresh**
   - Endpoint: `POST /api/auth/refresh`
   - Body: `{ refreshToken }`
   - Returns: new `accessToken` + `refreshToken` pair.

3. **Logout**
   - Endpoint: `POST /api/auth/logout` (requires `Bearer` token)
   - Revokes the session server-side.

4. **Mobile OTP Verification**
   - Generated during registration; endpoint: `POST /api/auth/verify-otp`
   - Used to verify mobile number ownership.

5. **Password Reset**
   - Request: `POST /api/auth/password-reset-request` (sends token to email)
   - Reset: `POST /api/auth/password-reset` (token + new password)

---

## 5. Role Permissions Matrix

| Feature / Endpoint | ACCOUNT_ADMIN | TECHNICAL_USER | BILLING_USER | READ_ONLY | STAFF_CSR | STAFF_TECHNICIAN | STAFF_MANAGER | ADMIN |
|-------------------|---------------|----------------|--------------|-----------|-----------|-------------------|---------------|-------|
| View catalog (public) | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Register / login | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| View dashboard | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Create tickets | Yes | Yes | No | No | Yes | Yes | Yes | Yes |
| View own invoices | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Pay invoices | Yes | No | Yes | No | No | No | Yes | Yes |
| Order services | Yes | No | No | No | No | No | Yes | Yes |
| Manage sub-users | Yes | No | No | No | No | No | No | Yes |
| Approve accounts | No | No | No | No | No | No | Yes | Yes |
| Approve/reject orders | No | No | No | No | No | No | Yes | Yes |
| Manage catalog (CRUD) | No | No | No | No | No | No | Yes | Yes |
| Manage KB articles | No | No | No | No | No | No | Yes | Yes |
| View all tickets (admin) | No | No | No | No | Yes | Yes | Yes | Yes |
| Assign / resolve tickets | No | No | No | No | Yes | Yes | Yes | Yes |
| Generate invoices | No | No | No | No | No | No | Yes | Yes |
| View analytics / audit logs | No | No | No | No | No | No | Yes | Yes |
| System settings | No | No | No | No | No | No | No | Yes |

> **Implementation note:** Staff-only routes use `requireStaff` middleware (`role.startsWith("STAFF_") || role === "ADMIN"`). Admin-only routes additionally check `requireRole(["ADMIN"])`.

---

## 6. Database Schema Overview

### Core Entities

| Model | Purpose |
|-------|---------|
| `CustomerAccount` | Top-level billing entity (Individual, SME, Corporate, Government, ISP). |
| `User` | Login credentials, role, MFA state, password history. Belongs to one `CustomerAccount`. |
| `Session` | Active JWT sessions with token hashes, IP, user-agent, expiry. |
| `Service` | Catalog service definitions (pricing, SLA tier, contract length, EN/SW content). |
| `CustomerService` | Active subscription linking an account to a service (status, uptime, auto-renew). |
| `Order` | Service order workflow (SUBMITTED → UNDER_REVIEW → APPROVED → PROVISIONING → ACTIVE). |
| `Invoice` | Monthly / periodic invoices with line items, VAT, due dates, status. |
| `Payment` | Payment attempts via mobile money, card, bank transfer, or credit account. |
| `Ticket` | Support tickets with SLA timers, priority, status, CSAT. |
| `TicketComment` | Public replies and internal notes on tickets. |
| `Notification` | Queued in-app, email, and SMS notifications. |
| `AuditLog` | Immutable record of all create/update/delete actions. |
| `SystemSetting` | Key-value store for runtime configuration. |
| `KnowledgeBaseArticle` | Bilingual help articles with categories, tags, view counts. |
| `PasswordResetToken` | Short-lived tokens for password reset flow. |

### Key Enums

| Enum | Values |
|------|--------|
| `AccountType` | `INDIVIDUAL`, `SME`, `CORPORATE`, `GOVERNMENT`, `ISP` |
| `AccountStatus` | `PENDING_APPROVAL`, `ACTIVE`, `SUSPENDED`, `CLOSED` |
| `UserRole` | `ACCOUNT_ADMIN`, `TECHNICAL_USER`, `BILLING_USER`, `READ_ONLY`, `STAFF_CSR`, `STAFF_TECHNICIAN`, `STAFF_MANAGER`, `ADMIN` |
| `ServiceType` | `INTERNET_CAPACITY`, `INTERNET_GOVERNMENT`, `VIRTUAL_MACHINE`, `COLOCATION`, `IP_MPLS`, `VPN` |
| `OrderStatus` | `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `PROVISIONING`, `ACTIVE`, `COMPLETED`, `REJECTED`, `CANCELLED` |
| `InvoiceStatus` | `DRAFT`, `ISSUED`, `SENT`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `WRITTEN_OFF` |
| `PaymentMethod` | `M_PESA`, `TIGO_PESA`, `AIRTEL_MONEY`, `HALO_PESA`, `CARD`, `BANK_TRANSFER`, `CREDIT_ACCOUNT` |
| `TicketPriority` | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| `TicketStatus` | `OPEN`, `IN_PROGRESS`, `PENDING_CUSTOMER`, `PENDING_INTERNAL`, `RESOLVED`, `CLOSED` |
| `NotificationChannel` | `EMAIL`, `SMS`, `IN_APP` |
| `NotificationStatus` | `PENDING`, `SENT`, `FAILED`, `READ` |
| `SlaTier` | `PLATINUM`, `GOLD`, `SILVER`, `STANDARD` |

---

## 7. Project Structure

```
portal/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express server bootstrap + scheduler
│   │   ├── config/index.ts        # Centralized env configuration
│   │   ├── modules/
│   │   │   ├── auth/              # Registration, login, password reset, sub-users
│   │   │   ├── catalog/           # Public service catalog + admin CRUD
│   │   │   ├── orders/            # Customer orders + admin approval
│   │   │   ├── billing/           # Invoices + invoice generation
│   │   │   ├── payments/          # ZanMalipo integration + payment status
│   │   │   ├── tickets/           # Ticket lifecycle + CSAT
│   │   │   ├── sla/               # SLA breach checks + metrics
│   │   │   ├── kb/                # Knowledge base articles
│   │   │   ├── notifications/     # In-app / email / SMS queue
│   │   │   └── admin/             # Dashboard metrics, analytics, audit logs
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT verification, role guards
│   │   │   ├── rateLimiter.ts     # Express-rate-limit (skipped in dev)
│   │   │   └── errorHandler.ts    # Global error handler
│   │   ├── utils/
│   │   │   ├── db.ts              # Prisma client singleton
│   │   │   ├── redis.ts           # Ioredis singleton
│   │   │   ├── response.ts        # success() / error() envelope helpers
│   │   │   ├── logger.ts          # Winston logger
│   │   │   └── notifications.ts   # queueNotification() helper
│   │   ├── jobs/
│   │   │   ├── scheduler.ts       # 5-minute cron: invoice reminders, SLA checks, password expiry
│   │   │   └── notificationWorker.ts # Background notification processor (Bull)
│   │   └── scripts/
│   │       └── seed.ts            # Seed services + system settings
│   ├── prisma/
│   │   └── schema.prisma          # Full Prisma schema
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Route definitions
│   │   ├── main.tsx               # React entry point
│   │   ├── index.css              # Tailwind directives
│   │   ├── i18n.ts                # EN + SW translations
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── CatalogPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── BillingPage.tsx
│   │   │   ├── PaymentPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── TicketsPage.tsx
│   │   │   ├── TicketDetailPage.tsx
│   │   │   ├── KBPage.tsx
│   │   │   ├── KBArticlePage.tsx
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.tsx
│   │   │       ├── AdminAccounts.tsx
│   │   │       ├── AdminOrders.tsx
│   │   │       ├── AdminTickets.tsx
│   │   │       ├── AdminCatalog.tsx
│   │   │       ├── AdminKB.tsx
│   │   │       └── AdminAnalytics.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx         # Nav, banner, footer, notification bell
│   │   │   ├── NotificationPanel.tsx
│   │   │   └── PrivateRoute.tsx
│   │   ├── lib/
│   │   │   └── api.ts             # Axios instance (baseURL, interceptors)
│   │   └── store/
│   │       └── auth.ts            # Zustand auth store
│   ├── public/
│   │   └── zictia_top_bar.png     # Header banner asset
│   └── package.json
│
├── infra/
│   └── nginx.conf                 # Sample reverse proxy config
│
├── manage.sh                      # Service manager script (see §9)
└── docs/
    └── README.md                  # This file
```

---

## 8. Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure the following:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `4000` | API listen port |
| `DATABASE_URL` | *(see §2)* | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_PRIVATE_KEY` | — | RSA private key (PEM with `\n` newlines) |
| `JWT_PUBLIC_KEY` | — | RSA public key (PEM with `\n` newlines) |
| `PASSWORD_POLICY_MIN_LENGTH` | `10` | Minimum password length |
| `PASSWORD_MAX_AGE_DAYS` | `90` | Days before password expiry warning |
| `SESSION_TIMEOUT_MINUTES` | `60` | Default session length |
| `RATE_LIMIT_AUTH` | `100` | Requests/minute for authenticated users |
| `RATE_LIMIT_UNAUTH` | `20` | Requests/minute for unauthenticated users |
| `ZANMALIPO_BASE_URL` | `https://sandbox.zanmalipo.go.tz` | Payment gateway base URL |
| `ZANMALIPO_API_KEY` | — | API key for live ZanMalipo |
| `SMS_PRIMARY_PROVIDER` | `africastalking` | Primary SMS gateway |
| `SMS_PRIMARY_API_KEY` | — | SMS API key |
| `SMS_SENDER_ID` | `ZICTIA` | SMS sender label |
| `SMTP_HOST` | `mail.zictia.go.tz` | Outbound mail server |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `SMTP_FROM` | `noreply@zictia.go.tz` | Default From address |
| `MINIO_ENDPOINT` | `localhost` | S3-compatible storage host |
| `MINIO_PORT` | `9000` | MinIO API port |
| `MINIO_USE_SSL` | `false` | Use HTTPS for MinIO |
| `MINIO_ACCESS_KEY` | `zictia` | MinIO access key |
| `MINIO_SECRET_KEY` | `zictia_minio_pass` | MinIO secret key |
| `MINIO_BUCKET` | `zictia-portal` | Default bucket name |
| `LOG_LEVEL` | `info` | Winston log level |

**Generating JWT keys:**
```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```
Then paste the contents into `.env` with literal `\n` newlines (the config loader converts them).

---

## 9. Management Scripts (`manage.sh`)

Located at `manage.sh` in the project root.

| Command | Action |
|---------|--------|
| `./manage.sh install` | Install npm dependencies for both frontend and backend |
| `./manage.sh dev` | Start backend (port 4000) and frontend (port 3000) in development mode |
| `./manage.sh start` | Start production builds (requires `./manage.sh build` first) |
| `./manage.sh stop` | Stop all running services (reads PID files) |
| `./manage.sh build` | Type-check & build both frontend (`dist/`) and backend (`dist/`) |
| `./manage.sh test` | Run backend Jest tests with coverage |
| `./manage.sh migrate` | Deploy Prisma database migrations |
| `./manage.sh seed` | Seed database: 6 services, 5 customer accounts, 4 staff users, 21 users total, 9 KB articles |
| `./manage.sh logs` | Tail the backend log file (`logs/backend.log`) |
| `./manage.sh status` | Check whether backend / frontend processes are running |
| `./manage.sh help` | Display usage help |

> **Note:** `manage.sh` expects `backend/.env` to exist before running `dev`, `start`, `migrate`, or `seed`.

---

## 10. Running the Application

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- MinIO (optional, only if using file uploads)

### Step-by-step (Local Development)

1. **Clone / navigate to the project**
   ```bash
   cd /home/yusuf/zictia/portal
   ```

2. **Install dependencies**
   ```bash
   ./manage.sh install
   ```

3. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env — set DATABASE_URL, JWT keys, and any secrets
   ```

4. **Run migrations & seed**
   ```bash
   ./manage.sh migrate
   ./manage.sh seed
   ```
   The seed script creates sample services, 5 pre-approved customer accounts, 4 ZICTIA staff users, and 9 knowledge-base articles. All seeded accounts share the password `Zanzibar2025!`.

5. **Start dev servers**
   ```bash
   ./manage.sh dev
   ```
   - API: http://localhost:4000
   - Frontend: http://localhost:3000

6. **Stop servers**
   ```bash
   ./manage.sh stop
   ```

### Production Notes
- Run `./manage.sh build` first.
- `./manage.sh start` only launches the backend node process. Serve `frontend/dist` via **nginx** (sample config in `infra/nginx.conf`).
- Set `NODE_ENV=production` in `.env`.
- Rate limiting is **skipped entirely** when `NODE_ENV=development`.

---

## 11. API Endpoints

Base path: `/api` (all routes are prefixed, e.g. `POST /api/auth/login`)

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | Public | Register individual / SME / corporate / ISP |
| POST | `/register/government` | Public | Register government institution |
| POST | `/login` | Public | Email + password login |
| POST | `/refresh` | Public | Exchange refresh token for new access token |
| POST | `/logout` | `Bearer` | Revoke current session |
| POST | `/password-reset-request` | Public | Send password-reset email |
| POST | `/password-reset` | Public | Confirm reset with token + new password |
| POST | `/change-password` | `Bearer` | Change password for authenticated user |
| POST | `/verify-otp` | Public | Verify mobile OTP |
| GET | `/me` | `Bearer` | Get current user profile |
| POST | `/sub-users` | `Bearer` | Create a sub-user under current account |
| GET | `/sub-users` | `Bearer` | List sub-users for current account |
| DELETE | `/sub-users/:userId` | `Bearer` | Remove a sub-user |

### Catalog (`/api/catalog`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List published services (with search, filter, sort) |
| GET | `/compare` | Public | Compare multiple services by IDs |
| GET | `/:id` | Public | Get single service details |
| POST | `/` | Staff | Create new service |
| GET | `/admin/list` | Staff | List all services (including drafts) |
| PUT | `/:id` | Staff | Update service |
| POST | `/:id/publish` | Staff | Publish a draft service |
| POST | `/:id/deprecate` | Staff | Deprecate a published service |

### Orders (`/api/orders`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/my` | `Bearer` | List my orders |
| POST | `/` | `Bearer` | Submit a new service order |
| GET | `/:id` | `Bearer` | Get order detail |
| POST | `/:id/cancel` | `Bearer` | Cancel a pending order |
| GET | `/admin/all` | Staff | List all orders (admin) |
| POST | `/admin/:id/approve` | Staff | Approve order → triggers provisioning |
| POST | `/admin/:id/reject` | Staff | Reject order |

### Billing (`/api/billing`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/invoices` | `Bearer` | List my invoices |
| GET | `/invoices/:id` | `Bearer` | Get invoice detail |
| GET | `/stats` | `Bearer` | Get billing summary (outstanding, overdue, paid) |
| GET | `/admin/invoices` | Staff | List all invoices |
| POST | `/admin/invoices/generate` | Staff | Generate new invoice for an account |

### Payments (`/api/payments`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/methods` | Public | Available payment methods |
| GET | `/my` | `Bearer` | List my payment history |
| GET | `/my/:id` | `Bearer` | Get payment status |
| POST | `/zanmalipo/initiate` | `Bearer` | Initiate payment via ZanMalipo |
| POST | `/zanmalipo/webhook` | Public | ZanMalipo callback webhook |

### Tickets (`/api/tickets`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | `Bearer` | Create support ticket |
| GET | `/my` | `Bearer` | List my tickets |
| GET | `/my/:id` | `Bearer` | Get ticket detail |
| POST | `/my/:id/comments` | `Bearer` | Add customer reply |
| POST | `/my/:id/close` | `Bearer` | Close ticket |
| POST | `/my/:id/escalate` | `Bearer` | Escalate ticket |
| POST | `/my/:id/csat` | `Bearer` | Submit CSAT feedback |
| GET | `/admin/all` | Staff | List all tickets (admin queue) |
| POST | `/admin/:id/assign` | Staff | Assign ticket to staff |
| POST | `/admin/:id/internal-note` | Staff | Add internal note |
| POST | `/admin/:id/resolve` | Staff | Mark ticket as resolved |

### SLA (`/api/sla`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/breaches/check` | `Bearer` | Scan and flag SLA breaches |
| GET | `/metrics` | `Bearer` | Get SLA performance metrics |

### Knowledge Base (`/api/kb`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/articles` | Public | List/search published articles |
| GET | `/articles/:id` | Public | Get single article |
| GET | `/categories` | Public | List article categories |
| GET | `/admin/articles` | Staff | List all articles (including drafts) |
| POST | `/admin/articles` | Staff | Create article |
| PUT | `/admin/articles/:id` | Staff | Update article |
| DELETE | `/admin/articles/:id` | Staff | Delete article |

### Notifications (`/api/notifications`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | `Bearer` | List my notifications |
| GET | `/unread-count` | `Bearer` | Get unread notification count |
| PUT | `/mark-all-read` | `Bearer` | Mark all as read |
| PUT | `/:id/read` | `Bearer` | Mark single notification as read |
| GET | `/preferences` | `Bearer` | Get notification preferences |
| PUT | `/preferences` | `Bearer` | Update preferences |

### Admin (`/api/admin`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/accounts/pending` | Staff | List pending-approval accounts |
| GET | `/accounts` | Staff | List all accounts |
| GET | `/accounts/:id` | Staff | Get account detail |
| POST | `/accounts/:id/approve` | Staff | Approve account |
| GET | `/settings` | Staff | Get system settings |
| PUT | `/settings` | Staff | Update system settings |
| GET | `/audit-logs` | Staff | Get audit trail |
| GET | `/dashboard-metrics` | Staff | Get admin dashboard KPIs |
| GET | `/dashboard` | `Bearer` | Get customer dashboard data |
| GET | `/analytics/revenue-trend` | Staff | Monthly revenue (last 6 months) |
| GET | `/analytics/ticket-resolution` | Staff | Avg resolution time by priority |
| GET | `/analytics/service-uptime` | Staff | Aggregated uptime percentages |

---

*Last updated: 2026-05-16*
