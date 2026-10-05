import type { Server } from "node:http";
import type { Worker } from "bullmq";
import { logger } from "./logger.ts";

const HARD_SHUTDOWN_DEADLINE_MS = 25_000;

export type ShutdownResource = {
  name: string;
  close: () => Promise<unknown>;
};

async function closeInOrder(
  processName: "api" | "worker",
  resources: ShutdownResource[],
) {
  const errors: unknown[] = [];

  for (const resource of resources) {
    try {
      await resource.close();
      logger.info(
        { process: processName, resource: resource.name },
        "shutdown resource closed",
      );
    } catch (error) {
      errors.push(error);
      logger.error(
        { process: processName, resource: resource.name, error },
        "shutdown resource failed to close",
      );
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, `${processName} shutdown failed`);
  }
}

function registerSignalHandlers(
  processName: "api" | "worker",
  close: () => Promise<void>,
) {
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info({ process: processName, signal }, "graceful shutdown started");

    const deadline = setTimeout(() => {
      logger.error(
        { process: processName, deadlineMs: HARD_SHUTDOWN_DEADLINE_MS },
        "graceful shutdown deadline exceeded",
      );
      process.exit(1);
    }, HARD_SHUTDOWN_DEADLINE_MS);
    deadline.unref();

    try {
      await close();
      clearTimeout(deadline);
      logger.info({ process: processName }, "graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      clearTimeout(deadline);
      logger.error(
        { process: processName, error },
        "graceful shutdown completed with errors",
      );
      process.exit(1);
    }
  };

  process.once("SIGTERM", (signal) => void shutdown(signal));
  process.once("SIGINT", (signal) => void shutdown(signal));
}

function closeHttpServer(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export function registerApiShutdown(
  server: Server,
  resources: ShutdownResource[],
) {
  registerSignalHandlers("api", () =>
    closeInOrder("api", [
      { name: "http server", close: () => closeHttpServer(server) },
      ...resources,
    ]),
  );
}

export function registerWorkerShutdown(
  workers: Worker[],
  resources: ShutdownResource[],
) {
  registerSignalHandlers("worker", () =>
    closeInOrder("worker", [
      {
        name: "workers",
        close: async () => {
          const results = await Promise.allSettled(
            workers.map((worker) => worker.close()),
          );
          const errors = results
            .filter((result) => result.status === "rejected")
            .map((result) => result.reason);

          if (errors.length > 0) {
            throw new AggregateError(errors, "one or more workers failed to close");
          }
        },
      },
      ...resources,
    ]),
  );
}
