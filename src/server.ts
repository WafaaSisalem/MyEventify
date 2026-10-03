
import { app } from "./app.ts";
import { config } from "./config.ts";
import { logger } from "./infra/logger.ts";

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "server started");
});
