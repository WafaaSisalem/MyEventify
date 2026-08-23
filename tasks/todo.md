# Session 3 Homework — Bookings That Survive a Restart


## Task 1: Finish the repository swap (Events)
> Events are already on Prisma. Verify completeness.

- [x] Confirm no in-memory stores remain anywhere (`grep` for `new Map`)
- [x] Verify `listEvents` pagination/filtering/sorting works against DB
- [x] Clean up: remove `domain.ts` import from events files (already done)
- [x] Test fresh-clone flow: `docker compose up -d` → `npx prisma migrate dev` → `npm run dev`

## Task 2: Transactional bookings
> Replace in-memory bookings with Prisma + `$transaction` with Serializable isolation.

### 2a. Bookings repository → Prisma
- [x] Rewrite `bookings.repository.ts` with Prisma ops: `findById`, `findByUserAndEvent`, `countConfirmedByEvent`, `create`, `update`
- [x] Remove in-memory `Map` and `domain.ts` import

### 2b. Transactional `createBooking` in service
- [x] Write `createBooking` using `prisma.$transaction` with `isolationLevel: Serializable`
- [x] Inside the transaction, use `tx` (never `prisma`) for all reads/writes
- [x] Capacity check: `tx.booking.count({ where: { eventId, status: 'CONFIRMED' } })`
- [x] Rebooking logic — lookup existing with `tx.booking.findUnique({ where: { userId_eventId: { userId, eventId } } })`:
  - No row → `tx.booking.create` with `CONFIRMED`
  - `CANCELLED` → flip back to `CONFIRMED` via `tx.booking.update`
  - `CONFIRMED` → let unique constraint fire, catch `P2002` → throw `HttpError(409)`
  - `WAITLISTED` → throw `HttpError(409)` (already waitlisted, promotion is Session 5)
- [x] Catch Prisma error `P2002` outside the transaction → `HttpError(409, "Duplicate booking")`

### 2c. Remaining bookings service + controller → async
- [x] `getBooking` → async, `await` repo call
- [x] `deleteBooking` → async, use `prisma.booking.update` to set `status: CANCELLED`
- [x] Make all 3 controller handlers async + add `await`
- [x] Verify controllers don't contain business logic (only call service + set status)

### 2d. Fetch starter files & test concurrency
- [x] Get `scripts/parallel-bookings.ts` and `scripts/fixtures/parallel-users.json` (from instructor or write manually)
- [x] Fill in `parallel-users.json` with real user/event IDs from seed
- [x] Run `node scripts/parallel-bookings.ts` → expect exactly 5× `201`, 15× `409`
- [x] Verify in psql: `SELECT status, COUNT(*) FROM "Booking" WHERE "eventId" = '...' GROUP BY status`

## Task 3: Seed script
- [x] Create `prisma/seed.ts` using Prisma `upsert` for idempotency
- [x] Seed data:
  - 3+ users (1 ORGANIZER, 1 ADMIN, 1+ ATTENDEE)
  - 20 additional ATTENDEE users (for the parallel-bookings test)
  - 5 events (one with `capacity: 5` for the concurrency test)
  - A few sample bookings
- [x] Register seed in `prisma.config.ts`: `seed: 'node prisma/seed.ts'`
- [x] Verify idempotent: `npx prisma db seed` runs twice without errors

## Task 4: Prove an index
- [x] Enable Prisma query logging: `new PrismaClient({ adapter, log: ['query'] })`
- [x] Identify the "bookings by user" query and run `EXPLAIN ANALYZE` in psql (BEFORE index)
- [x] Add index to schema: `@@index([userId])` on Booking (or whichever column helps)
- [x] Run new migration, re-run `EXPLAIN ANALYZE` (AFTER index)
- [x] Write 2 sentences of my own interpretation in the PR description
- [x] Remove `log: ['query']` after analysis

---

## Final checks
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] No `new Map` or `domain.ts` imports remain in events/bookings code
- [x] Fresh-clone test passes
- [x] PR description includes: how-to-run, before/after EXPLAIN plans, exit-ticket answer