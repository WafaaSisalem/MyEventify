# Eventify v1.0 Capstone Plan

## Tests

- [x] Configure isolated integration tests with `eventify_test`, disabled file parallelism, and real JWTs.
- [x] Add auth and refresh-rotation tests.
- [x] Add role-gated event creation tests.
- [x] Add full-event waitlist and cancel-then-rebook tests.
- [x] Add a cache-invalidation test and isolate Redis state.
- [x] Verify all requests are awaited and tests pass in any order.

## CI

- [x] Configure CI with PostgreSQL, Redis, migrations, lint, typecheck, and tests.
- [x] Verify CI is green with the complete Capstone test suite.
- [x] Capture an intentionally failing CI check, then restore it to green.
- [x] Require the `checks` job on `main`.

## Docker and Runtime

- [x] Add the production multi-stage Dockerfile and `.dockerignore`.
- [x] Add graceful shutdown for the API and worker.
- [x] Complete Compose with `api`, `worker`, `db`, and `redis`.
- [x] Align environment variables across local, tests, CI, Compose, and production.
- [x] Verify the complete Compose stack locally.

## Documentation and Submission

- [x] Rewrite README with the pitch, live URL, architecture, endpoints, setup, env, and trade-offs.
- [x] Document the API-only deployment and worker trade-off.
- [x] Verify README instructions from a fresh-clone perspective.
- [ ] Open one PR titled `capstone: Eventify v1.0` with verification results and the failed-CI screenshot.
- [x] Run final lint, typecheck, tests, build, and Docker/Compose checks.
- [ ] Confirm the final GitHub CI run is green.

## Optional

- [ ] Add a CI coverage threshold.
- [ ] Reduce the Docker image below 300 MB.
