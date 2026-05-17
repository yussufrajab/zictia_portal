import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../utils/db";
import { success, error } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth";
import { logger } from "../../utils/logger";
import { queueNotification } from "../../utils/notifications";

const approvalSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  reason: z.string().min(5).max(500),
});

export async function listPendingAccounts(req: AuthRequest, res: Response) {
  const { page = "1", limit = "20" } = req.query;
  const [accounts, total] = await Promise.all([
    prisma.customerAccount.findMany({
      where: { status: "PENDING_APPROVAL" },
      include: { users: { take: 1, select: { fullName: true, email: true, mobile: true } } },
      orderBy: { createdAt: "asc" },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    }),
    prisma.customerAccount.count({ where: { status: "PENDING_APPROVAL" } }),
  ]);

  res.json(success(accounts, { page: parseInt(page as string), limit: parseInt(limit as string), total }));
}

export async function listAllAccounts(req: AuthRequest, res: Response) {
  const { status, type, search, page = "1", limit = "20" } = req.query;
  const where: any = {};
  if (status) where.status = status;
  if (type) where.accountType = type;
  if (search) {
    where.OR = [
      { organisationName: { contains: search as string, mode: "insensitive" } },
      { users: { some: { email: { contains: search as string, mode: "insensitive" } } } },
    ];
  }

  const [accounts, total] = await Promise.all([
    prisma.customerAccount.findMany({
      where,
      include: { users: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    }),
    prisma.customerAccount.count({ where }),
  ]);

  res.json(success(accounts, { page: parseInt(page as string), limit: parseInt(limit as string), total }));
}

export async function getAccountDetail(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const account = await prisma.customerAccount.findUnique({
    where: { id },
    include: {
      users: true,
      services: { include: { service: true } },
      orders: true,
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      tickets: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!account) {
    res.status(404).json(error("NOT_FOUND", "Account not found"));
    return;
  }

  res.json(success(account));
}

export async function approveAccount(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const parsed = approvalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid data", parsed.error.flatten()));
    return;
  }

  const { status, reason } = parsed.data;
  const account = await prisma.customerAccount.update({
    where: { id },
    data: { status, approvedAt: new Date(), approvedBy: req.user!.userId },
  });

  const firstUser = await prisma.user.findFirst({ where: { accountId: id }, select: { id: true, email: true } });
  if (firstUser) {
    await queueNotification({
      accountId: id,
      userId: firstUser.id,
      eventType: status === "ACTIVE" ? "ACCOUNT_APPROVED" : "ACCOUNT_REJECTED",
      channels: ["EMAIL", "IN_APP"],
      subjectEn: status === "ACTIVE" ? "Your ZICTIA Account Has Been Approved" : "Your ZICTIA Account Registration Update",
      contentEn: status === "ACTIVE"
        ? `Your account has been approved by ZICTIA staff. You may now log in to the portal and manage your services.`
        : `Your account registration has been reviewed and rejected. Reason: ${reason}. Please contact ZICTIA support for further assistance.`,
    });
  }

  logger.info("Account approval action", { accountId: id, action: status, by: req.user!.userId, reason });

  res.json(success(account));
}

export async function getSystemSettings(req: AuthRequest, res: Response) {
  const settings = await prisma.systemSetting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  res.json(success(map));
}

const settingsSchema = z.record(z.any());

export async function updateSystemSettings(req: AuthRequest, res: Response) {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid settings", parsed.error.flatten()));
    return;
  }

  const entries = Object.entries(parsed.data);
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        create: { key, value, updatedBy: req.user!.userId },
        update: { value, updatedBy: req.user!.userId },
      })
    )
  );

  res.json(success({ message: "Settings updated" }));
}

export async function getAuditLogs(req: AuthRequest, res: Response) {
  const { userId, entityType, page = "1", limit = "50" } = req.query;
  const where: any = {};
  if (userId) where.userId = userId as string;
  if (entityType) where.entityType = entityType as string;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json(success(logs, { page: parseInt(page as string), limit: parseInt(limit as string), total }));
}

export async function getDashboardMetrics(req: AuthRequest, res: Response) {
  const [
    totalCustomers,
    activeCustomers,
    pendingApprovals,
    totalServices,
    totalTickets,
    openTickets,
    totalInvoices,
    overdueInvoices,
    pendingOrders,
  ] = await Promise.all([
    prisma.customerAccount.count(),
    prisma.customerAccount.count({ where: { status: "ACTIVE" } }),
    prisma.customerAccount.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.customerService.count(),
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "PENDING_CUSTOMER", "PENDING_INTERNAL"] } } }),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { status: "OVERDUE" } }),
    prisma.order.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
  ]);

  res.json(success({
    totalCustomers,
    activeCustomers,
    pendingApprovals,
    totalServices,
    totalTickets,
    openTickets,
    totalInvoices,
    overdueInvoices,
    pendingOrders,
  }));
}

export async function getRevenueTrend(_req: AuthRequest, res: Response) {
  const months: { month: string; total: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const agg = await prisma.invoice.aggregate({
      where: {
        createdAt: { gte: start, lt: end },
        status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID", "PAID"] },
      },
      _sum: { total: true },
    });
    months.push({
      month: d.toLocaleString("default", { month: "short", year: "numeric" }),
      total: Number(agg._sum.total || 0),
    });
  }
  res.json(success(months));
}

export async function getTicketResolutionMetrics(_req: AuthRequest, res: Response) {
  const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
  const metrics = await Promise.all(
    priorities.map(async (priority) => {
      const resolved = await prisma.ticket.findMany({
        where: { priority, status: "RESOLVED", resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
      });
      const avgMinutes =
        resolved.length > 0
          ? resolved.reduce((sum, t) => sum + ((t.resolvedAt!.getTime() - t.createdAt.getTime()) / 60000), 0) / resolved.length
          : 0;
      return { priority, count: resolved.length, avgMinutes: Math.round(avgMinutes) };
    })
  );
  res.json(success(metrics));
}

export async function getServiceUptimeSummary(_req: AuthRequest, res: Response) {
  const services = await prisma.customerService.findMany({
    where: { currentStatus: "Active" },
    select: { uptimePercent: true },
  });
  const avgUptime =
    services.length > 0
      ? services.reduce((sum, s) => sum + Number(s.uptimePercent || 0), 0) / services.length
      : 0;
  res.json(success({ totalServices: services.length, avgUptime: Number(avgUptime.toFixed(2)) }));
}

export async function getCustomerSegments(_req: AuthRequest, res: Response) {
  const segments = await prisma.customerAccount.groupBy({
    by: ["accountType"],
    where: { status: "ACTIVE" },
    _count: { accountType: true },
  });
  res.json(success(segments.map((s) => ({
    segment: s.accountType,
    count: s._count.accountType,
  }))));
}

export async function getSlaCompliance(_req: AuthRequest, res: Response) {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const result = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS total,
      SUM(
        CASE WHEN
          (
            "firstResponseAt" IS NULL
            AND "slaResponseMinutes" IS NOT NULL
            AND "createdAt" + INTERVAL '1 minute' * "slaResponseMinutes" < NOW()
          )
          OR (
            "firstResponseAt" IS NOT NULL
            AND EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) / 60 > "slaResponseMinutes"
          )
          OR (
            "resolvedAt" IS NULL
            AND "slaResolveMinutes" IS NOT NULL
            AND "createdAt" + INTERVAL '1 minute' * "slaResolveMinutes" < NOW()
          )
          OR (
            "resolvedAt" IS NOT NULL
            AND EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 60 > "slaResolveMinutes"
          )
        THEN 1 ELSE 0 END
      )::int AS breached
    FROM tickets
    WHERE "createdAt" >= ${thirtyDaysAgo}
  `;

  const row = (result as any)[0];
  const total = row?.total || 0;
  const breached = row?.breached || 0;
  const complianceRate = total > 0 ? Number((((total - breached) / total) * 100).toFixed(1)) : 0;

  res.json(success({
    totalTickets: total,
    breachedTickets: breached,
    complianceRate,
    periodDays: 30,
  }));
}

export async function getCsatTrends(_req: AuthRequest, res: Response) {
  const now = new Date();
  const months: { month: string; avgScore: number; responseCount: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);

    const result = await prisma.ticket.aggregate({
      where: {
        csatScore: { not: null },
        closedAt: { gte: start, lt: end },
      },
      _avg: { csatScore: true },
      _count: { csatScore: true },
    });

    months.push({
      month: d.toLocaleString("default", { month: "short", year: "numeric" }),
      avgScore: Number((result._avg.csatScore || 0).toFixed(1)),
      responseCount: result._count.csatScore,
    });
  }

  res.json(success(months));
}

export async function getTopCustomers(_req: AuthRequest, res: Response) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const topAccounts = await prisma.invoice.groupBy({
    by: ["accountId"],
    where: {
      createdAt: { gte: startOfYear },
      status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID", "PAID"] },
    },
    _sum: { total: true },
    _count: { id: true },
    orderBy: { _sum: { total: "desc" } },
    take: 10,
  });

  const accounts = await prisma.customerAccount.findMany({
    where: { id: { in: topAccounts.map((a) => a.accountId) } },
    select: { id: true, organisationName: true, accountType: true },
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const ranked = topAccounts.map((a, index) => {
    const account = accountMap.get(a.accountId);
    return {
      rank: index + 1,
      accountId: a.accountId,
      organisationName: account?.organisationName || "—",
      accountType: account?.accountType || "—",
      totalRevenue: Number(a._sum.total || 0),
      invoiceCount: a._count.id,
    };
  });

  res.json(success(ranked));
}

export async function getArAgeing(_req: AuthRequest, res: Response) {
  const now = new Date();

  const result = await prisma.$queryRaw`
    SELECT
      SUM(CASE WHEN "dueDate" >= ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)}::timestamp THEN "total" ELSE 0 END) AS "bucket0_30",
      SUM(CASE WHEN "dueDate" >= ${new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)}::timestamp AND "dueDate" < ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)}::timestamp THEN "total" ELSE 0 END) AS "bucket31_60",
      SUM(CASE WHEN "dueDate" >= ${new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)}::timestamp AND "dueDate" < ${new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)}::timestamp THEN "total" ELSE 0 END) AS "bucket61_90",
      SUM(CASE WHEN "dueDate" < ${new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)}::timestamp THEN "total" ELSE 0 END) AS "bucket90_plus",
      COUNT(CASE WHEN "dueDate" >= ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)}::timestamp THEN 1 END)::int AS "count0_30",
      COUNT(CASE WHEN "dueDate" >= ${new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)}::timestamp AND "dueDate" < ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)}::timestamp THEN 1 END)::int AS "count31_60",
      COUNT(CASE WHEN "dueDate" >= ${new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)}::timestamp AND "dueDate" < ${new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)}::timestamp THEN 1 END)::int AS "count61_90",
      COUNT(CASE WHEN "dueDate" < ${new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)}::timestamp THEN 1 END)::int AS "count90_plus"
    FROM invoices
    WHERE status = 'OVERDUE'
  `;

  const row = (result as any)[0];
  const bucket0_30 = Number(row?.bucket0_30 || 0);
  const bucket31_60 = Number(row?.bucket31_60 || 0);
  const bucket61_90 = Number(row?.bucket61_90 || 0);
  const bucket90_plus = Number(row?.bucket90_plus || 0);
  const totalOverdue = bucket0_30 + bucket31_60 + bucket61_90 + bucket90_plus;

  res.json(success({
    totalOverdue,
    buckets: [
      { label: "0–30 days", amount: bucket0_30, count: row?.count0_30 || 0 },
      { label: "31–60 days", amount: bucket31_60, count: row?.count31_60 || 0 },
      { label: "61–90 days", amount: bucket61_90, count: row?.count61_90 || 0 },
      { label: "90+ days", amount: bucket90_plus, count: row?.count90_plus || 0 },
    ],
  }));
}

export async function getCustomerDashboard(req: AuthRequest, res: Response) {
  const accountId = req.user!.accountId;

  const [
    activeServices,
    outstandingBalance,
    overdueBalance,
    totalPaid,
    activeTickets,
    recentInvoices,
    recentOrders,
    invoiceStatusCounts,
    recentServices,
    creditInfo,
  ] = await Promise.all([
    prisma.customerService.count({ where: { accountId, currentStatus: "Active" } }),
    prisma.invoice.aggregate({
      where: { accountId, status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID"] } },
      _sum: { total: true },
    }).then((r) => r._sum.total || 0),
    prisma.invoice.aggregate({
      where: { accountId, status: "OVERDUE" },
      _sum: { total: true },
    }).then((r) => r._sum.total || 0),
    prisma.invoice.aggregate({
      where: { accountId, status: "PAID" },
      _sum: { total: true },
    }).then((r) => r._sum.total || 0),
    prisma.ticket.count({ where: { accountId, status: { in: ["OPEN", "IN_PROGRESS", "PENDING_CUSTOMER"] } } }),
    prisma.invoice.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, invoiceNumber: true, status: true, total: true, dueDate: true, periodStart: true, periodEnd: true },
    }),
    prisma.order.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, serviceType: true, status: true, totalAmount: true, createdAt: true },
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { accountId },
      _count: { status: true },
    }),
    prisma.customerService.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { service: { select: { nameEn: true } } },
    }),
    prisma.customerAccount.findUnique({
      where: { id: accountId },
      select: { creditLimit: true, creditUtilised: true },
    }),
  ]);

  res.json(success({
    activeServices,
    outstandingBalance: Number(outstandingBalance),
    overdueBalance: Number(overdueBalance),
    totalPaid: Number(totalPaid),
    activeTickets,
    recentInvoices,
    recentOrders,
    invoiceStatusCounts: invoiceStatusCounts.map((c) => ({
      status: c.status,
      count: c._count.status,
    })),
    recentServices,
    creditLimit: creditInfo?.creditLimit ? Number(creditInfo.creditLimit) : null,
    creditUtilised: creditInfo?.creditUtilised ? Number(creditInfo.creditUtilised) : 0,
  }));
}
