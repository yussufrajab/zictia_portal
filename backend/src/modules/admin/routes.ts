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
  getCustomerSegments,
  getCsatTrends,
  getSlaCompliance,
  getTopCustomers,
  getArAgeing,
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
router.get("/analytics/customer-segments", requireAuth, getCustomerSegments);
router.get("/analytics/csat-trends", requireAuth, getCsatTrends);
router.get("/analytics/sla-compliance", requireAuth, getSlaCompliance);
router.get("/analytics/top-customers", requireAuth, getTopCustomers);
router.get("/analytics/ar-ageing", requireAuth, getArAgeing);

export default router;
