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

const vmConfigSchema = z.object({
  cpu: z.number().int().min(1).max(32),
  ramGB: z.number().int().min(2).max(128),
  diskGB: z.number().int().min(50).max(2000),
  os: z.enum(["Ubuntu", "CentOS", "Windows"]),
  networkType: z.enum(["Shared", "Dedicated"]),
});

const vpnConfigSchema = z.object({
  sites: z.array(z.object({
    address: z.string().min(1),
    subnet: z.string().regex(/^\d+\.\d+\.\d+\.\d+\/\d+$/, "Invalid CIDR subnet"),
    asn: z.number().int().optional(),
  })).min(2, "At least 2 sites required"),
  encryptionRequired: z.boolean().default(true),
  bandwidthMbps: z.number().int().min(1).optional(),
});

const orderQuerySchema = z.object({
  status: z.string().optional(),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
});

function isValidCidr(cidr: string): boolean {
  const parts = cidr.split("/");
  if (parts.length !== 2) return false;
  const ip = parts[0];
  const prefix = parseInt(parts[1], 10);
  if (prefix < 1 || prefix > 32) return false;
  const octets = ip.split(".");
  if (octets.length !== 4) return false;
  return octets.every((o) => {
    const n = parseInt(o, 10);
    return n >= 0 && n <= 255;
  });
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

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
    include: { users: { take: 1 }, services: { include: { service: true } } },
  });
  if (!account || account.status !== "ACTIVE") {
    res.status(403).json(error("FORBIDDEN", "Account must be active to place orders"));
    return;
  }

  // Validate service type specific configuration
  let requiresTechnicalReview = false;
  let totalAmount: any = service.pricingMonthly;
  let prorataAmount: any = null;

  if (serviceType === "VIRTUAL_MACHINE") {
    const vmParsed = vmConfigSchema.safeParse(configuration);
    if (!vmParsed.success) {
      res.status(400).json(error("VALIDATION_ERROR", "Invalid VM configuration", vmParsed.error.flatten()));
      return;
    }
    // VM price calculation: base + (cpu * 15000) + (ramGB * 8000) + (diskGB * 500) + os premium
    const vm = vmParsed.data;
    let vmPrice = totalAmount;
    vmPrice = vmPrice.plus((vm.cpu - 1) * 15000);
    vmPrice = vmPrice.plus((vm.ramGB - 2) * 8000);
    vmPrice = vmPrice.plus((vm.diskGB - 50) * 500);
    if (vm.os === "Windows") vmPrice = vmPrice.plus(25000);
    if (vm.networkType === "Dedicated") vmPrice = vmPrice.plus(50000);
    totalAmount = vmPrice;
  }

  if (serviceType === "VPN") {
    const vpnParsed = vpnConfigSchema.safeParse(configuration);
    if (!vpnParsed.success) {
      res.status(400).json(error("VALIDATION_ERROR", "Invalid VPN configuration", vpnParsed.error.flatten()));
      return;
    }
    for (const site of vpnParsed.data.sites) {
      if (!isValidCidr(site.subnet)) {
        res.status(400).json(error("VALIDATION_ERROR", `Invalid subnet CIDR: ${site.subnet}`));
        return;
      }
    }
    requiresTechnicalReview = true;
  }

  if (serviceType === "INTERNET_CAPACITY" || serviceType === "INTERNET_GOVERNMENT") {
    const newBandwidth = configuration.bandwidthMbps ? parseInt(configuration.bandwidthMbps, 10) : null;
    if (newBandwidth) {
      // Check for existing service of same type for upgrade prorata
      const existingService = account.services.find(
        (s) => s.service.serviceType === serviceType && s.currentStatus === "Active"
      );
      if (existingService) {
        const currentParams = existingService.contractedParameters as any;
        const currentBandwidth = currentParams?.bandwidthMbps || 0;
        const currentPrice = parseFloat(service.pricingMonthly.toString());
        // Simple linear price scaling: base price is for base bandwidth (e.g. 10 Mbps)
        const baseBandwidth = currentBandwidth > 0 ? currentBandwidth : 10;
        const newMonthlyPrice = (currentPrice / baseBandwidth) * newBandwidth;
        const diff = newMonthlyPrice - currentPrice;
        if (diff > 0) {
          const today = new Date();
          const dim = daysInMonth(today);
          const daysRem = dim - today.getDate() + 1;
          const prorata = diff * (daysRem / dim);
          prorataAmount = Math.round(prorata).toString();
          totalAmount = newMonthlyPrice.toString();
        }
      }
      // Store bandwidth in configuration for persistence
      configuration.bandwidthMbps = newBandwidth;
    }
  }

  if (contractDuration === "quarterly" && service.pricingQuarterly) {
    totalAmount = totalAmount.plus(service.pricingQuarterly.minus(service.pricingMonthly));
  } else if (contractDuration === "annual" && service.pricingAnnual) {
    totalAmount = totalAmount.plus(service.pricingAnnual.minus(service.pricingMonthly));
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
      prorataAmount: prorataAmount ? prorataAmount.toString() : null,
      status: serviceType === "COLOCATION" ? "QUOTE_REQUESTED" : "SUBMITTED",
      requiresTechnicalReview,
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

  logger.info("Order created", { orderId: order.id, accountId: req.user!.accountId, serviceId, serviceType });
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

  const cancellableStatuses = ["SUBMITTED", "UNDER_REVIEW", "QUOTE_REQUESTED"];
  if (!cancellableStatuses.includes(order.status)) {
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

  if (order.requiresTechnicalReview && !order.techReviewPassedAt) {
    res.status(400).json(error("TECH_REVIEW_REQUIRED", "Technical review must be passed before approval"));
    return;
  }

  const approvableStatuses = ["SUBMITTED", "UNDER_REVIEW", "CONTRACT_SIGNED", "SCHEDULED"];
  if (!approvableStatuses.includes(order.status)) {
    res.status(400).json(error("INVALID_STATUS", "Only submitted, under-review, contract-signed or scheduled orders can be approved"));
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
      contractedParameters: (order.configuration || {}) as any,
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

  const rejectableStatuses = ["SUBMITTED", "UNDER_REVIEW", "QUOTE_REQUESTED"];
  if (!rejectableStatuses.includes(order.status)) {
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

// ---- Co-Location Admin Endpoints ----

export async function uploadQuote(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    res.status(404).json(error("NOT_FOUND", "Order not found"));
    return;
  }
  if (order.serviceType !== "COLOCATION") {
    res.status(400).json(error("INVALID_TYPE", "Only co-location orders support quotes"));
    return;
  }
  if (order.status !== "UNDER_REVIEW" && order.status !== "QUOTE_REQUESTED") {
    res.status(400).json(error("INVALID_STATUS", "Quote can only be uploaded for under-review or quote-requested orders"));
    return;
  }

  const file = (req as any).file;
  if (!file) {
    res.status(400).json(error("MISSING_FILE", "Quote PDF is required"));
    return;
  }

  // In production, upload to Minio/S3. For now, store local path or base URL.
  const quoteUrl = `/uploads/quotes/${file.filename}`;
  const updated = await prisma.order.update({
    where: { id },
    data: { status: "QUOTE_SENT", quoteDocumentUrl: quoteUrl },
  });

  queueNotification({
    accountId: order.accountId,
    eventType: "QUOTE_SENT",
    channels: ["EMAIL", "IN_APP"],
    subjectEn: "Quote Ready",
    contentEn: `Your co-location quote is ready for review. Reference: ${order.id}.`,
    relatedType: "order",
    relatedId: order.id,
  });

  res.json(success(updated));
}

export async function approveQuote(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const order = await prisma.order.findFirst({
    where: { id, accountId: req.user!.accountId },
  });
  if (!order) {
    res.status(404).json(error("NOT_FOUND", "Order not found"));
    return;
  }
  if (order.status !== "QUOTE_SENT") {
    res.status(400).json(error("INVALID_STATUS", "Quote can only be approved when status is QUOTE_SENT"));
    return;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: "QUOTE_APPROVED", approvedQuoteAt: new Date() },
  });

  queueNotification({
    accountId: order.accountId,
    eventType: "QUOTE_APPROVED",
    channels: ["EMAIL", "IN_APP"],
    subjectEn: "Quote Approved",
    contentEn: `Your co-location quote has been approved. Awaiting contract. Reference: ${order.id}.`,
    relatedType: "order",
    relatedId: order.id,
  });

  res.json(success(updated));
}

export async function uploadContract(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    res.status(404).json(error("NOT_FOUND", "Order not found"));
    return;
  }
  if (order.status !== "QUOTE_APPROVED") {
    res.status(400).json(error("INVALID_STATUS", "Contract can only be uploaded after quote is approved"));
    return;
  }

  const file = (req as any).file;
  if (!file) {
    res.status(400).json(error("MISSING_FILE", "Contract PDF is required"));
    return;
  }

  const contractUrl = `/uploads/contracts/${file.filename}`;
  const updated = await prisma.order.update({
    where: { id },
    data: { status: "CONTRACT_SIGNED", contractDocumentUrl: contractUrl },
  });

  queueNotification({
    accountId: order.accountId,
    eventType: "CONTRACT_RECEIVED",
    channels: ["EMAIL", "IN_APP"],
    subjectEn: "Contract Signed",
    contentEn: `Your co-location contract has been received. We will now schedule installation. Reference: ${order.id}.`,
    relatedType: "order",
    relatedId: order.id,
  });

  res.json(success(updated));
}

export async function scheduleInstallation(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const parsed = z.object({ installationDate: z.string().datetime() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid date", parsed.error.flatten()));
    return;
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    res.status(404).json(error("NOT_FOUND", "Order not found"));
    return;
  }
  if (order.status !== "CONTRACT_SIGNED") {
    res.status(400).json(error("INVALID_STATUS", "Installation can only be scheduled after contract is signed"));
    return;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: "SCHEDULED", installationDate: new Date(parsed.data.installationDate) },
  });

  queueNotification({
    accountId: order.accountId,
    eventType: "INSTALLATION_SCHEDULED",
    channels: ["EMAIL", "IN_APP"],
    subjectEn: "Installation Scheduled",
    contentEn: `Your co-location installation is scheduled for ${new Date(parsed.data.installationDate).toLocaleDateString()}. Reference: ${order.id}.`,
    relatedType: "order",
    relatedId: order.id,
  });

  res.json(success(updated));
}

// ---- Technical Review ----

export async function passTechnicalReview(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    res.status(404).json(error("NOT_FOUND", "Order not found"));
    return;
  }
  if (!order.requiresTechnicalReview) {
    res.status(400).json(error("INVALID_TYPE", "This order does not require technical review"));
    return;
  }
  if (order.techReviewPassedAt) {
    res.status(400).json(error("ALREADY_REVIEWED", "Technical review already passed"));
    return;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      techReviewPassedAt: new Date(),
      techReviewPassedBy: req.user!.userId,
    },
  });

  logger.info("Technical review passed", { orderId: id, by: req.user!.userId });
  res.json(success(updated));
}

export async function getTechReviewStatus(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { requiresTechnicalReview: true, techReviewPassedAt: true, techReviewPassedBy: true },
  });
  if (!order) {
    res.status(404).json(error("NOT_FOUND", "Order not found"));
    return;
  }
  res.json(success(order));
}

// ---- Maintenance Banner ----

export async function getMaintenanceBanner(_req: Request, res: Response) {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: { in: ["maintenanceWindowStart", "maintenanceWindowEnd", "maintenanceMessageEn", "maintenanceMessageSw"] },
    },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const start = map.maintenanceWindowStart ? new Date(map.maintenanceWindowStart as string) : null;
  const end = map.maintenanceWindowEnd ? new Date(map.maintenanceWindowEnd as string) : null;
  const now = new Date();

  if (!start || !end) {
    res.json(success(null));
    return;
  }

  const preShow = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const isUpcoming = now >= preShow && now < start;
  const isActive = now >= start && now <= end;

  if (!isUpcoming && !isActive) {
    res.json(success(null));
    return;
  }

  res.json(success({
    isUpcoming,
    isActive,
    start: start.toISOString(),
    end: end.toISOString(),
    messageEn: map.maintenanceMessageEn || "Scheduled maintenance in progress.",
    messageSw: map.maintenanceMessageSw || "Matengenezo yalioratibwa yanendelea.",
    hoursUntil: isUpcoming ? Math.max(0, Math.floor((start.getTime() - now.getTime()) / (1000 * 60 * 60))) : 0,
  }));
}
