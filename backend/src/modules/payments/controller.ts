import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../utils/db";
import { success, error } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth";
import { logger } from "../../utils/logger";
import { queueNotification } from "../../utils/notifications";
import { config } from "../../config";

const initiateSchema = z.object({
  invoiceId: z.string().optional(),
  amount: z.number().positive(),
  method: z.enum(["M_PESA", "TIGO_PESA", "AIRTEL_MONEY", "HALO_PESA", "CARD", "BANK_TRANSFER"]),
  phoneNumber: z.string().optional(),
});

const MOCK_PAYMENT = config.zanmalipo.apiKey === "" || config.env === "development";

function generateReceiptNumber(): string {
  const prefix = "ZICTIA-RCP";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function initiatePayment(req: AuthRequest, res: Response) {
  const parsed = initiateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid payment data", parsed.error.flatten()));
    return;
  }

  const { invoiceId, amount, method, phoneNumber } = parsed.data;
  const accountId = req.user!.accountId;

  // Validate invoice if provided
  let invoice: any = null;
  if (invoiceId) {
    invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, accountId },
    });
    if (!invoice) {
      res.status(404).json(error("NOT_FOUND", "Invoice not found"));
      return;
    }
    if (invoice.status === "PAID") {
      res.status(400).json(error("ALREADY_PAID", "Invoice is already paid"));
      return;
    }
  }

  const payment = await prisma.payment.create({
    data: {
      accountId,
      invoiceId: invoiceId || null,
      amount,
      method,
      status: "PENDING",
      zanmalipoRef: MOCK_PAYMENT ? `MOCK-${Date.now()}` : undefined,
    },
  });

  if (MOCK_PAYMENT) {
    // Simulate async processing
    setTimeout(async () => {
      try {
        const receipt = generateReceiptNumber();
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            receiptNumber: receipt,
            processedAt: new Date(),
          },
        });

        if (invoiceId) {
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: "PAID" },
          });
        }

        queueNotification({
          accountId,
          eventType: "PAYMENT_RECEIVED",
          channels: ["EMAIL", "IN_APP"],
          subjectEn: "Payment Received",
          contentEn: `Your payment of TZS ${amount.toLocaleString()} via ${method.replace("_", " ")} has been received. Receipt: ${receipt}.`,
          relatedType: "payment",
          relatedId: payment.id,
        });

        logger.info("Mock payment completed", { paymentId: payment.id, receipt, amount, method });
      } catch (e) {
        logger.error("Mock payment completion failed", { paymentId: payment.id, error: e });
      }
    }, 3000);

    res.json(success({
      paymentId: payment.id,
      status: "PENDING",
      mock: true,
      message: "Mock payment initiated. It will auto-complete in ~3 seconds.",
    }));
    return;
  }

  // Real ZanMalipo integration would go here
  res.status(501).json(error("NOT_IMPLEMENTED", "Live ZanMalipo integration is not yet configured"));
}

export async function handleWebhook(req: Request, res: Response) {
  const webhookSchema = z.object({
    zanmalipoRef: z.string(),
    status: z.enum(["SUCCESS", "FAILED"]),
    amount: z.number(),
    receiptNumber: z.string().optional(),
    failureReason: z.string().optional(),
  });

  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid webhook payload", parsed.error.flatten()));
    return;
  }

  const { zanmalipoRef, status, amount, receiptNumber, failureReason } = parsed.data;

  const payment = await prisma.payment.findFirst({
    where: { zanmalipoRef },
    include: { invoice: true },
  });

  if (!payment) {
    res.status(404).json(error("NOT_FOUND", "Payment reference not found"));
    return;
  }

  if (payment.status !== "PENDING") {
    res.status(400).json(error("INVALID_STATE", "Payment is not in pending state"));
    return;
  }

  const newStatus = status === "SUCCESS" ? "COMPLETED" : "FAILED";

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: newStatus,
      receiptNumber: receiptNumber || generateReceiptNumber(),
      processedAt: new Date(),
      failureReason: failureReason || undefined,
    },
  });

  if (newStatus === "COMPLETED" && payment.invoiceId) {
    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: "PAID" },
    });

    queueNotification({
      accountId: payment.accountId,
      eventType: "PAYMENT_RECEIVED",
      channels: ["EMAIL", "IN_APP"],
      subjectEn: "Payment Received",
      contentEn: `Your payment of TZS ${Number(amount).toLocaleString()} has been received.`,
      relatedType: "payment",
      relatedId: payment.id,
    });
  }

  logger.info("Webhook processed", { paymentId: payment.id, zanmalipoRef, status: newStatus });
  res.json(success({ paymentId: payment.id, status: newStatus }));
}

export async function getPaymentStatus(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const payment = await prisma.payment.findFirst({
    where: { id, accountId: req.user!.accountId },
    include: { invoice: { select: { invoiceNumber: true, status: true } } },
  });

  if (!payment) {
    res.status(404).json(error("NOT_FOUND", "Payment not found"));
    return;
  }

  res.json(success(payment));
}

export async function listMyPayments(req: AuthRequest, res: Response) {
  const payments = await prisma.payment.findMany({
    where: { accountId: req.user!.accountId },
    orderBy: { createdAt: "desc" },
    include: { invoice: { select: { invoiceNumber: true } } },
  });

  res.json(success(payments));
}

export async function getPaymentMethods(_req: Request, res: Response) {
  const methods = [
    { code: "M_PESA", name: "M-Pesa", category: "mobile_money", icon: "phone" },
    { code: "TIGO_PESA", name: "Tigo Pesa", category: "mobile_money", icon: "phone" },
    { code: "AIRTEL_MONEY", name: "Airtel Money", category: "mobile_money", icon: "phone" },
    { code: "HALO_PESA", name: "HaloPesa", category: "mobile_money", icon: "phone" },
    { code: "CARD", name: "Debit/Credit Card", category: "card", icon: "credit-card" },
    { code: "BANK_TRANSFER", name: "Bank Transfer", category: "bank", icon: "landmark" },
  ];

  res.json(success(methods));
}
