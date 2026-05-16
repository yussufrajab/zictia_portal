import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../utils/db";
import { success, error } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth";
import { logger } from "../../utils/logger";
import { queueNotification } from "../../utils/notifications";

const createOrderSchema = z.object({
  serviceId: z.string().min(1),
  serviceType: z.enum(["INTERNET_CAPACITY", "INTERNET_GOVERNMENT", "VIRTUAL_MACHINE", "COLOCATION", "IP_MPLS", "VPN"]),
  configuration: z.record(z.any()).default({}),
  contractDuration: z.enum(["monthly", "quarterly", "annual"]).default("monthly"),
  autoRenew: z.boolean().default(false),
});

const orderQuerySchema = z.object({
  status: z.string().optional(),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
});

export async function createOrder(req: AuthRequest, res: Response) {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid order data", parsed.error.flatten()));
    return;
  }

  const { serviceId, serviceType, configuration, contractDuration, autoRenew } = parsed.data;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || service.status !== "PUBLISHED") {
    res.status(404).json(error("NOT_FOUND", "Service not found or not available"));
    return;
  }

  const account = await prisma.customerAccount.findUnique({
    where: { id: req.user!.accountId },
    include: { users: { take: 1 } },
  });
  if (!account || account.status !== "ACTIVE") {
    res.status(403).json(error("FORBIDDEN", "Account must be active to place orders"));
    return;
  }

  // Calculate total based on contract duration
  let totalAmount = service.pricingMonthly;
  if (contractDuration === "quarterly" && service.pricingQuarterly) {
    totalAmount = service.pricingQuarterly;
  } else if (contractDuration === "annual" && service.pricingAnnual) {
    totalAmount = service.pricingAnnual;
  }
  if (service.setupFee) {
    totalAmount = totalAmount.plus(service.setupFee);
  }

  const order = await prisma.order.create({
    data: {
      accountId: req.user!.accountId,
      serviceId,
      serviceType,
      configuration,
      contractDuration,
      autoRenew,
      totalAmount,
      status: "SUBMITTED",
    },
  });

  queueNotification({
    accountId: req.user!.accountId,
    userId: req.user!.userId,
    eventType: "ORDER_SUBMITTED",
    channels: ["EMAIL", "IN_APP"],
    subjectEn: "Order Submitted",
    contentEn: `Your order for ${service.nameEn} has been submitted and is under review. Reference: ${order.id}.`,
    relatedType: "order",
    relatedId: order.id,
  });

  logger.info("Order created", { orderId: order.id, accountId: req.user!.accountId, serviceId });
  res.status(201).json(success(order));
}

export async function listMyOrders(req: AuthRequest, res: Response) {
  const parsed = orderQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid query", parsed.error.flatten()));
    return;
  }

  const { status, page, limit } = parsed.data;
  const where: any = { accountId: req.user!.accountId };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { service: { select: { nameEn: true, nameSw: true, category: true } } },
      orderBy: { createdAt: "desc" },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.order.count({ where }),
  ]);

  res.json(success(orders, { page: parseInt(page), limit: parseInt(limit), total }));
}

export async function getOrderDetail(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const order = await prisma.order.findFirst({
    where: { id, accountId: req.user!.accountId },
    include: { service: true },
  });

  if (!order) {
    res.status(404).json(error("NOT_FOUND", "Order not found"));
    return;
  }

  res.json(success(order));
}

export async function cancelOrder(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const order = await prisma.order.findFirst({
    where: { id, accountId: req.user!.accountId },
  });

  if (!order) {
    res.status(404).json(error("NOT_FOUND", "Order not found"));
    return;
  }

  if (!["SUBMITTED", "UNDER_REVIEW"].includes(order.status)) {
    res.status(400).json(error("INVALID_STATUS", "Orders can only be cancelled before approval"));
    return;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: req.user!.userId,
    },
  });

  queueNotification({
    accountId: req.user!.accountId,
    userId: req.user!.userId,
    eventType: "ORDER_CANCELLED",
    channels: ["EMAIL", "IN_APP"],
    subjectEn: "Order Cancelled",
    contentEn: `Your order has been cancelled. Reference: ${order.id}.`,
    relatedType: "order",
    relatedId: order.id,
  });

  res.json(success(updated));
}

export async function listAllOrders(req: AuthRequest, res: Response) {
  const parsed = orderQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid query", parsed.error.flatten()));
    return;
  }

  const { status, page, limit } = parsed.data;
  const where: any = {};
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        service: { select: { nameEn: true, nameSw: true } },
        account: { select: { organisationName: true, accountType: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.order.count({ where }),
  ]);

  res.json(success(orders, { page: parseInt(page), limit: parseInt(limit), total }));
}

const actionSchema = z.object({
  reason: z.string().min(5).max(500).optional(),
  provisioningNotes: z.string().max(2000).optional(),
});

export async function approveOrder(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid data", parsed.error.flatten()));
    return;
  }

  const { provisioningNotes } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id }, include: { account: true } });
  if (!order) {
    res.status(404).json(error("NOT_FOUND", "Order not found"));
    return;
  }

  if (order.status !== "SUBMITTED" && order.status !== "UNDER_REVIEW") {
    res.status(400).json(error("INVALID_STATUS", "Only submitted or under-review orders can be approved"));
    return;
  }

  // Step 1: Mark approved
  await prisma.order.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: req.user!.userId,
      provisioningNotes: provisioningNotes || undefined,
    },
  });

  // Step 2: Create customer service in Provisioning state
  const customerService = await prisma.customerService.create({
    data: {
      accountId: order.accountId,
      serviceId: order.serviceId!,
      startDate: new Date(),
      currentStatus: "Provisioning",
      contractedParameters: order.configuration,
      autoRenew: order.autoRenew,
    },
  });

  // Step 3: Transition order to PROVISIONING
  const updated = await prisma.order.update({
    where: { id },
    data: { status: "PROVISIONING" },
  });

  // Step 4: Simulate async provisioning (30s in dev)
  const provisioningDelayMs = process.env.PROVISIONING_DELAY_MS ? parseInt(process.env.PROVISIONING_DELAY_MS) : 30000;
  setTimeout(async () => {
    try {
      await prisma.order.update({ where: { id }, data: { status: "ACTIVE", completedAt: new Date() } });
      await prisma.customerService.update({
        where: { id: customerService.id },
        data: { currentStatus: "Active", uptimePercent: 100.00 },
      });
      queueNotification({
        accountId: order.accountId,
        eventType: "ORDER_ACTIVE",
        channels: ["EMAIL", "IN_APP"],
        subjectEn: "Service Active",
        contentEn: `Your service is now active and ready for use. Reference: ${order.id}.`,
        relatedType: "order",
        relatedId: order.id,
      });
      logger.info("Provisioning completed", { orderId: id, customerServiceId: customerService.id });
    } catch (e) {
      logger.error("Provisioning completion failed", { orderId: id, error: e });
    }
  }, provisioningDelayMs);

  queueNotification({
    accountId: order.accountId,
    eventType: "ORDER_APPROVED",
    channels: ["EMAIL", "IN_APP"],
    subjectEn: "Order Approved",
    contentEn: `Your order has been approved and is being provisioned. Reference: ${order.id}.`,
    relatedType: "order",
    relatedId: order.id,
  });

  logger.info("Order approved and provisioning started", { orderId: id, by: req.user!.userId, delayMs: provisioningDelayMs });
  res.json(success(updated));
}

export async function rejectOrder(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid data", parsed.error.flatten()));
    return;
  }

  const { reason } = parsed.data;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    res.status(404).json(error("NOT_FOUND", "Order not found"));
    return;
  }

  if (!["SUBMITTED", "UNDER_REVIEW"].includes(order.status)) {
    res.status(400).json(error("INVALID_STATUS", "Only submitted or under-review orders can be rejected"));
    return;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "REJECTED",
      cancellationReason: reason || "Rejected by staff",
      cancelledAt: new Date(),
      cancelledBy: req.user!.userId,
    },
  });

  queueNotification({
    accountId: order.accountId,
    eventType: "ORDER_REJECTED",
    channels: ["EMAIL", "IN_APP"],
    subjectEn: "Order Rejected",
    contentEn: `Your order has been rejected. Reason: ${reason || "Rejected by staff"}. Reference: ${order.id}.`,
    relatedType: "order",
    relatedId: order.id,
  });

  logger.info("Order rejected", { orderId: id, by: req.user!.userId, reason });
  res.json(success(updated));
}
