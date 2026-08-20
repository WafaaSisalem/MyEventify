# Session 1: Eventify Foundation

- [x] Task 1: Create domain types in `src/domain.ts` (User, Event, Booking, Roles, Statuses, generic findById)
- [x] Task 2: Implement hardcoded GET `/events`, `/health` route, and 404 fallback on raw node:http server
- [x] Task 3: Load events lazily from `data/events.json` using `node:fs/promises` with try/catch and error wrapping
- [x] Task 4: Complete PR hygiene checklist & verify typechecks run with zero warnings

# Session 2 Homework: Bookings, Pagination & Consistency Pass

## 1. Bookings (In-Memory)
- [x] Create `src/bookings/bookings.schema.ts` with `CreateBookingSchema` (using `z.strictObject`).
- [x] Create `src/bookings/bookings.service.ts` with in-memory `Map<string, Booking>`.
- [x] Implement `createBooking` with duplicate check (409) and capacity check (409).
- [x] Implement `getBooking` and `cancelBooking` (keeping record, status `CANCELLED`).
- [x] Create `src/bookings/bookings.controller.ts` with handlers wrapping the service.
- [x] Create `src/bookings/bookings.routes.ts` defining endpoints and middlewares.
- [x] Mount `/v1/bookings` in `src/app.ts`.

## 2. Pagination on GET `/v1/events`
- [x] Update `EventQuerySchema` in `events.schema.ts` with `page` and `limit`.
- [x] Update `listEvents` service to handle pagination logic (default `page=1`, `limit=20`).
- [x] Update `listEventsHandler` in controller to parse from `res.locals.query`.

## 3. Filtering on GET `/v1/events`
- [x] Add `venue` (exact match), `from` and `to` (date ranges on `startsAt`) to `EventQuerySchema`.
- [x] Apply filtering logic in `listEvents` service *before* pagination.

## 4. Consistency Pass
- [x] Verify `res.status(500)` does not exist outside the main error middleware.
- [x] Ensure all 400/404 cases throw `HttpError`.
- [x] Verify `DELETE` operations use `204` with no body (except booking cancellation which returns 200).
- [x] Ensure all body inputs pass through `validate` and all query inputs through `validateQuery`.

## 5. Stretch Goals
- [x] At capacity → create the booking as WAITLISTED instead of returning 409.
- [x] Add `?sort=startsAt:asc|desc` to the events list.