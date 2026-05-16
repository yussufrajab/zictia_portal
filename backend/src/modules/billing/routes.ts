import { Router } from "express";
import { requireAuth, requireStaff } from "../../middleware/auth";
import {
  listMyInvoices,
  getInvoiceDetail,
  listAllInvoices,
  generateInvoice,
  getInvoiceStats,
} from "./controller";

const router = Router();

// Customer routes
router.get("/invoices", requireAuth, listMyInvoices);
router.get("/invoices/:id", requireAuth, getInvoiceDetail);
router.get("/stats", requireAuth, getInvoiceStats);

// Admin routes
router.get("/admin/invoices", requireAuth, requireStaff, listAllInvoices);
router.post("/admin/invoices/generate", requireAuth, requireStaff, generateInvoice);

export default router;
