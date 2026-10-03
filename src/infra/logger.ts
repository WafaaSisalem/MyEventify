import pino from "pino";
import { config } from "../config.ts";

export const logger = pino({
  level: config.LOG_LEVEL,
  base: {
    service: "eventify",
  },
  redact: {
    paths: [
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "secret",
      "cookie",
      "authorization",
      "headers.authorization",
      "headers.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body",
      "request.headers.authorization",
      "request.headers.cookie",
      "request.body",
    ],
    censor: "[REDACTED]",
  },
});
