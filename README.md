# ZICTIA Customer Portal

Implementation of the ZICTIA Customer Self-Service Portal & Billing Platform per ZICTIA_SRS_Customer_Portal.md.

## Architecture

- **Frontend:** React 18 + TypeScript + Tailwind CSS + Vite
- **Backend:** Node.js 20 + Express + Prisma ORM + PostgreSQL
- **Cache/Queue:** Redis (sessions, rate limits, background jobs)
- **Storage:** MinIO (S3-compatible, on-premise)
- **Auth:** JWT (RS256) with refresh tokens, MFA-ready

## Project Structure

```
portal/
├── backend/           # Node.js API
│   ├── src/
│   │   ├── modules/   # Auth, Catalog, Tickets, Admin, Notifications
│   │   ├── middleware/# Auth, rate limiting, error handling
│   │   ├── utils/     # DB, Redis, logger, response helpers
│   │   └── scripts/   # DB seed
│   └── prisma/
│       └── schema.prisma
├── frontend/          # React SPA
│   ├── src/
│   │   ├── pages/     # Home, Catalog, Login, Register, Dashboard, Tickets, Admin
│   │   ├── components/# Layout, shared UI
│   │   ├── lib/       # API client
│   │   ├── store/     # Zustand auth store
│   │   └── i18n.ts    # English + Kiswahili
│   └── index.html
└── infra/             # nginx configs, deployment docs
```

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- MinIO (optional for file uploads)

### Backend
```bash
cd backend
cp .env.example .env
# Update DATABASE_URL, JWT keys, and other secrets
npm install
npx prisma migrate dev
npx prisma generate
npm run db:seed
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Environment Notes
- Generate JWT keys: `openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem`
- Paste keys into `.env` with `\n` for newlines

## Implemented Phase 1 Features

- [x] Public service catalog with search, filter, sort, compare
- [x] Customer registration (Individual, SME, Corporate, Government, ISP)
- [x] Admin approval workflow for new accounts
- [x] JWT authentication (RS256) + password reset + OTP mobile verification
- [x] Sub-user management with roles (Account Admin, Technical, Billing, Read-Only)
- [x] Support ticket creation, status tracking, comments, escalation
- [x] Admin back-office: account management, service catalog CRUD, ticket queues, dashboard metrics
- [x] Bilingual UI (English + Kiswahili)
- [x] Prisma schema with all core entities

## Next Steps (Phase 2)

- [ ] Service ordering wizard (VM, Co-Location, Bandwidth, IP-MPLS/VPN)
- [ ] Automated billing & invoicing with VAT
- [ ] ZanMalipo payment gateway integration
- [ ] Usage analytics and dashboard graphs
- [ ] SLA timer enforcement and automatic escalation
- [ ] Knowledge base
- [ ] Notifications engine (SMS + Email)
- [ ] Management reporting dashboard
