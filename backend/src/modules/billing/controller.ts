import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../utils/db";
import { success, error } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth";
import { logger } from "../../utils/logger";
import { queueNotification } from "../../utils/notifications";

const invoiceQuerySchema = z.object({
  status: z.string().optional(),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
});

export async function listMyInvoices(req: AuthRequest, res: Response) {
  const parsed = invoiceQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid query", parsed.error.flatten()));
    return;
  }

  const { status, page, limit } = parsed.data;
  const where: any = { accountId: req.user!.accountId };
  if (status) where.status = status;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.invoice.count({ where }),
  ]);

  res.json(success(invoices, { page: parseInt(page), limit: parseInt(limit), total }));
}

export async function getInvoiceDetail(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, accountId: req.user!.accountId },
    include: { payments: true },
  });

  if (!invoice) {
    res.status(404).json(error("NOT_FOUND", "Invoice not found"));
    return;
  }

  res.json(success(invoice));
}

export async function listAllInvoices(req: AuthRequest, res: Response) {
  const parsed = invoiceQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid query", parsed.error.flatten()));
    return;
  }

  const { status, page, limit } = parsed.data;
  const where: any = {};
  if (status) where.status = status;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        account: { select: { organisationName: true, accountType: true } },
        payments: { select: { id: true, amount: true, status: true, processedAt: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.invoice.count({ where }),
  ]);

  res.json(success(invoices, { page: parseInt(page), limit: parseInt(limit), total }));
}

const generateSchema = z.object({
  accountId: z.string().min(1),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().int().min(1).default(1),
    unitPrice: z.number().positive(),
  })).optional(),
  notes: z.string().optional(),
});

async function getNextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({
    where: { invoiceNumber: { startsWith: `ZICTIA-INV-${year}-` } },
  });
  const seq = String(count + 1).padStart(5, "0");
  return `ZICTIA-INV-${year}-${seq}`;
}

export async function generateInvoice(req: AuthRequest, res: Response) {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid data", parsed.error.flatten()));
    return;
  }

  const { accountId, periodStart, periodEnd, lineItems, notes } = parsed.data;

  const account = await prisma.customerAccount.findUnique({
    where: { id: accountId },
    include: { users: { select: { email: true } } },
  });
  if (!account) {
    res.status(404).json(error("NOT_FOUND", "Account not found"));
    return;
  }

  // Determine period
  const now = new Date();
  const start = periodStart ? new Date(periodStart) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = periodEnd ? new Date(periodEnd) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Build line items from active services if none provided
  let items: Array<{ description: string; quantity: number; unitPrice: number }> = lineItems || [];
  if (items.length === 0) {
    const services = await prisma.customerService.findMany({
      where: { accountId, currentStatus: "Active" },
      include: { service: true },
    });
    items = services.map((cs) => ({
      description: cs.service.nameEn,
      quantity: 1,
      unitPrice: Number(cs.service.pricingMonthly),
    }));
  }

  if (items.length === 0) {
    res.status(400).json(error("NO_SERVICES", "No active services or line items to invoice"));
    return;
  }

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const vatRate = 0.18;
  const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
  const total = subtotal + vatAmount;

  const dueDaysSetting = await prisma.systemSetting.findUnique({ where: { key: "invoice_due_days" } });
  const dueDays = (dueDaysSetting?.value as number) || 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  const invoiceNumber = await getNextInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      accountId,
      invoiceNumber,
      periodStart: start,
      periodEnd: end,
      lineItems: items as any,
      subtotal,
      vatAmount,
      total,
      status: "ISSUED",
      dueDate,
      notes: notes || undefined,
    },
  });

  queueNotification({
    accountId,
    eventType: "INVOICE_ISSUED",
    channels: ["EMAIL", "IN_APP"],
    subjectEn: `Invoice ${invoiceNumber}`,
    contentEn: `A new invoice for TZS ${total.toLocaleString()} has been issued. Due date: ${dueDate.toLocaleDateString()}.`,
    relatedType: "invoice",
    relatedId: invoice.id,
  });

  logger.info("Invoice generated", { invoiceId: invoice.id, invoiceNumber, accountId, total });
  res.status(201).json(success(invoice));
}

export async function getInvoiceStats(req: AuthRequest, res: Response) {
  const accountId = req.user!.accountId;

  const [outstanding, overdue, totalPaid] = await Promise.all([
    prisma.invoice.aggregate({
      where: { accountId, status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID"] } },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { accountId, status: "OVERDUE" },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { accountId, status: "PAID" },
      _sum: { total: true },
    }),
  ]);

  res.json(success({
    outstandingBalance: outstanding._sum.total || 0,
    overdueBalance: overdue._sum.total || 0,
    totalPaid: totalPaid._sum.total || 0,
  }));
}
