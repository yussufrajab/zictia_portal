import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../utils/db";
import { success, error } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth";
import { logger } from "../../utils/logger";
import { queueNotification } from "../../utils/notifications";

const createTicketSchema = z.object({
  ticketType: z.enum(["TECHNICAL_ISSUE", "BILLING_QUERY", "SERVICE_REQUEST", "COMPLAINT", "GENERAL_ENQUIRY"]),
  subscriptionId: z.string().uuid().optional(),
  subject: z.string().min(3).max(150),
  description: z.string().min(10).max(5000),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  preferredContact: z.enum(["email", "sms", "in-portal"]).default("email"),
});

const commentSchema = z.object({
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
  attachments: z.array(z.string()).default([]),
});

function getBaseSlaMinutes(priority: string) {
  switch (priority) {
    case "CRITICAL": return { response: 30, resolve: 4 * 60 };
    case "HIGH": return { response: 2 * 60, resolve: 8 * 60 };
    case "MEDIUM": return { response: 4 * 60, resolve: 24 * 60 };
    default: return { response: 8 * 60, resolve: 48 * 60 };
  }
}

function getSlaMultiplier(slaTier: string) {
  switch (slaTier) {
    case "PLATINUM": return 0.5;
    case "GOLD": return 0.75;
    case "SILVER": return 1.0;
    default: return 1.5;
  }
}

function getSlaTimes(priority: string, slaTier?: string) {
  const base = getBaseSlaMinutes(priority);
  const multiplier = slaTier ? getSlaMultiplier(slaTier) : 1.0;
  return {
    response: Math.max(15, Math.round(base.response * multiplier)),
    resolve: Math.max(60, Math.round(base.resolve * multiplier)),
  };
}

export async function createTicket(req: AuthRequest, res: Response) {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid ticket data", parsed.error.flatten()));
    return;
  }

  const data = parsed.data;

  // Look up service SLA tier if subscription is provided
  let slaTier: string | undefined;
  if (data.subscriptionId) {
    const cs = await prisma.customerService.findFirst({
      where: { id: data.subscriptionId },
      include: { service: { select: { slaTier: true } } },
    });
    if (cs?.service?.slaTier) {
      slaTier = cs.service.slaTier;
    }
  }

  const sla = getSlaTimes(data.priority, slaTier);

  const ticket = await prisma.ticket.create({
    data: {
      accountId: req.user!.accountId,
      subscriptionId: data.subscriptionId || null,
      ticketType: data.ticketType,
      priority: data.priority,
      status: "OPEN",
      subject: data.subject,
      description: data.description,
      slaResponseMinutes: sla.response,
      slaResolveMinutes: sla.resolve,
      preferredContact: data.preferredContact,
    },
  });

  logger.info("Ticket created", { ticketId: ticket.id, accountId: req.user!.accountId });

  await queueNotification({
    accountId: req.user!.accountId,
    userId: req.user!.userId,
    eventType: "TICKET_CREATED",
    channels: ["EMAIL", "SMS", "IN_APP"],
    subjectEn: `Support Ticket Created: ${ticket.subject}`,
    contentEn: `Your ticket ${ticket.id} has been created with priority ${ticket.priority}. Our team will respond within the SLA window.`,
    relatedType: "ticket",
    relatedId: ticket.id,
  });

  res.status(201).json(success(ticket));
}

export async function listMyTickets(req: AuthRequest, res: Response) {
  const { status, priority, page = "1", limit = "20", search } = req.query;
  const where: any = { accountId: req.user!.accountId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [
      { subject: { contains: search as string, mode: "insensitive" } },
      { description: { contains: search as string, mode: "insensitive" } },
    ];
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json(success(tickets, { page: parseInt(page as string), limit: parseInt(limit as string), total }));
}

export async function getTicket(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const ticket = await prisma.ticket.findFirst({
    where: { id, accountId: req.user!.accountId },
    include: {
      comments: {
        where: { isInternal: false },
        include: { user: { select: { fullName: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      subscription: { include: { service: true } },
    },
  });

  if (!ticket) {
    res.status(404).json(error("NOT_FOUND", "Ticket not found"));
    return;
  }

  res.json(success(ticket));
}

export async function addComment(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid comment data", parsed.error.flatten()));
    return;
  }

  const ticket = await prisma.ticket.findFirst({ where: { id, accountId: req.user!.accountId } });
  if (!ticket) {
    res.status(404).json(error("NOT_FOUND", "Ticket not found"));
    return;
  }

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId: id,
      userId: req.user!.userId,
      content: parsed.data.content,
      isInternal: false,
      attachments: parsed.data.attachments,
    },
  });

  // Track first response time when staff replies for the first time
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { role: true } });
  const staffRoles = ["STAFF_CSR", "STAFF_TECHNICIAN", "STAFF_MANAGER", "ADMIN"];
  const isStaff = staffRoles.includes(user?.role || "");
  if (isStaff && !ticket.firstResponseAt) {
    await prisma.ticket.update({
      where: { id },
      data: { firstResponseAt: new Date() },
    });
  }

  // Re-open if resolved and customer replies
  if (ticket.status === "RESOLVED" && !isStaff) {
    await prisma.ticket.update({
      where: { id },
      data: { status: "OPEN", resolvedAt: null },
    });
  }

  res.status(201).json(success(comment));
}

export async function closeTicket(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const ticket = await prisma.ticket.findFirst({ where: { id, accountId: req.user!.accountId } });
  if (!ticket) {
    res.status(404).json(error("NOT_FOUND", "Ticket not found"));
    return;
  }

  if (ticket.status !== "RESOLVED") {
    res.status(400).json(error("INVALID_STATUS", "Only resolved tickets can be closed by the customer"));
    return;
  }

  await prisma.ticket.update({
    where: { id },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  await queueNotification({
    accountId: ticket.accountId,
    eventType: "TICKET_CLOSED",
    channels: ["EMAIL", "IN_APP"],
    subjectEn: `Ticket Closed: ${ticket.subject}`,
    contentEn: `Your ticket ${ticket.id.slice(0, 8)} has been closed. Please rate your support experience to help us improve.`,
    relatedType: "ticket",
    relatedId: ticket.id,
  });

  res.json(success({ message: "Ticket closed" }));
}

export async function escalateTicket(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason || typeof reason !== "string" || reason.length < 5) {
    res.status(400).json(error("VALIDATION_ERROR", "A reason for escalation is required (min 5 characters)"));
    return;
  }

  const ticket = await prisma.ticket.findFirst({ where: { id, accountId: req.user!.accountId } });
  if (!ticket) {
    res.status(404).json(error("NOT_FOUND", "Ticket not found"));
    return;
  }

  if (ticket.status === "CLOSED") {
    res.status(400).json(error("INVALID_STATUS", "Closed tickets cannot be escalated"));
    return;
  }

  await prisma.ticket.update({
    where: { id },
    data: {
      currentLevel: ticket.currentLevel + 1,
      escalatedAt: new Date(),
      escalatedReason: reason,
    },
  });

  await queueNotification({
    accountId: ticket.accountId,
    eventType: "TICKET_ESCALATED",
    channels: ["EMAIL", "IN_APP"],
    subjectEn: `Ticket Escalated: ${ticket.subject}`,
    contentEn: `Your ticket ${ticket.id.slice(0, 8)} has been escalated to Level ${ticket.currentLevel + 1}. Reason: ${reason}. A supervisor will review it shortly.`,
    relatedType: "ticket",
    relatedId: ticket.id,
  });

  res.json(success({ message: "Ticket escalated successfully" }));
}

// Admin / staff ticket management
export async function submitCsat(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { score, resolved, comment } = req.body;

  if (!score || score < 1 || score > 5) {
    res.status(400).json(error("VALIDATION_ERROR", "CSAT score must be 1–5"));
    return;
  }
  if (!resolved || !["Yes", "Partially", "No"].includes(resolved)) {
    res.status(400).json(error("VALIDATION_ERROR", "Resolved must be Yes, Partially, or No"));
    return;
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id, accountId: req.user!.accountId, status: { in: ["RESOLVED", "CLOSED"] } },
  });
  if (!ticket) {
    res.status(404).json(error("NOT_FOUND", "Ticket not found or not resolved"));
    return;
  }

  await prisma.ticket.update({
    where: { id },
    data: { csatScore: score, csatResolved: resolved, csatComment: comment || "" },
  });

  res.json(success({ message: "Feedback submitted. Thank you!" }));
}

export async function listAllTickets(req: AuthRequest, res: Response) {
  const { status, priority, assignee, page = "1", limit = "20" } = req.query;
  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        account: { select: { organisationName: true, accountType: true } },
        comments: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json(success(tickets, { page: parseInt(page as string), limit: parseInt(limit as string), total }));
}

export async function assignTicket(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { assigneeUserId } = req.body;

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { status: "IN_PROGRESS" },
  });

  await queueNotification({
    accountId: ticket.accountId,
    eventType: "TICKET_ASSIGNED",
    channels: ["EMAIL", "IN_APP"],
    subjectEn: `Ticket In Progress: ${ticket.subject}`,
    contentEn: `Your ticket ${ticket.id.slice(0, 8)} is now being actively worked on by our support team.`,
    relatedType: "ticket",
    relatedId: ticket.id,
  });

  res.json(success(ticket));
}

export async function addInternalNote(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { content, attachments = [] } = req.body;

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId: id,
      userId: req.user!.userId,
      content,
      isInternal: true,
      attachments,
    },
  });

  res.status(201).json(success(comment));
}

export async function resolveTicket(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { resolutionNote } = req.body;

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  if (resolutionNote) {
    await prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: req.user!.userId,
        content: resolutionNote,
        isInternal: false,
        attachments: [],
      },
    });
  }

  await queueNotification({
    accountId: ticket.accountId,
    eventType: "TICKET_RESOLVED",
    channels: ["EMAIL", "IN_APP"],
    subjectEn: `Ticket Resolved: ${ticket.subject}`,
    contentEn: `Your ticket ${ticket.id.slice(0, 8)} has been resolved. If the issue persists or you are not satisfied, you may re-open the ticket within 7 days.`,
    relatedType: "ticket",
    relatedId: ticket.id,
  });

  res.json(success(ticket));
}
