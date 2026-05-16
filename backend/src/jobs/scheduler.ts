import { prisma } from "../utils/db";
import { logger } from "../utils/logger";
import { queueNotification } from "../utils/notifications";
import { computeSlaStatus } from "../modules/sla/controller";

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const PASSWORD_EXPIRY_DAYS = 90;
const REMINDER_DAYS_BEFORE = 3;

async function invoiceDueReminders() {
  const now = new Date();
  const reminderDate = new Date(now);
  reminderDate.setDate(reminderDate.getDate() + REMINDER_DAYS_BEFORE);
  const startOfDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());
  const endOfDay = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate() + 1);

  const invoices = await prisma.invoice.findMany({
    where: {
      dueDate: { gte: startOfDay, lt: endOfDay },
      status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID"] },
      OR: [
        { lastNoticeAt: null },
        { lastNoticeAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      ],
    },
    include: { account: { select: { id: true, organisationName: true, billingEmail: true } } },
  });

  for (const inv of invoices) {
    queueNotification({
      accountId: inv.accountId,
      eventType: "INVOICE_DUE_REMINDER",
      channels: ["EMAIL", "IN_APP"],
      subjectEn: `Invoice ${inv.invoiceNumber} due in ${REMINDER_DAYS_BEFORE} days`,
      contentEn: `Your invoice ${inv.invoiceNumber} for TSh ${Number(inv.total).toLocaleString()} is due on ${inv.dueDate.toDateString()}. Please arrange payment to avoid late fees.`,
      relatedType: "invoice",
      relatedId: inv.id,
    });

    await prisma.invoice.update({
      where: { id: inv.id },
      data: { lastNoticeAt: new Date(), overdueNotices: { increment: 1 } },
    });
  }

  if (invoices.length > 0) {
    logger.info("Invoice due reminders sent", { count: invoices.length });
  }
}

async function slaBreachCheck() {
  const openStatuses = ["OPEN", "IN_PROGRESS", "PENDING_CUSTOMER", "PENDING_INTERNAL"] as const;
  const openTickets = await prisma.ticket.findMany({
    where: { status: { in: openStatuses as any } },
    include: {
      account: { select: { organisationName: true } },
      comments: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

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
    }
  }

  if (breachesFound > 0) {
    logger.warn("SLA breach check complete", { checked: openTickets.length, breachesFound });
  }
}

async function passwordExpiryWarnings() {
  const now = new Date();
  const expiryThreshold = new Date(now);
  expiryThreshold.setDate(expiryThreshold.getDate() + 7);

  const minChangedAt = new Date(expiryThreshold);
  minChangedAt.setDate(minChangedAt.getDate() - PASSWORD_EXPIRY_DAYS);

  const maxChangedAt = new Date(now);
  maxChangedAt.setDate(maxChangedAt.getDate() - PASSWORD_EXPIRY_DAYS);

  const users = await prisma.user.findMany({
    where: {
      passwordChangedAt: { gte: maxChangedAt, lte: minChangedAt },
    },
    include: { account: { select: { id: true } } },
  });

  for (const user of users) {
    const daysLeft = Math.ceil(
      (new Date(user.passwordChangedAt.getTime() + PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000).getTime() - now.getTime()) /
        (24 * 60 * 60 * 1000)
    );

    queueNotification({
      userId: user.id,
      accountId: user.accountId,
      eventType: "PASSWORD_EXPIRY_WARNING",
      channels: ["EMAIL", "IN_APP"],
      subjectEn: "Password expiring soon",
      contentEn: `Your portal password will expire in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Please change it to avoid account lockout.`,
    });
  }

  if (users.length > 0) {
    logger.info("Password expiry warnings sent", { count: users.length });
  }
}

export function startScheduler() {
  logger.info("Scheduler started", { intervalMinutes: 5 });

  async function tick() {
    try {
      await invoiceDueReminders();
    } catch (err: any) {
      logger.error("Invoice reminder task failed", { error: err.message });
    }
    try {
      await slaBreachCheck();
    } catch (err: any) {
      logger.error("SLA breach check task failed", { error: err.message });
    }
    try {
      await passwordExpiryWarnings();
    } catch (err: any) {
      logger.error("Password expiry task failed", { error: err.message });
    }
  }

  // Run immediately on startup, then every 5 minutes
  tick();
  const interval = setInterval(tick, INTERVAL_MS);

  return () => clearInterval(interval);
}
