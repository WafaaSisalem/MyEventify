import { createClient } from "redis";
import { createNodeRedisClient } from "bullmq";
import { config } from "../config.ts";

const raw = createClient({
  url: config.REDIS_URL,
});

await raw.connect();

export const connection = createNodeRedisClient(raw);
