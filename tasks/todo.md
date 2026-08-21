# Session 3 Homework — Bookings That Survive a Restart

## What's already done (from class today)
- ✅ Prisma 7 setup: `prisma.config.ts`, `prisma/schema.prisma`, `src/infra/db.ts`, `src/config.ts`
- ✅ Schema: User, Event, Booking models with enums, UUIDs, `@@unique([userId, eventId])`
- ✅ Initial migration applied (`20260821044214_init`)
- ✅ Events repository fully on Prisma (all 5 CRUD ops)
- ✅ Events service + controller converted to async/await
- ✅ `@prisma/client` runtime installed

## What's NOT done yet
- ❌ Bookings still use in-memory `Map` (repository, service, controller are all sync)
- ❌ No transactional booking creation (no `$transaction`, no rebooking semantics)
- ❌ No seed script
- ❌ No index analysis
- ❌ Starter files not fetched (`create-booking.skeleton.ts`, `scripts/parallel-bookings.ts`)
- ❌ `domain.ts` still imported by bookings (needs cleanup)
- ❌ Controllers are sync (homework says controllers must not change — but they already need async)

---

## Task 1: Finish the repository swap (Events)
> Events are already on Prisma. Verify completeness.

- [ ] Confirm no in-memory stores remain anywhere (`grep` for `new Map`)
- [ ] Verify `listEvents` pagination/filtering/sorting works against DB
- [ ] Clean up: remove `domain.ts` import from events files (already done)
- [ ] Test fresh-clone flow: `docker compose up -d` → `npx prisma migrate dev` → `npm run dev`

## Task 2: Transactional bookings
> Replace in-memory bookings with Prisma + `$transaction` with Serializable isolation.

### 2a. Bookings repository → Prisma
- [ ] Rewrite `bookings.repository.ts` with Prisma ops: `findById`, `findByUserAndEvent`, `countConfirmedByEvent`, `create`, `update`
- [ ] Remove in-memory `Map` and `domain.ts` import

### 2b. Transactional `createBooking` in service
- [ ] Write `createBooking` using `prisma.$transaction` with `isolationLevel: Serializable`
- [ ] Inside the transaction, use `tx` (never `prisma`) for all reads/writes
- [ ] Capacity check: `tx.booking.count({ where: { eventId, status: 'CONFIRMED' } })`
- [ ] Rebooking logic — lookup existing with `tx.booking.findUnique({ where: { userId_eventId: { userId, eventId } } })`:
  - No row → `tx.booking.create` with `CONFIRMED`
  - `CANCELLED` → flip back to `CONFIRMED` via `tx.booking.update`
  - `CONFIRMED` → let unique constraint fire, catch `P2002` → throw `HttpError(409)`
  - `WAITLISTED` → throw `HttpError(409)` (already waitlisted, promotion is Session 5)
- [ ] Catch Prisma error `P2002` outside the transaction → `HttpError(409, "Duplicate booking")`

### 2c. Remaining bookings service + controller → async
- [ ] `getBooking` → async, `await` repo call
- [ ] `deleteBooking` → async, use `prisma.booking.update` to set `status: CANCELLED`
- [ ] Make all 3 controller handlers async + add `await`
- [ ] Verify controllers don't contain business logic (only call service + set status)

### 2d. Fetch starter files & test concurrency
- [ ] Get `scripts/parallel-bookings.ts` and `scripts/fixtures/parallel-users.json` (from instructor or write manually)
- [ ] Fill in `parallel-users.json` with real user/event IDs from seed
- [ ] Run `node scripts/parallel-bookings.ts` → expect exactly 5× `201`, 15× `409`
- [ ] Verify in psql: `SELECT status, COUNT(*) FROM "Booking" WHERE "eventId" = '...' GROUP BY status`

## Task 3: Seed script
- [ ] Create `prisma/seed.ts` using Prisma `upsert` for idempotency
- [ ] Seed data:
  - 3+ users (1 ORGANIZER, 1 ADMIN, 1+ ATTENDEE)
  - 20 additional ATTENDEE users (for the parallel-bookings test)
  - 5 events (one with `capacity: 5` for the concurrency test)
  - A few sample bookings
- [ ] Register seed in `prisma.config.ts`: `seed: 'node prisma/seed.ts'`
- [ ] Verify idempotent: `npx prisma db seed` runs twice without errors

## Task 4: Prove an index
- [ ] Enable Prisma query logging: `new PrismaClient({ adapter, log: ['query'] })`
- [ ] Identify the "bookings by user" query and run `EXPLAIN ANALYZE` in psql (BEFORE index)
- [ ] Add index to schema: `@@index([userId])` on Booking (or whichever column helps)
- [ ] Run new migration, re-run `EXPLAIN ANALYZE` (AFTER index)
- [ ] Write 2 sentences of my own interpretation in the PR description
- [ ] Remove `log: ['query']` after analysis

---

## Final checks
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] No `new Map` or `domain.ts` imports remain in events/bookings code
- [ ] Fresh-clone test passes
- [ ] PR description includes: how-to-run, before/after EXPLAIN plans, exit-ticket answer