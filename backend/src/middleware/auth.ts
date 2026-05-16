import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../utils/db";
import { redis } from "../utils/redis";
import { error } from "../utils/response";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    accountId: string;
    role: string;
    email: string;
    iat: number;
    exp: number;
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json(error("UNAUTHORIZED", "Missing or invalid authorization header"));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const isDenied = await redis.get(`denylist:token:${token}`);
    if (isDenied) {
      res.status(401).json(error("UNAUTHORIZED", "Token has been revoked"));
      return;
    }

    const decoded = jwt.verify(token, config.jwt.publicKey, {
      algorithms: [config.jwt.algorithm],
    }) as AuthRequest["user"];

    if (!decoded) {
      res.status(401).json(error("UNAUTHORIZED", "Invalid token"));
      return;
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json(error("UNAUTHORIZED", "Invalid or expired token"));
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json(error("UNAUTHORIZED", "Authentication required"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json(error("FORBIDDEN", "You do not have permission to perform this action"));
      return;
    }

    next();
  };
}

export function requireStaff(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.role?.startsWith("STAFF_") && req.user?.role !== "ADMIN") {
    res.status(403).json(error("FORBIDDEN", "Staff access required"));
    return;
  }
  next();
}
