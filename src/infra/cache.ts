import { redis } from "./redis.ts";

let hits = 0;
let misses = 0;
let lookupsSinceLastLog = 0;

function logMetrics() {
  const total = hits + misses;
  const ratio = total === 0 ? 0 : hits / total;
  
  console.log(JSON.stringify({
    hits,
    misses,
    ratio: Number(ratio.toFixed(4)),
  }));
  
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
    } catch (error) {
      console.warn(`Redis GET error for key ${key}:`, error);
      return null;
    }
  },

  async set(key: string, data: unknown, ttlSeconds: number) {
    try {
      await redis.set(key, JSON.stringify(data), {
        EX: ttlSeconds,
      });
    } catch (error) {
      console.warn(`Redis SET error for key ${key}:`, error);
    }
  },

  async del(key: string) {
    try {
      await redis.del(key);
    } catch (error) {
      console.warn(`Redis DEL error for key ${key}:`, error);
    }
  },

  async incr(key: string) {
    try {
      return await redis.incr(key);
    } catch (error) {
      console.warn(`Redis INCR error for key ${key}:`, error);
      return null;
    }
  },
};
