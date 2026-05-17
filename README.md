# ZICTIA Customer Portal

Customer Self-Service Portal & Billing Platform for the Zanzibar ICT Infrastructure Agency (ZICTIA).

## Technologies

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

## Database Configuration

- **Database name:** `zictia_portal`
- **Schema:** `public`
- **Default local connection:** `postgresql://zictia:zictia_dev_pass@localhost:5432/zictia_portal?schema=public`
- **ORM:** Prisma (`backend/prisma/schema.prisma`)
- **Migrations:** `npx prisma migrate deploy` or `npm run db:migrate`
- **Seed:** `npx tsx src/scripts/seed.ts` or `./manage.sh seed`

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- MinIO (optional for file uploads)

### Step-by-step

1. **Install dependencies**
   ```bash
   ./manage.sh install
   ```

2. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env — set DATABASE_URL, JWT keys, and secrets
   ```

3. **Run migrations & seed**
   ```bash
   ./manage.sh migrate
   ./manage.sh seed
   ```
   The seed creates sample services, 5 pre-approved customer accounts, 4 ZICTIA staff users, and 9 KB articles. Default password: `Zanzibar2025!`

4. **Start dev servers**
   ```bash
   ./manage.sh dev
   ```
   - API: http://localhost:4000
   - Frontend: http://localhost:3000

5. **Stop servers**
   ```bash
   ./manage.sh stop
   ```

### Environment Notes
- Generate JWT keys: `openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem`
- Paste keys into `.env` with `\n` for newlines

### Production
- Run `./manage.sh build` first
- `./manage.sh start` launches the backend; serve `frontend/dist` via nginx (sample config in `infra/nginx.conf`)
- Set `NODE_ENV=production` in `.env`

## Management Scripts (`manage.sh`)

| Command | Action |
|---------|--------|
| `./manage.sh install` | Install npm dependencies for both frontend and backend |
| `./manage.sh dev` | Start backend (port 4000) and frontend (port 3000) in development mode |
| `./manage.sh start` | Start production builds (requires `./manage.sh build` first) |
| `./manage.sh stop` | Stop all running services |
| `./manage.sh build` | Type-check & build both frontend and backend |
| `./manage.sh test` | Run backend Jest tests with coverage |
| `./manage.sh migrate` | Deploy Prisma database migrations |
| `./manage.sh seed` | Seed database with sample data |
| `./manage.sh logs` | Tail the backend log file |
| `./manage.sh status` | Check whether backend / frontend processes are running |

## Project Structure

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
│   │   │   ├── scheduler.ts       # 5-minute cron: invoice reminders, SLA checks
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
│   │   ├── i18n.ts                # EN + SW translations
│   │   ├── pages/                 # Page components
│   │   ├── components/            # Layout, shared UI
│   │   ├── lib/api.ts             # Axios instance
│   │   └── store/auth.ts          # Zustand auth store
│   └── package.json
│
├── infra/
│   └── nginx.conf                 # Sample reverse proxy config
│
├── manage.sh                      # Service manager script
└── docs/
    └── README.md                  # Extended technical documentation
```

## User Roles

### Customer Roles
| Role | Description |
|------|-------------|
| `ACCOUNT_ADMIN` | Full control over the account; can manage sub-users, billing, and tickets |
| `TECHNICAL_USER` | Can create technical tickets and view services |
| `BILLING_USER` | Can view/pay invoices and manage billing contacts |
| `READ_ONLY` | Can view dashboard, services, and invoices only |

### Staff Roles
| Role | Description |
|------|-------------|
| `STAFF_CSR` | Customer support; handles tickets and account inquiries |
| `STAFF_TECHNICIAN` | Technical staff; resolves infrastructure and service issues |
| `STAFF_MANAGER` | Operational manager; can approve accounts, orders, and view analytics |
| `ADMIN` | Super-user; full system access including settings and audit logs |

### Test Credentials

All seeded accounts share the password `Zanzibar2025!`

| Account | Type | Admin Email |
|---------|------|-------------|
| Government | `GOVERNMENT` | `juma.mwinyi@zanzibar.go.tz` |
| Corporate | `CORPORATE` | `fatuma.abdalla@seacliff.co.tz` |
| SME | `SME` | `suleiman.mussa@stonedigital.co.tz` |
| Individual | `INDIVIDUAL` | `ali.hamza.znz@gmail.com` |
| ISP | `ISP` | `idriss.makame@zanzibarnet.co.tz` |
| ZICTIA Staff | `CORPORATE` | `admin.zictia@zictia.go.tz` |

## API Endpoints

Base path: `/api`

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | Public | Register individual / SME / corporate / ISP |
| POST | `/register/government` | Public | Register government institution |
| POST | `/login` | Public | Email + password login |
| POST | `/refresh` | Public | Exchange refresh token |
| POST | `/logout` | Bearer | Revoke current session |
| POST | `/password-reset-request` | Public | Send password-reset email |
| POST | `/password-reset` | Public | Confirm reset with token |
| POST | `/change-password` | Bearer | Change password |
| POST | `/verify-otp` | Public | Verify mobile OTP |
| GET | `/me` | Bearer | Get current user profile |
| POST | `/sub-users` | Bearer | Create a sub-user |
| GET | `/sub-users` | Bearer | List sub-users |
| DELETE | `/sub-users/:userId` | Bearer | Remove a sub-user |

### Catalog (`/api/catalog`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List published services |
| GET | `/compare` | Public | Compare services by IDs |
| GET | `/:id` | Public | Get service details |
| POST | `/` | Staff | Create new service |
| GET | `/admin/list` | Staff | List all services (incl. drafts) |
| PUT | `/:id` | Staff | Update service |
| POST | `/:id/publish` | Staff | Publish a draft service |
| POST | `/:id/deprecate` | Staff | Deprecate a published service |

### Orders (`/api/orders`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/my` | Bearer | List my orders |
| POST | `/` | Bearer | Submit a new service order |
| GET | `/:id` | Bearer | Get order detail |
| POST | `/:id/cancel` | Bearer | Cancel a pending order |
| GET | `/admin/all` | Staff | List all orders |
| POST | `/admin/:id/approve` | Staff | Approve order |
| POST | `/admin/:id/reject` | Staff | Reject order |

### Billing (`/api/billing`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/invoices` | Bearer | List my invoices |
| GET | `/invoices/:id` | Bearer | Get invoice detail |
| GET | `/stats` | Bearer | Billing summary |
| GET | `/admin/invoices` | Staff | List all invoices |
| POST | `/admin/invoices/generate` | Staff | Generate invoice for an account |

### Payments (`/api/payments`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/methods` | Public | Available payment methods |
| GET | `/my` | Bearer | List my payments |
| GET | `/my/:id` | Bearer | Get payment status |
| POST | `/zanmalipo/initiate` | Bearer | Initiate ZanMalipo payment |
| POST | `/zanmalipo/webhook` | Public | ZanMalipo callback webhook |

### Tickets (`/api/tickets`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Bearer | Create support ticket |
| GET | `/my` | Bearer | List my tickets |
| GET | `/my/:id` | Bearer | Get ticket detail |
| POST | `/my/:id/comments` | Bearer | Add customer reply |
| POST | `/my/:id/close` | Bearer | Close ticket |
| POST | `/my/:id/escalate` | Bearer | Escalate ticket |
| POST | `/my/:id/csat` | Bearer | Submit CSAT feedback |
| GET | `/admin/all` | Staff | List all tickets |
| POST | `/admin/:id/assign` | Staff | Assign ticket to staff |
| POST | `/admin/:id/internal-note` | Staff | Add internal note |
| POST | `/admin/:id/resolve` | Staff | Mark ticket as resolved |

### Knowledge Base (`/api/kb`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/articles` | Public | List/search published articles |
| GET | `/articles/:id` | Public | Get single article |
| GET | `/categories` | Public | List article categories |
| GET | `/admin/articles` | Staff | List all articles |
| POST | `/admin/articles` | Staff | Create article |
| PUT | `/admin/articles/:id` | Staff | Update article |
| DELETE | `/admin/articles/:id` | Staff | Delete article |

### Notifications (`/api/notifications`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Bearer | List my notifications |
| GET | `/unread-count` | Bearer | Get unread count |
| PUT | `/mark-all-read` | Bearer | Mark all as read |
| PUT | `/:id/read` | Bearer | Mark single notification as read |
| GET | `/preferences` | Bearer | Get notification preferences |
| PUT | `/preferences` | Bearer | Update preferences |

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
| GET | `/dashboard` | Bearer | Get customer dashboard data |
| GET | `/analytics/revenue-trend` | Staff | Monthly revenue (6 months) |
| GET | `/analytics/ticket-resolution` | Staff | Avg resolution time by priority |
| GET | `/analytics/service-uptime` | Staff | Aggregated uptime percentages |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `4000` | API listen port |
| `DATABASE_URL` | *(see above)* | PostgreSQL connection string |
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
| `SMTP_HOST` | `mail.zictia.go.tz` | Outbound mail server |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_FROM` | `noreply@zictia.go.tz` | Default From address |
| `MINIO_ENDPOINT` | `localhost` | S3-compatible storage host |
| `MINIO_BUCKET` | `zictia-portal` | Default bucket name |

## Database Schema

### Core Entities
| Model | Purpose |
|-------|---------|
| `CustomerAccount` | Top-level billing entity (Individual, SME, Corporate, Government, ISP) |
| `User` | Login credentials, role, MFA state, password history |
| `Session` | Active JWT sessions with token hashes, IP, user-agent, expiry |
| `Service` | Catalog service definitions (pricing, SLA tier, EN/SW content) |
| `CustomerService` | Active subscription linking an account to a service |
| `Order` | Service order workflow (SUBMITTED → APPROVED → PROVISIONING → ACTIVE) |
| `Invoice` | Monthly invoices with line items, VAT, due dates |
| `Payment` | Payment attempts via mobile money, card, bank transfer |
| `Ticket` | Support tickets with SLA timers, priority, CSAT |
| `TicketComment` | Public replies and internal notes on tickets |
| `Notification` | Queued in-app, email, and SMS notifications |
| `AuditLog` | Immutable record of all create/update/delete actions |
| `SystemSetting` | Key-value store for runtime configuration |
| `KnowledgeBaseArticle` | Bilingual help articles with categories, tags, view counts |
| `PasswordResetToken` | Short-lived tokens for password reset flow |

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
| `SlaTier` | `PLATINUM`, `GOLD`, `SILVER`, `STANDARD` |

## Implemented Features

- [x] Public service catalog with search, filter, sort, compare
- [x] Customer registration (Individual, SME, Corporate, Government, ISP)
- [x] Admin approval workflow for new accounts
- [x] JWT authentication (RS256) + password reset + OTP mobile verification
- [x] Sub-user management with roles (Account Admin, Technical, Billing, Read-Only)
- [x] Support ticket creation, status tracking, comments, escalation
- [x] Admin back-office: account management, service catalog CRUD, ticket queues, dashboard metrics
- [x] Bilingual UI (English + Kiswahili)
- [x] Prisma schema with all core entities
- [x] Service ordering wizard (VM, Co-Location, Bandwidth, IP-MPLS/VPN)
- [x] Admin order approval and provisioning workflow
- [x] Knowledge base with bilingual articles
- [x] SLA breach detection and metrics
- [x] Notification engine (Email + SMS + In-App)
- [x] Admin analytics dashboard (revenue, ticket resolution, uptime)
- [x] Billing and invoice generation
- [x] ZanMalipo payment gateway integration