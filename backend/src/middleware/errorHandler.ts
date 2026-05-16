import type { Request, Response, NextFunction } from "express";
import { error } from "../utils/response";
import { logger } from "../utils/logger";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error("Unhandled error", { message: err.message, stack: err.stack });

  if (err instanceof ZodError) {
    res.status(400).json(
      error("VALIDATION_ERROR", "Request validation failed", err.errors)
    );
    return;
  }

  if (err.name === "UnauthorizedError") {
    res.status(401).json(error("UNAUTHORIZED", "Authentication required"));
    return;
  }

  res.status(500).json(
    error("INTERNAL_ERROR", "An unexpected error occurred. Please try again later.")
  );
}
