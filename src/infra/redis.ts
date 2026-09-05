import { config } from "../config.ts";
import { createClient } from "redis";
const redis = createClient({
    url: config.REDIS_URL,
});
await redis.connect();
export { redis }
