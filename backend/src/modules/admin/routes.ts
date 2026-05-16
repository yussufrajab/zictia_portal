import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import {
  listPendingAccounts,
  listAllAccounts,
  getAccountDetail,
  approveAccount,
  getSystemSettings,
  updateSystemSettings,
  getAuditLogs,
  getDashboardMetrics,
  getCustomerDashboard,
  getRevenueTrend,
  getTicketResolutionMetrics,
  getServiceUptimeSummary,
} from "./controller";

const router = Router();

router.get("/accounts/pending", requireAuth, listPendingAccounts);
router.get("/accounts", requireAuth, listAllAccounts);
router.get("/accounts/:id", requireAuth, getAccountDetail);
router.post("/accounts/:id/approve", requireAuth, approveAccount);

router.get("/settings", requireAuth, getSystemSettings);
router.put("/settings", requireAuth, updateSystemSettings);

router.get("/audit-logs", requireAuth, getAuditLogs);
router.get("/dashboard-metrics", requireAuth, getDashboardMetrics);
router.get("/dashboard", requireAuth, getCustomerDashboard);
router.get("/analytics/revenue-trend", requireAuth, getRevenueTrend);
router.get("/analytics/ticket-resolution", requireAuth, getTicketResolutionMetrics);
router.get("/analytics/service-uptime", requireAuth, getServiceUptimeSummary);

export default router;
