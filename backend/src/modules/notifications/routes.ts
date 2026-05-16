import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import {
  listMyNotifications,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
  getUnreadCount,
} from "./controller";

const router = Router();

router.get("/", requireAuth, listMyNotifications);
router.get("/unread-count", requireAuth, getUnreadCount);
router.put("/mark-all-read", requireAuth, markAllAsRead);
router.put("/:id/read", requireAuth, markAsRead);

router.get("/preferences", requireAuth, getPreferences);
router.put("/preferences", requireAuth, updatePreferences);

export default router;
