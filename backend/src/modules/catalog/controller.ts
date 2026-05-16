import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../utils/db";
import { success, error } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth";

const querySchema = z.object({
  category: z.string().optional(),
  customerType: z.enum(["INDIVIDUAL", "SME", "CORPORATE", "GOVERNMENT", "ISP"]).optional(),
  sortBy: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.enum(["price_asc", "price_desc", "sla"]).optional()
  ),
  search: z.string().optional(),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
});

export async function listCatalog(req: Request, res: Response) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid query parameters", parsed.error.flatten()));
    return;
  }

  const { category, customerType, sortBy, search, page, limit } = parsed.data;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where: any = { status: "PUBLISHED" };
  if (category) where.category = category;
  if (customerType) where.customerTypes = { has: customerType };
  if (search) {
    where.OR = [
      { nameEn: { contains: search, mode: "insensitive" } },
      { descriptionEn: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy: any = {};
  if (sortBy === "price_asc") orderBy.pricingMonthly = "asc";
  else if (sortBy === "price_desc") orderBy.pricingMonthly = "desc";
  else if (sortBy === "sla") orderBy.slaTier = "asc";
  else orderBy.sortOrder = "asc";

  const [services, total] = await Promise.all([
    prisma.service.findMany({ where, orderBy, skip, take }),
    prisma.service.count({ where }),
  ]);

  res.json(success(services, { page: parseInt(page), limit: take, total }));
}

export async function getServiceDetail(req: Request, res: Response) {
  const { id } = req.params;
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service || service.status !== "PUBLISHED") {
    res.status(404).json(error("NOT_FOUND", "Service not found"));
    return;
  }
  res.json(success(service));
}

export async function compareServices(req: Request, res: Response) {
  const ids = (req.query.ids as string || "").split(",").filter(Boolean);
  if (ids.length < 2 || ids.length > 4) {
    res.status(400).json(error("VALIDATION_ERROR", "Select 2 to 4 services to compare"));
    return;
  }

  const services = await prisma.service.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
  });

  res.json(success(services));
}

const serviceCreateSchema = z.object({
  serviceType: z.enum(["INTERNET_CAPACITY", "INTERNET_GOVERNMENT", "VIRTUAL_MACHINE", "COLOCATION", "IP_MPLS", "VPN"]),
  nameEn: z.string().min(2).max(200),
  nameSw: z.string().optional(),
  descriptionEn: z.string().min(10).max(5000),
  descriptionSw: z.string().optional(),
  featuresEn: z.array(z.string()).default([]),
  featuresSw: z.array(z.string()).default([]),
  pricingMonthly: z.number().positive(),
  pricingQuarterly: z.number().positive().optional(),
  pricingAnnual: z.number().positive().optional(),
  setupFee: z.number().optional(),
  minimumContractMonths: z.number().int().min(1).optional(),
  slaTier: z.enum(["PLATINUM", "GOLD", "SILVER", "STANDARD"]).default("STANDARD"),
  category: z.string().min(1),
  customerTypes: z.array(z.enum(["INDIVIDUAL", "SME", "CORPORATE", "GOVERNMENT", "ISP"])).default([]),
  sortOrder: z.number().int().optional(),
});

export async function createService(req: AuthRequest, res: Response) {
  const parsed = serviceCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid data", parsed.error.flatten()));
    return;
  }

  const service = await prisma.service.create({ data: { ...parsed.data, status: "DRAFT" } });
  res.status(201).json(success(service));
}

export async function updateService(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const parsed = serviceCreateSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(error("VALIDATION_ERROR", "Invalid data", parsed.error.flatten()));
    return;
  }

  const service = await prisma.service.update({ where: { id }, data: parsed.data });
  res.json(success(service));
}

export async function publishService(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const service = await prisma.service.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  res.json(success(service));
}

export async function deprecateService(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const service = await prisma.service.update({ where: { id }, data: { status: "DEPRECATED" } });
  res.json(success(service));
}

export async function listAdminServices(req: AuthRequest, res: Response) {
  const { status, page = "1", limit = "20" } = req.query;
  const where: any = {};
  if (status) where.status = status;

  const services = await prisma.service.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    skip: (parseInt(page as string) - 1) * parseInt(limit as string),
    take: parseInt(limit as string),
  });

  const total = await prisma.service.count({ where });
  res.json(success(services, { page: parseInt(page as string), limit: parseInt(limit as string), total }));
}
