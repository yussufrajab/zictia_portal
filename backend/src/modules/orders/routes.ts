import { Router } from "express";
import { requireAuth, requireStaff } from "../../middleware/auth";
import {
  createOrder,
  listMyOrders,
  getOrderDetail,
  cancelOrder,
  listAllOrders,
  approveOrder,
  rejectOrder,
} from "./controller";

const router = Router();

// Customer routes
router.get("/my", requireAuth, listMyOrders);
router.post("/", requireAuth, createOrder);
router.get("/:id", requireAuth, getOrderDetail);
router.post("/:id/cancel", requireAuth, cancelOrder);

// Admin routes
router.get("/admin/all", requireAuth, requireStaff, listAllOrders);
router.post("/admin/:id/approve", requireAuth, requireStaff, approveOrder);
router.post("/admin/:id/reject", requireAuth, requireStaff, rejectOrder);

export default router;
