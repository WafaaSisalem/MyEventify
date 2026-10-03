import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { Logger } from "pino";
import { logger } from "../infra/logger.ts";
import { runWithLogger } from "../infra/logger-context.ts";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
      log: Logger;
    }
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const suppliedRequestId = req.get("x-request-id")?.trim();
  const requestId =
    suppliedRequestId && uuidPattern.test(suppliedRequestId)
      ? suppliedRequestId
      : randomUUID();

  req.requestId = requestId;
  req.log = logger.child({ requestId });
  res.setHeader("x-request-id", requestId);

  const startedAt = process.hrtime.bigint();
  const method = req.method;
  const path = req.path;

  res.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    req.log.info(
      {
        method,
        path,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      },
      "request completed",
    );
  });

  runWithLogger(req.log, () => {
    next();
  });
}
