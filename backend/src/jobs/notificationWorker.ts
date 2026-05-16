import { prisma } from "../utils/db";
import { logger } from "../utils/logger";
import { sendSms } from "../integrations/sms";
import { sendEmail } from "../integrations/email";

export async function processPendingNotifications() {
  const pending = await prisma.notification.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  for (const notif of pending) {
    try {
      if (notif.channel === "SMS") {
        const user = notif.userId
          ? await prisma.user.findUnique({ where: { id: notif.userId } })
          : null;
        if (!user?.mobile) {
          await prisma.notification.update({
            where: { id: notif.id },
            data: { status: "FAILED", errorMessage: "No mobile number" },
          });
          continue;
        }
        const result = await sendSms({
          to: user.mobile,
          message: notif.contentEn,
        });
        await prisma.notification.update({
          where: { id: notif.id },
          data: {
            status: result.success ? "SENT" : "FAILED",
            sentAt: result.success ? new Date() : undefined,
            errorMessage: result.error || undefined,
          },
        });
      } else if (notif.channel === "EMAIL") {
        const user = notif.userId
          ? await prisma.user.findUnique({ where: { id: notif.userId } })
          : null;
        const email = user?.email || notif.accountId
          ? (await prisma.customerAccount.findUnique({ where: { id: notif.accountId || undefined } }))?.billingEmail
          : undefined;

        if (!email) {
          await prisma.notification.update({
            where: { id: notif.id },
            data: { status: "FAILED", errorMessage: "No email address" },
          });
          continue;
        }
        const result = await sendEmail({
          to: email,
          subject: notif.subjectEn || "ZICTIA Notification",
          text: notif.contentEn,
          html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
            <div style="margin-bottom:16px"><strong style="color:#0a2540;font-size:18px">ZICTIA Customer Portal</strong></div>
            <p>${notif.contentEn}</p>
            <div style="margin-top:24px;font-size:12px;color:#9ca3af">
              &copy; ${new Date().getFullYear()} Zanzibar Communication Corporation. All rights reserved.
            </div>
          </div>`,
        });
        await prisma.notification.update({
          where: { id: notif.id },
          data: {
            status: result.success ? "SENT" : "FAILED",
            sentAt: result.success ? new Date() : undefined,
            errorMessage: result.error || undefined,
          },
        });
      } else {
        // IN_APP — mark as sent immediately
        await prisma.notification.update({
          where: { id: notif.id },
          data: { status: "SENT", sentAt: new Date() },
        });
      }
    } catch (err: any) {
      logger.error("Notification processing failed", { notificationId: notif.id, error: err.message });
      await prisma.notification.update({
        where: { id: notif.id },
        data: { status: "FAILED", errorMessage: err.message },
      });
    }
  }
}
