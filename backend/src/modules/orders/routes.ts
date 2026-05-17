import { Router } from "express";
import multer from "multer";
import { requireAuth, requireStaff } from "../../middleware/auth";
import {
  createOrder,
  listMyOrders,
  getOrderDetail,
  cancelOrder,
  listAllOrders,
  approveOrder,
  rejectOrder,
  uploadQuote,
  approveQuote,
  uploadContract,
  scheduleInstallation,
  passTechnicalReview,
  getTechReviewStatus,
  getMaintenanceBanner,
} from "./controller";

const router = Router();
const upload = multer({ dest: "uploads/" });

// Public
router.get("/maintenance-banner", getMaintenanceBanner);

// Customer routes
router.get("/my", requireAuth, listMyOrders);
router.post("/", requireAuth, createOrder);
router.get("/:id", requireAuth, getOrderDetail);
router.post("/:id/cancel", requireAuth, cancelOrder);
router.post("/:id/approve-quote", requireAuth, approveQuote);

// Admin routes
router.get("/admin/all", requireAuth, requireStaff, listAllOrders);
router.post("/admin/:id/approve", requireAuth, requireStaff, approveOrder);
router.post("/admin/:id/reject", requireAuth, requireStaff, rejectOrder);
router.post("/admin/:id/quote", requireAuth, requireStaff, upload.single("file"), uploadQuote);
router.post("/admin/:id/contract", requireAuth, requireStaff, upload.single("file"), uploadContract);
router.post("/admin/:id/schedule", requireAuth, requireStaff, scheduleInstallation);
router.post("/admin/:id/tech-review", requireAuth, requireStaff, passTechnicalReview);
router.get("/admin/:id/tech-review", requireAuth, requireStaff, getTechReviewStatus);

export default router;
