import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../utils/db";
import { success, error } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth";
import { logger } from "../../utils/logger";

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

  // TODO: send approval/rejection notification
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
  }));
}
