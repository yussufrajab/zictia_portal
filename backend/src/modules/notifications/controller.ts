import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../utils/db";
import { success, error } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth";

const preferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  secondaryBillingEmail: z.string().email().optional(),
  doNotDisturbStart: z.number().int().min(0).max(23).optional(),
  doNotDisturbEnd: z.number().int().min(0).max(23).optional(),
});

export async function listMyNotifications(req: AuthRequest, res: Response) {
  const { status, page = "1", limit = "50" } = req.query;
  const where: any = { userId: req.user!.userId };
  if (status) where.status = status;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    }),
    prisma.notification.count({ where }),
  ]);

  res.json(success(notifications, { page: parseInt(page as string), limit: parseInt(limit as string), total }));
}

export async function markAsRead(req: AuthRequest, res: Response) {
  const { id } = req.params;
  await prisma.notification.updateMany({
    where: { id, userId: req.user!.userId },
    data: { status: "READ" },
  });
  res.json(success({ message: "Marked as read" }));
}

export async function markAllAsRead(req: AuthRequest, res: Response) {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, status: { in: ["PENDING", "SENT"] } },
    data: { status: "READ" },
  });
  res.json(success({ message: "All notifications marked as read" }));
}

export async function getPreferences(req: AuthRequest, res: Response) {
  const account = await prisma.customerAccount.findUnique({
    where: { id: req.user!.accountId },
    select: {
      secondaryBillingEmail: true,
      doNotDisturbStart: true,
      doNotDisturbEnd: true,
    },
  });

  // TODO: per-event-type preferences storage
  res.json(success({
    emailEnabled: true,
    smsEnabled: true,
    secondaryBillingEmail: account?.secondaryBillingEmail,
    doNotDisturbStart: account?.doNotDisturbStart,
    doNotDisturbEnd: account?.doNotDisturbEnd,
  }));
}

export async function updatePreferences(req: AuthRequest, res: Response) {
  const parsed = preferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid preferences", parsed.error.flatten()));
    return;
  }

  await prisma.customerAccount.update({
    where: { id: req.user!.accountId },
    data: {
      secondaryBillingEmail: parsed.data.secondaryBillingEmail,
      doNotDisturbStart: parsed.data.doNotDisturbStart,
      doNotDisturbEnd: parsed.data.doNotDisturbEnd,
    },
  });

  res.json(success({ message: "Preferences updated" }));
}

export async function getUnreadCount(req: AuthRequest, res: Response) {
  const count = await prisma.notification.count({
    where: { userId: req.user!.userId, status: { in: ["PENDING", "SENT"] } },
  });
  res.json(success({ count }));
}
