import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../utils/db";
import { success, error } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth";
import { logger } from "../../utils/logger";

const articleSchema = z.object({
  titleEn: z.string().min(3).max(200),
  titleSw: z.string().min(3).max(200),
  contentEn: z.string().min(10).max(20000),
  contentSw: z.string().min(10).max(20000),
  category: z.string().min(1).max(100),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
});

const querySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
});

export async function listArticles(req: Request, res: Response) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid query", parsed.error.flatten()));
    return;
  }

  const { search, category, page, limit } = parsed.data;
  const where: any = { isPublished: true };
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { titleEn: { contains: search, mode: "insensitive" } },
      { titleSw: { contains: search, mode: "insensitive" } },
      { contentEn: { contains: search, mode: "insensitive" } },
      { contentSw: { contains: search, mode: "insensitive" } },
    ];
  }

  const [articles, total] = await Promise.all([
    prisma.knowledgeBaseArticle.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      select: {
        id: true,
        titleEn: true,
        titleSw: true,
        category: true,
        tags: true,
        viewCount: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.knowledgeBaseArticle.count({ where }),
  ]);

  res.json(success(articles, { page: parseInt(page), limit: parseInt(limit), total }));
}

export async function getArticle(req: Request, res: Response) {
  const { id } = req.params;
  const article = await prisma.knowledgeBaseArticle.findUnique({ where: { id } });
  if (!article || !article.isPublished) {
    res.status(404).json(error("NOT_FOUND", "Article not found"));
    return;
  }

  await prisma.knowledgeBaseArticle.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  res.json(success(article));
}

export async function listCategories(_req: Request, res: Response) {
  const categories = await prisma.knowledgeBaseArticle.groupBy({
    by: ["category"],
    where: { isPublished: true },
    _count: { category: true },
  });

  res.json(success(categories.map((c) => ({ name: c.category, count: c._count.category }))));
}

// Admin CRUD
export async function listAllArticlesAdmin(req: AuthRequest, res: Response) {
  const { search, page = "1", limit = "20" } = req.query;
  const where: any = {};
  if (search) {
    where.OR = [
      { titleEn: { contains: search as string, mode: "insensitive" } },
      { titleSw: { contains: search as string, mode: "insensitive" } },
    ];
  }

  const [articles, total] = await Promise.all([
    prisma.knowledgeBaseArticle.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    }),
    prisma.knowledgeBaseArticle.count({ where }),
  ]);

  res.json(success(articles, { page: parseInt(page as string), limit: parseInt(limit as string), total }));
}

export async function createArticle(req: AuthRequest, res: Response) {
  const parsed = articleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid article data", parsed.error.flatten()));
    return;
  }

  const article = await prisma.knowledgeBaseArticle.create({
    data: parsed.data,
  });

  logger.info("KB article created", { articleId: article.id, by: req.user!.userId });
  res.status(201).json(success(article));
}

export async function updateArticle(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const parsed = articleSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid article data", parsed.error.flatten()));
    return;
  }

  const article = await prisma.knowledgeBaseArticle.update({
    where: { id },
    data: { ...parsed.data, updatedAt: new Date() },
  });

  res.json(success(article));
}

export async function deleteArticle(req: AuthRequest, res: Response) {
  const { id } = req.params;
  await prisma.knowledgeBaseArticle.delete({ where: { id } });
  res.json(success({ message: "Article deleted" }));
}
