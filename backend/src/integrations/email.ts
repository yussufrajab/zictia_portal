import nodemailer from "nodemailer";
import { config } from "../config";
import { logger } from "../utils/logger";

interface EmailPayload {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

const transporter = nodemailer.createTransporter({
  host: config.email.smtpHost,
  port: config.email.smtpPort,
  secure: config.email.smtpPort === 465,
  auth: config.email.user
    ? {
        user: config.email.user,
        pass: config.email.pass,
      }
    : undefined,
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const info = await transporter.sendMail({
      from: payload.from || config.email.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    logger.info("Email sent", { messageId: info.messageId, to: payload.to });
    return { success: true, messageId: info.messageId || undefined };
  } catch (err: any) {
    logger.error("Email send failed", { error: err.message, to: payload.to });
    return { success: false, error: err.message };
  }
}
