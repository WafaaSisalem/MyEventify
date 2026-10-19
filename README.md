# Eventify

[![CI](https://github.com/WafaaSisalem/MyEventify/actions/workflows/ci.yml/badge.svg)](https://github.com/WafaaSisalem/MyEventify/actions/workflows/ci.yml)

Eventify is a RESTful event-booking API built with Node.js, Express, TypeScript, PostgreSQL, Prisma, Redis, and BullMQ. It provides secure authentication, role-based event management, concurrency-safe booking, automatic waitlisting, caching, rate limiting, and background job processing.

**API base URL:** `https://myeventify.onrender.com`

**Health check:** [https://myeventify.onrender.com/health](https://myeventify.onrender.com/health)

**Interactive API documentation:** [https://myeventify.onrender.com/docs](https://myeventify.onrender.com/docs)

## Features

- JWT authentication with short-lived access tokens and refresh-token rotation.
- Argon2id password hashing and hashed refresh-token storage.
- Attendee, organizer, and administrator roles with ownership checks.
- Event filtering, sorting, and pagination.
- Serializable booking transactions with duplicate and race-condition protection.
- Automatic waitlisting and background promotion jobs.
- Redis caching, cache invalidation, and rate limiting.
- Structured logging, health checks, and graceful shutdown.
- Integration tests, Docker Compose, and GitHub Actions CI.

## Architecture

```mermaid
flowchart LR
    Client --> API[Express API]
    API -->|Prisma Client| DB[(PostgreSQL)]
    API --> Redis[Redis: cache, rate limits, and BullMQ queues]
    Redis --> Worker[BullMQ Worker]
    Worker -->|Prisma Client| DB
    Worker --> Email[Email Delivery]
```

PostgreSQL is the source of truth. Redis stores cached responses, rate-limit counters, and BullMQ queues. The API handles HTTP requests and enqueues background work, while the worker processes confirmation emails and waitlist promotions.

## Tech Stack

| Area | Technology |
|---|---|
| API | Node.js 24, TypeScript, Express |
| Database | PostgreSQL, Prisma |
| Cache and queues | Redis, BullMQ |
| Authentication | JWT, Argon2id |
| Validation | Zod |
| Email | Nodemailer, Ethereal |
| Logging | Pino |
| Testing | Vitest, Supertest |
| Infrastructure | Docker, Docker Compose, GitHub Actions |
| Deployment | Render, Neon, Upstash |

## API Endpoints

All versioned endpoints use the `/v1` prefix.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/v1/auth/signup` | Public | Create an account |
| `POST` | `/v1/auth/login` | Public | Sign in and receive an access token and refresh cookie |
| `POST` | `/v1/auth/refresh` | Refresh cookie | Rotate the refresh token |
| `GET` | `/v1/events` | Public | List and filter events |
| `GET` | `/v1/events/:id` | Public | Retrieve an event |
| `POST` | `/v1/events` | Organizer or admin | Create an event |
| `PATCH` | `/v1/events/:id` | Event owner or admin | Update an event |
| `DELETE` | `/v1/events/:id` | Event owner or admin | Delete an event |
| `POST` | `/v1/bookings` | Authenticated | Book a seat or join the waitlist |
| `GET` | `/v1/bookings/:id` | Booking owner or admin | Retrieve a booking |
| `DELETE` | `/v1/bookings/:id` | Booking owner or admin | Cancel a booking |
| `GET` | `/health` | Public | Check API and database health |
| `GET` | `/docs` | Public | Open the interactive Swagger UI |
| `GET` | `/openapi.json` | Public | Retrieve the machine-readable OpenAPI contract |

Authenticated requests use:

```http
Authorization: Bearer <access-token>
```

`GET /v1/events` supports `page`, `limit`, `venue`, `from`, `to`, and `sort`. Sorting accepts `startsAt:asc` or `startsAt:desc`.

## API Documentation

With the API running locally, open [http://localhost:3000/docs](http://localhost:3000/docs) to explore the endpoints and try requests through Swagger UI. The underlying OpenAPI 3.1 contract is available at [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json) for frontend tooling and client generation.

After logging in, copy the returned `accessToken`, select **Authorize** in Swagger UI, and paste the token without adding the `Bearer` prefix. Swagger UI adds that prefix to protected requests automatically. The refresh endpoint uses the HttpOnly `refresh_token` cookie set by the login response.

## Local Setup

### Prerequisites

- Node.js 24 or later
- npm
- Docker with Docker Compose

### Installation

```bash
git clone https://github.com/WafaaSisalem/MyEventify.git
cd MyEventify
npm ci
cp .env.example .env
```

Start PostgreSQL and Redis:

```bash
docker compose up -d --wait db redis
```

Generate Prisma Client and apply the migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

The migration command runs from the host and reads the `localhost:5432` database URL from `.env`.

Seed data is optional. Skip this step for an empty database, or run it to add demo users and events:

```bash
npx prisma db seed
```

Start the API and worker:

```bash
docker compose up -d --build api worker
```

Inside Docker, the API and worker connect to PostgreSQL through `db:5432`. The API is available at `http://localhost:3000`.

To follow the API and worker logs:

```bash
docker compose logs -f api worker
```

For API development outside Docker, keep PostgreSQL and Redis running and use:

```bash
npm run dev
```

Do not run the Docker API and `npm run dev` simultaneously because both use port `3000`.

### Verify the setup

```bash
curl http://localhost:3000/health
curl "http://localhost:3000/v1/events?page=1&limit=5"
```

Stop the containers without deleting PostgreSQL data:

```bash
docker compose down
```

## Environment Variables

| Variable | Required | Description |
|---|---:|---|
| `PORT` | No | HTTP port; defaults to `3000` |
| `DATABASE_URL` | Yes | PostgreSQL connection URL |
| `JWT_ACCESS_SECRET` | Yes | Access-token signing secret |
| `WEB_ORIGIN` | Yes | Validated configuration reserved for a future frontend and CORS policy |
| `REDIS_URL` | Yes | Redis connection URL |
| `ETHEREAL_USER` | Yes | Ethereal email username |
| `ETHEREAL_PASS` | Yes | Ethereal email password |
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, or `error`; defaults to `info` |

The values in `.env.example` are for local development. Never commit `.env` files or production credentials. If the example Ethereal credentials are unchanged, the worker falls back to generating the email through a console transport.

## Testing

Integration tests use the isolated PostgreSQL database `eventify_test` and Redis logical database `1`. Create and migrate the test database once:

```bash
docker compose exec db createdb -U eventify eventify_test
DATABASE_URL=postgresql://eventify:eventify@localhost:5432/eventify_test npx prisma migrate deploy
```

Run the checks:

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

The test helpers refuse to reset data unless PostgreSQL uses `eventify_test` and Redis uses logical database `1`. The suite covers authentication and token rotation, role authorization, cache invalidation, booking and waitlist behavior, duplicate prevention, rebooking, and booking ownership.

## Continuous Integration

GitHub Actions runs on pull requests using PostgreSQL 18, Redis 8, and Node.js 24. It installs dependencies, generates Prisma Client, applies migrations, runs ESLint and TypeScript checks, and executes the integration tests. The workflow's `checks` job is required before changes can be merged into `main`.

## Deployment

| Component | Provider | Status |
|---|---|---|
| API | Render | Deployed |
| PostgreSQL | Neon | Deployed |
| Redis | Upstash | Deployed |
| Worker | — | Implemented, not continuously deployed |

Production migrations are applied explicitly using the Neon direct connection:

```bash
DATABASE_URL="<neon-direct-connection-url>" npx prisma migrate deploy
```

Migrations and seed data are not part of the API startup command.

The current deployment is API-only. Jobs can be added to Upstash Redis, but confirmation emails and waitlist promotions require a running worker:

```bash
node dist/worker.js
```

## Engineering Decisions and Trade-offs

- Access tokens expire after 15 minutes; rotating, hashed refresh tokens provide renewable sessions and reuse detection.
- Booking capacity checks run inside serializable PostgreSQL transactions, with retry handling for transaction conflicts.
- A database constraint prevents multiple booking records for the same user and event.
- Redis cache-aside reduces repeated event reads, while versioned keys invalidate event-list caches without scanning Redis.
- BullMQ keeps email and waitlist work outside HTTP requests, at the cost of requiring a separate worker.
- Database migrations remain an explicit deployment step instead of running automatically during API startup.

## Observability and Reliability

- Pino produces structured logs with configurable levels.
- Every request receives an `x-request-id`; logs include method, path, status, and duration.
- The logger is configured to redact common sensitive fields, including request bodies, authorization headers, cookies, passwords, tokens, and secrets.
- `/health` verifies the API process and PostgreSQL connection.
- On shutdown, the API stops its HTTP server and closes its queue, Redis, and Prisma resources.
- The worker stops accepting new BullMQ jobs, waits for active jobs, and then closes its queue, Redis, and Prisma resources.
- Both processes handle `SIGTERM` and `SIGINT` with a 25-second hard deadline.
- Unexpected errors are logged internally while clients receive a generic `500` response.

## Current Limitations

- The production worker is not deployed continuously, so queued background jobs may remain pending.
- The health endpoint checks PostgreSQL but not Redis or worker availability.
- Integration tests focus on critical flows rather than exhaustive coverage of every route.
- Eventify currently provides the backend API only; no frontend application is included.
