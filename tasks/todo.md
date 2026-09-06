# Session 5 Homework

## Background Job — Waitlist Promotion

- [x] Verify full events create WAITLISTED bookings
- [x] Create the waitlist promotion queue
- [x] Enqueue a promotion job after a confirmed booking is cancelled
- [x] Add the waitlist promotion worker
- [x] Re-check capacity and promote the oldest waitlisted booking in a transaction
- [x] Enqueue a confirmation email after promotion
- [x] Verify retry/idempotency safety
- [x] Test the full waitlist promotion flow

## Cache Metrics

- [x] Add cache hit/miss counters
- [x] Log hits, misses, and hit ratio
- [x] Verify metrics logging

## Redis Rate Limiting

- [x] Limit login requests per IP (already done partially, will verify strictness)
- [x] Limit booking creation per authenticated user
- [x] Test the rate limit threshold and window recovery

## Deploy Prep

- [ ] Create and provision Render, Neon, and Upstash
- [ ] Save connection strings securely