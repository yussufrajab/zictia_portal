import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import {
  initiatePayment,
  handleWebhook,
  getPaymentStatus,
  listMyPayments,
  getPaymentMethods,
} from "./controller";

const router = Router();

router.get("/methods", getPaymentMethods);
router.get("/my", requireAuth, listMyPayments);
router.get("/my/:id", requireAuth, getPaymentStatus);
router.post("/zanmalipo/initiate", requireAuth, initiatePayment);
router.post("/zanmalipo/webhook", handleWebhook);

export default router;
