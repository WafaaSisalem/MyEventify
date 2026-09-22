/// <reference types="node" />
process.env.DATABASE_URL =
  "postgresql://eventify:eventify@localhost:5432/eventify_test";

process.env.JWT_ACCESS_SECRET = "test-access-secret";

process.env.WEB_ORIGIN = "http://localhost:5175";

process.env.REDIS_URL = "redis://localhost:6379";

process.env.ETHEREAL_USER = "test@example.com";

process.env.ETHEREAL_PASS = "test-password";