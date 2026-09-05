import { redis } from "./redis.ts";

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);

      if (!cached) {
        return null;
      }

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
