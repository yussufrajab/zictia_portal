import { Response } from "express";
import { prisma } from "../../utils/db";
import { success, error } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth";
import { logger } from "../../utils/logger";
import { queueNotification } from "../../utils/notifications";

export function computeSlaStatus(ticket: any) {
  const now = new Date();
  const createdAt = new Date(ticket.createdAt);

  let responseBreached = false;
  let resolveBreached = false;
  let responseDueAt: Date | null = null;
  let resolveDueAt: Date | null = null;

  const isPaused = ticket.status === "PENDING_CUSTOMER";

  if (ticket.slaResponseMinutes) {
    responseDueAt = new Date(createdAt.getTime() + ticket.slaResponseMinutes * 60 * 1000);
    if (!ticket.firstResponseAt && !isPaused && now > responseDueAt) {
      responseBreached = true;
    }
  }

  if (ticket.slaResolveMinutes) {
    resolveDueAt = new Date(createdAt.getTime() + ticket.slaResolveMinutes * 60 * 1000);
    if (!ticket.resolvedAt && !isPaused && now > resolveDueAt) {
      resolveBreached = true;
    }
  }

  return {
    responseDueAt: responseDueAt?.toISOString() || null,
    resolveDueAt: resolveDueAt?.toISOString() || null,
    responseBreached,
    resolveBreached,
    isPaused,
    firstResponseAt: ticket.firstResponseAt ? new Date(ticket.firstResponseAt).toISOString() : null,
    resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt).toISOString() : null,
    slaResponseMinutes: ticket.slaResponseMinutes,
    slaResolveMinutes: ticket.slaResolveMinutes,
  };
}

export async function checkSlaBreaches(_req: AuthRequest, res: Response) {
  const openTickets = await prisma.ticket.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS", "PENDING_CUSTOMER", "PENDING_INTERNAL"] as any } },
    include: {
      account: { select: { organisationName: true } },
      comments: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  const now = new Date();
  let breachesFound = 0;

  for (const ticket of openTickets) {
    const status = computeSlaStatus(ticket);
    if (status.responseBreached || status.resolveBreached) {
      breachesFound++;

      const breachType = status.resolveBreached ? "RESOLUTION" : "RESPONSE";
      queueNotification({
        accountId: ticket.accountId,
        eventType: "SLA_BREACH",
        channels: ["EMAIL", "IN_APP"],
        subjectEn: `SLA Breach: ${ticket.subject}`,
        contentEn: `Ticket ${ticket.id.slice(0, 8)} has breached its ${breachType} SLA. Priority: ${ticket.priority}.`,
        relatedType: "ticket",
        relatedId: ticket.id,
      });

      logger.warn("SLA breach detected", {
        ticketId: ticket.id,
        breachType,
        priority: ticket.priority,
        slaResponseMinutes: ticket.slaResponseMinutes,
        slaResolveMinutes: ticket.slaResolveMinutes,
      });
    }
  }

  res.json(success({ checked: openTickets.length, breachesFound }));
}

export async function getSlaMetrics(_req: AuthRequest, res: Response) {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const [totalTickets, breachedTickets, avgResponseTime, avgResolutionTime] = await Promise.all([
    prisma.ticket.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.ticket.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        OR: [
          { firstResponseAt: null, slaResponseMinutes: { not: 0 }, createdAt: { lt: new Date(now.getTime() - 1000) } },
          { resolvedAt: null, slaResolveMinutes: { not: 0 }, createdAt: { lt: new Date(now.getTime() - 1000) } },
        ],
      },
    }),
    // Avg first response time (minutes)
    prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) / 60) as avg
      FROM tickets
      WHERE "firstResponseAt" IS NOT NULL
        AND "createdAt" >= ${thirtyDaysAgo}
    `,
    // Avg resolution time (minutes)
    prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 60) as avg
      FROM tickets
      WHERE "resolvedAt" IS NOT NULL
        AND "createdAt" >= ${thirtyDaysAgo}
    `,
  ]);

  res.json(success({
    totalTickets,
    breachedTickets,
    avgResponseTimeMinutes: Math.round(Number((avgResponseTime as any)[0]?.avg || 0)),
    avgResolutionTimeMinutes: Math.round(Number((avgResolutionTime as any)[0]?.avg || 0)),
  }));
}
