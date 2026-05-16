import { Router } from "express";
import { requireAuth, requireStaff } from "../../middleware/auth";
import {
  listCatalog,
  getServiceDetail,
  compareServices,
  createService,
  updateService,
  publishService,
  deprecateService,
  listAdminServices,
} from "./controller";

const router = Router();

router.get("/", listCatalog);
router.get("/compare", compareServices);
router.get("/:id", getServiceDetail);

router.post("/", requireAuth, requireStaff, createService);
router.get("/admin/list", requireAuth, requireStaff, listAdminServices);
router.put("/:id", requireAuth, requireStaff, updateService);
router.post("/:id/publish", requireAuth, requireStaff, publishService);
router.post("/:id/deprecate", requireAuth, requireStaff, deprecateService);

export default router;
