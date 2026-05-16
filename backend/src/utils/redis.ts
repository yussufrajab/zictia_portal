import Redis from "ioredis";
import { config } from "../config";
import { logger } from "./logger";

export const redis = new Redis(config.redisUrl, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  reconnectOnError: (err) => {
    logger.warn("Redis reconnect", { message: err.message });
    return true;
  },
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error("Redis error", err));

export async function disconnectRedis() {
  await redis.quit();
}
