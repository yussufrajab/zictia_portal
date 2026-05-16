import { Router } from "express";
import { requireAuth, requireStaff } from "../../middleware/auth";
import {
  listArticles,
  getArticle,
  listCategories,
  listAllArticlesAdmin,
  createArticle,
  updateArticle,
  deleteArticle,
} from "./controller";

const router = Router();

// Public routes
router.get("/articles", listArticles);
router.get("/articles/:id", getArticle);
router.get("/categories", listCategories);

// Admin routes
router.get("/admin/articles", requireAuth, requireStaff, listAllArticlesAdmin);
router.post("/admin/articles", requireAuth, requireStaff, createArticle);
router.put("/admin/articles/:id", requireAuth, requireStaff, updateArticle);
router.delete("/admin/articles/:id", requireAuth, requireStaff, deleteArticle);

export default router;
