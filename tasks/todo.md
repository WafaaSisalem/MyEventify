# Eventify v1.0 Capstone Plan

## Tests

- [x] Configure isolated integration tests with `eventify_test`, disabled file parallelism, and real JWTs.
- [ ] Add auth and refresh-rotation tests.
- [ ] Add role-gated event creation tests.
- [ ] Add full-event waitlist and cancel-then-rebook tests.
- [ ] Add a cache-invalidation test and isolate Redis state.
- [ ] Verify all requests are awaited and tests pass in any order.

## CI

- [x] Configure CI with PostgreSQL, Redis, migrations, lint, typecheck, and tests.
- [ ] Verify CI is green with the complete Capstone test suite.
- [ ] Capture an intentionally failing CI check, then restore it to green.
- [ ] Require the `checks` job on `main`.

## Docker and Runtime

- [x] Add the production multi-stage Dockerfile and `.dockerignore`.
- [ ] Add graceful shutdown for the API and worker.
- [ ] Complete Compose with `api`, `worker`, `db`, and `redis`.
- [ ] Align environment variables across local, tests, CI, Compose, and production.
- [ ] Verify the complete Compose stack locally.

## Documentation and Submission

- [ ] Rewrite README with the pitch, live URL, architecture, endpoints, setup, env, trade-offs, and AI usage.
- [ ] Document the API-only deployment and worker trade-off.
- [ ] Verify README instructions from a fresh-clone perspective.
- [ ] Open one PR titled `capstone: Eventify v1.0` with verification results and the failed-CI screenshot.
- [ ] Run final lint, typecheck, tests, CI, and Docker/Compose checks.

## Optional

- [ ] Add a CI coverage threshold.
- [ ] Reduce the Docker image below 300 MB.
