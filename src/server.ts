
import { app } from "./app.ts";
import { config } from "./config.ts";
import { logger } from "./infra/logger.ts";
import { prisma } from "./infra/db.ts";
import { redis } from "./infra/redis.ts";
import { closeQueueConnection } from "./infra/queue-backend.ts";
import { emailQueue } from "./jobs/email.queue.ts";
import { promotionQueue } from "./jobs/promotion.queue.ts";
import { registerApiShutdown } from "./infra/shutdown.ts";

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "server started");
});

registerApiShutdown(server, [
  { name: "email queue", close: () => emailQueue.close() },
  { name: "promotion queue", close: () => promotionQueue.close() },
  { name: "queue Redis", close: closeQueueConnection },
  { name: "cache Redis", close: () => redis.quit() },
  { name: "Prisma", close: () => prisma.$disconnect() },
]);
