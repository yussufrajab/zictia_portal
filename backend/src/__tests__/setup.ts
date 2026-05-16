import { prisma } from "../utils/db";

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  // Clean test tables in reverse dependency order
  const tables = [
    "ticket_comments",
    "tickets",
    "payments",
    "invoices",
    "customer_services",
    "orders",
    "sessions",
    "password_reset_tokens",
    "audit_logs",
    "notifications",
    "users",
    "customer_accounts",
    "services",
    "kb_articles",
    "system_settings",
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`).catch(() => null);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
