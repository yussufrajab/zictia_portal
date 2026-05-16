import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import {
  createTicket,
  listMyTickets,
  getTicket,
  addComment,
  closeTicket,
  escalateTicket,
  listAllTickets,
  assignTicket,
  addInternalNote,
  resolveTicket,
  submitCsat,
} from "./controller";

const router = Router();

// Customer routes
router.post("/", requireAuth, createTicket);
router.get("/my", requireAuth, listMyTickets);
router.get("/my/:id", requireAuth, getTicket);
router.post("/my/:id/comments", requireAuth, addComment);
router.post("/my/:id/close", requireAuth, closeTicket);
router.post("/my/:id/escalate", requireAuth, escalateTicket);
router.post("/my/:id/csat", requireAuth, submitCsat);

// Admin / staff routes
router.get("/admin/all", requireAuth, listAllTickets);
router.post("/admin/:id/assign", requireAuth, assignTicket);
router.post("/admin/:id/internal-note", requireAuth, addInternalNote);
router.post("/admin/:id/resolve", requireAuth, resolveTicket);

export default router;
