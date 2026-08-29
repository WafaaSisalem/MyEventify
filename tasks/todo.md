# Session 4 Homework — Authentication & Security

> Some of the tasks below were already implemented while studying Session 4 and
> applying the lecture slides. These are marked as done. The remaining items are
> what I still need to implement for the official homework submission.

---

## Task 1: Protect Every Endpoint

### Route policy verification
- [x] `POST /v1/auth/signup`, `/login`, `/refresh` — public
- [x] `GET /v1/events`, `GET /v1/events/:id` — public
- [x] `POST /v1/events` — `requireAuth` + `requireRole('ORGANIZER','ADMIN')`
- [x] `PATCH /v1/events/:id` — `requireAuth` + `requireRole('ORGANIZER','ADMIN')`
- [x] `DELETE /v1/events/:id` — `requireAuth` + `requireRole('ORGANIZER','ADMIN')`
- [x] `POST /v1/bookings` — `requireAuth`
- [x] `DELETE /v1/bookings/:id` — `requireAuth`
- [x] `GET /v1/bookings/:id` — `requireAuth`
- [x] `GET /health` — public

### Bug fixes (required for protection to actually work)
- [x] **Fix `events.service.ts`**: `createEvent` hardcodes `organizerId: "temp-organizer-id"` — must accept `organizerId` as a parameter from the controller
- [x] **Fix `events.controller.ts`**: `createEventHandler` must pass `req.user!.sub` as `organizerId`
- [x] **Fix `bookings.controller.ts`**: `createBookingHandler` uses `req.headers["x-user-id"]` — must use `req.user!.sub` instead; remove the `"temp-user-id"` fallback

### Tests
- [x] Unauthenticated `POST /v1/events` → 401
- [x] ATTENDEE `POST /v1/events` → 403
- [x] ORGANIZER `POST /v1/events` → 201 (or 400 with missing fields)
- [x] Unauthenticated `POST /v1/bookings` → 401
- [x] `GET /v1/events` without token → 200 (public)

---

## Task 2: Ownership / BOLA

### Event ownership
- [x] `updateEvent` and `deleteEvent` in `events.service.ts` must accept `userId` and `userRole`
- [x] If `userRole !== 'ADMIN'`, check `event.organizerId === userId`; otherwise throw `ForbiddenError`
- [x] `updateEventHandler` and `deleteEventHandler` in `events.controller.ts` must pass `req.user!.sub` and `req.user!.role`

### Booking ownership
- [x] `deleteBooking` in `bookings.service.ts` must accept `userId`
- [x] Check `booking.userId === userId`; otherwise throw `ForbiddenError`
- [x] `deleteBookingHandler` in `bookings.controller.ts` must pass `req.user!.sub`

### Seed
- [x] Add a second ORGANIZER to `prisma/seed.ts` (e.g. `org2@example.com`)
- [x] Assign at least one event to the second organizer

### Tests
- [x] Organizer A cannot `PATCH` Organizer B's event → 403
- [x] Organizer A cannot `DELETE` Organizer B's event → 403
- [x] ADMIN can `PATCH`/`DELETE` any event → 200/204
- [x] User A cannot `DELETE` User B's booking → 403

---

## Task 3: Refresh-Token Rotation (Rework to Match Starter)

### Stretch Goals
- [x] Implement token family revocation (revoke all tokens if an old one is replayed).

### Schema change
- [x] Replace current `RefreshToken` model in `schema.prisma` with the starter spec:
  - Add `id String @id @default(uuid(7)) @db.Uuid`
  - Change `tokenHash` from `@id` to `@unique`
  - Add `revokedAt DateTime?`
  - Add `replacedById String? @unique @db.Uuid` with self-relation (`RotationChain`)
  - Add `@@index([userId])`
  - Remove `onDelete: Cascade` on user FK (use Prisma default `RESTRICT`)
- [x] Run `npx prisma migrate dev --name rework-refresh-token`
- [x] Compare generated SQL against `starters/prisma/migration.sql`

### Repository (`auth.repository.ts`)
- [x] `storeRefreshToken` must return the created row (including `id`) for `replacedById` linkage
- [x] Replace `deleteRefreshToken` with `revokeRefreshToken(tokenHash, replacedById)` that updates `revokedAt = now()` and sets `replacedById`
- [x] `findRefreshToken` must return `revokedAt` so the service can detect reuse

### Service (`auth.service.ts`)
- [x] **`login`**: Issues access + refresh token pair (implemented during slides)
- [x] **`refresh`**: Rewrite rotation using an **atomic Prisma `$transaction`**:
  1. Hash incoming token using the existing `sha256` helper — do not duplicate hashing logic
  2. Look up the row by hash
  3. If not found → 401
  4. If `revokedAt` is set → 401 (reuse/theft signal)
  5. If `expiresAt < now` → 401
  6. **Inside a single `$transaction`:**
     - Insert replacement row R2
     - Update R1: set `revokedAt = now()`, `replacedById = R2.id`
  7. Sign new access token, return `{ accessToken, refreshToken: R2 raw }`
- [x] Reuse the existing `sha256` helper from `auth.utils.ts` for all token hashing

### Cookie handling
- [x] `httpOnly: true`, `secure: true`, `sameSite: 'strict'`, `path: '/v1/auth/refresh'`
- [x] Raw refresh token never in JSON response body

### Tests
- [x] `POST /v1/auth/refresh` with valid cookie → 200 + new cookie
- [x] Replay old rotated cookie → 401
- [x] Missing cookie → 401
- [x] Random/fake cookie → 401
- [x] DB contains only SHA-256 hashes, never raw tokens

---

## Task 4: AI-Assisted Security Audit

- [x] Run audit prompt against key endpoints:
  > "Audit this endpoint against the OWASP API Security Top 10. For each finding: severity, line, fix."
- [x] Include the exact prompt in PR description
- [x] Triage ≥ 3 findings as: **fixed** / **false-positive** / **accepted-risk** with one-line justification

---

## Global / Config

- [x] HS256 pinning on sign AND verify
- [x] Zod-parse JWT payloads, never type-cast
- [x] Response DTOs use explicit allowlists — `password` never returned
- [x] Login failure uses one generic message
- [x] Add `WEB_ORIGIN: z.string().min(1)` to `envSchema` in `config.ts`
- [x] Add `WEB_ORIGIN=http://localhost:5175` to `.env.example`
- [x] Add `WEB_ORIGIN=http://localhost:5175` to `.env`

---

## Final Checks

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] All curl/test transcripts saved for PR
- [x] PR description includes: audit prompt, ≥ 3 triaged findings, why `GET /v1/events` is public