import rateLimit from "express-rate-limit";
import { config } from "../config";
import { error } from "../utils/response";

const isDev = config.env === "development";

export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: (req) => {
    if (isDev) return 10000;
    return req.headers.authorization ? config.rateLimit.authenticated : config.rateLimit.unauthenticated;
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => isDev,
  handler: (_req, res) => {
    res.status(429).json(error("RATE_LIMIT", "Too many requests. Please slow down."));
  },
});
