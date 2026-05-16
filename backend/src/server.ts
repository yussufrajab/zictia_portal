import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { config } from "./config";
import { connectDb } from "./utils/db";
import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import { startScheduler } from "./jobs/scheduler";

import authRoutes from "./modules/auth/routes";
import catalogRoutes from "./modules/catalog/routes";
import ticketRoutes from "./modules/tickets/routes";
import adminRoutes from "./modules/admin/routes";
import notificationRoutes from "./modules/notifications/routes";
import orderRoutes from "./modules/orders/routes";
import billingRoutes from "./modules/billing/routes";
import paymentRoutes from "./modules/payments/routes";
import slaRoutes from "./modules/sla/routes";
import kbRoutes from "./modules/kb/routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));

app.use("/api/v1", apiLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/catalog", catalogRoutes);
app.use("/api/v1/tickets", ticketRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/sla", slaRoutes);
app.use("/api/v1/kb", kbRoutes);

app.use(errorHandler);

async function start() {
  await connectDb();
  app.listen(config.port, () => {
    logger.info(`ZICTIA Portal API listening on port ${config.port}`);
  });
  startScheduler();
}

start().catch((err) => {
  logger.error("Failed to start server", err);
  process.exit(1);
});
