import { AsyncLocalStorage } from "node:async_hooks";
import type { Logger } from "pino";
import { logger } from "./logger.ts";

const loggerStorage = new AsyncLocalStorage<Logger>();

export function runWithLogger<T>(requestLogger: Logger, callback: () => T): T {
  return loggerStorage.run(requestLogger, callback);
}

export function getContextLogger(): Logger {
  return loggerStorage.getStore() ?? logger;
}
