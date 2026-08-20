# Session 1: Eventify Foundation

- [x] Task 1: Create domain types in `src/domain.ts` (User, Event, Booking, Roles, Statuses, generic findById)
- [x] Task 2: Implement hardcoded GET `/events`, `/health` route, and 404 fallback on raw node:http server
- [x] Task 3: Load events lazily from `data/events.json` using `node:fs/promises` with try/catch and error wrapping
- [x] Task 4: Complete PR hygiene checklist & verify typechecks run with zero warnings

# Session 2 Homework: Bookings, Pagination & Consistency Pass

## 1. Bookings (In-Memory)
- [ ] Create `src/bookings/bookings.schema.ts` with `CreateBookingSchema` (using `z.strictObject`).
- [ ] Create `src/bookings/bookings.service.ts` with in-memory `Map<string, Booking>`.
- [ ] Implement `createBooking` with duplicate check (409) and capacity check (409).
- [ ] Implement `getBooking` and `cancelBooking` (keeping record, status `CANCELLED`).
- [ ] Create `src/bookings/bookings.controller.ts` with handlers wrapping the service.
- [ ] Create `src/bookings/bookings.routes.ts` defining endpoints and middlewares.
- [ ] Mount `/v1/bookings` in `src/app.ts`.

## 2. Pagination on GET `/v1/events`
- [ ] Update `EventQuerySchema` in `events.schema.ts` with `page` and `limit`.
- [ ] Update `listEvents` service to handle pagination logic (default `page=1`, `limit=20`).
- [ ] Update `listEventsHandler` in controller to parse from `res.locals.query`.

## 3. Filtering on GET `/v1/events`
- [ ] Add `venue` (exact match), `from` and `to` (date ranges on `startsAt`) to `EventQuerySchema`.
- [ ] Apply filtering logic in `listEvents` service *before* pagination.

## 4. Consistency Pass
- [ ] Verify `res.status(500)` does not exist outside the main error middleware.
- [ ] Ensure all 400/404 cases throw `HttpError`.
- [ ] Verify `DELETE` operations use `204` with no body (except booking cancellation which returns 200).
- [ ] Ensure all body inputs pass through `validate` and all query inputs through `validateQuery`.