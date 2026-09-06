import type { Request, Response, NextFunction } from "express";
import { redis } from "../infra/redis.ts";
export const limiter =
  (max: number, windowSec: number, keyGenerator?: (req: Request) => string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const win = Math.floor(Date.now() / (windowSec * 1000));

    const identifier = keyGenerator ? keyGenerator(req) : req.ip;
    const key = `rl:${identifier}:${req.path}:${win}`;

    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSec);
    }

    if (count > max) {
      return res.status(429).json({
        error: "Too many requests",
      });
    }

    next();
  };
