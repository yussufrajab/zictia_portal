import { prisma } from "./db";
import { logger } from "./logger";

interface QueueNotificationParams {
  accountId?: string | null;
  userId?: string | null;
  eventType: string;
  channels?: Array<"EMAIL" | "SMS" | "IN_APP">;
  contentEn: string;
  contentSw?: string;
  subjectEn?: string;
  subjectSw?: string;
  relatedType?: string;
  relatedId?: string;
}

export async function queueNotification(params: QueueNotificationParams) {
  const channels = params.channels || ["EMAIL", "IN_APP"];

  for (const channel of channels) {
    try {
      await prisma.notification.create({
        data: {
          accountId: params.accountId,
          userId: params.userId,
          eventType: params.eventType,
          channel,
          contentEn: params.contentEn,
          contentSw: params.contentSw,
          subjectEn: params.subjectEn,
          subjectSw: params.subjectSw,
          status: "PENDING",
          relatedType: params.relatedType,
          relatedId: params.relatedId,
        },
      });
    } catch (err: any) {
      logger.error("Failed to queue notification", { eventType: params.eventType, error: err.message });
    }
  }
}
