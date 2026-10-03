import { redis } from "./redis.ts";
import { logger } from "./logger.ts";
import { getContextLogger } from "./logger-context.ts";

const cacheLogger = logger.child({ component: "cache" });

function logRedisFailure(redisCommand: "get" | "set" | "del" | "incr") {
  getContextLogger().warn(
    { component: "cache", redisCommand },
    "Redis operation failed",
  );
}

let hits = 0;
let misses = 0;
let lookupsSinceLastLog = 0;

function logMetrics() {
  const total = hits + misses;
  const ratio = total === 0 ? 0 : hits / total;

  cacheLogger.info(
    {
      hits,
      misses,
      ratio: Number(ratio.toFixed(4)),
    },
    "cache metrics",
  );

  lookupsSinceLastLog = 0;
}

setInterval(() => {
  if (lookupsSinceLastLog > 0) {
    logMetrics();
  }
}, 60000).unref();

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);

      lookupsSinceLastLog++;

      if (!cached) {
        misses++;
        if (lookupsSinceLastLog >= 100) logMetrics();
        return null;
      }

      hits++;
      if (lookupsSinceLastLog >= 100) logMetrics();
      return JSON.parse(cached) as T;
    } catch {
      logRedisFailure("get");
      return null;
    }
  },

  async set(key: string, data: unknown, ttlSeconds: number) {
    try {
      await redis.set(key, JSON.stringify(data), {
        EX: ttlSeconds,
      });
    } catch {
      logRedisFailure("set");
    }
  },

  async del(key: string) {
    try {
      await redis.del(key);
    } catch {
      logRedisFailure("del");
    }
  },

  async incr(key: string) {
    try {
      return await redis.incr(key);
    } catch {
      logRedisFailure("incr");
      return null;
    }
  },
};
