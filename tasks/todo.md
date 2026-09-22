# Session 6 Homework — Capstone: Eventify v1.0

## Task 1 — Integration Test Coverage

* [ ] Configure Vitest + Supertest for integration tests.
* [ ] Ensure tests use the `eventify_test` database, never the development database.
* [ ] Register `vitest.setup.ts` in Vitest config.
* [ ] Disable file parallelism because tests share one database and reset it between tests.
* [ ] Add/reset test database before each test so tests are order-independent.
* [ ] Add tests for register/login and refresh-token rotation.
* [ ] Add role-gated event creation: ORGANIZER succeeds, ATTENDEE gets 403.
* [ ] Add full-capacity booking test and assert the actual Session 5 behavior (`409` or `WAITLISTED` if waitlist exists).
* [ ] Add cancel-then-rebook test and verify the booking becomes `CONFIRMED` instead of failing with a unique-constraint error.
* [ ] Add one cache-invalidation integration test proving a write is visible on the next read.
* [ ] Use real signed JWTs in auth tests; do not stub authentication middleware.
* [ ] Ensure every async request/assertion is awaited.
* [ ] Run the complete test suite and verify tests pass in any order.

## Task 2 — CI

* [ ] Add/update `.github/workflows/ci.yml`.
* [ ] Run lint, TypeScript typecheck, and tests in CI.
* [ ] Provide PostgreSQL and Redis service containers for CI.
* [ ] Configure all required environment variables for the test environment.
* [ ] Run Prisma generate and database migrations before tests.
* [ ] Verify the CI workflow passes.
* [ ] Configure `main` branch protection to require the `checks` job.
* [ ] Create a deliberately broken commit to verify CI becomes red, then fix/revert it and verify CI is green.
* [ ] Capture evidence/screenshot of the intentionally broken CI check for the final PR.

## Task 3 — Docker + Live Deployment

* [ ] Add/fix the multi-stage `node:24-slim` Dockerfile.
* [ ] Run Prisma generate before TypeScript build.
* [ ] Keep only production dependencies and `dist/` in the runtime image.
* [ ] Run the production container as the non-root `node` user.
* [ ] Start the API with `node dist/server.js`.
* [ ] Add `.dockerignore` and ensure secrets are not copied into the image.
* [ ] Add/update `docker-compose.yml` with API, worker, PostgreSQL, and Redis.
* [ ] Use Compose service names (`db`, `redis`) for internal connections.
* [ ] Add PostgreSQL healthcheck and make API/worker depend on database readiness.
* [ ] Run API and worker from the same image with different commands.
* [ ] Add/verify graceful shutdown for API and worker.
* [ ] Add/verify `/health`.
* [ ] Deploy the API to Render.
* [ ] Use Neon PostgreSQL and Upstash Redis.
* [ ] Configure production environment variables only through Render.
* [ ] Run `npx prisma migrate deploy` during deployment.
* [ ] Seed demo users/events and ensure at least one open event has available seats.
* [ ] Decide between a paid Render worker or API-only deployment and document the trade-off in README.
* [ ] Verify the public `/health` endpoint.
* [ ] Verify registration, login, and booking work on the public deployment.

## Task 4 — README + PR

* [ ] Update README with a one-paragraph Eventify pitch.
* [ ] Add the live deployment URL.
* [ ] Add a simple architecture diagram/sketch.
* [ ] Add an endpoint table.
* [ ] Add a three-command local setup.
* [ ] Document required environment variables.
* [ ] Document important architecture/production decisions and trade-offs.
* [ ] Document AI-assisted development: what AI drafted and how it was reviewed/verified.
* [ ] Ensure a stranger can clone the repository and run it using only the README.
* [ ] Prepare the final PR with title exactly: `capstone: Eventify v1.0`.
* [ ] Include what was built, AI assistance, verification, and test/CI/deployment status in the PR description.

## Final Verification

* [ ] All TODO items are completed and checked.
* [ ] Tests pass locally.
* [ ] Lint passes.
* [ ] Typecheck passes.
* [ ] CI is green.
* [ ] Docker/Compose stack works locally.
* [ ] Public deployment works.
* [ ] README is complete.
* [ ] Final PR is ready.