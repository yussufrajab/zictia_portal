import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { checkSlaBreaches, getSlaMetrics } from "./controller";

const router = Router();

router.get("/breaches/check", requireAuth, checkSlaBreaches);
router.get("/metrics", requireAuth, getSlaMetrics);

export default router;
