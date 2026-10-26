import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { UnrecoverableError } from "bullmq";
import { app } from "../src/app.ts";
import { prisma } from "../src/infra/db.ts";
import { logger } from "../src/infra/logger.ts";
import { emailQueue } from "../src/jobs/email.queue.ts";
import { promotionQueue } from "../src/jobs/promotion.queue.ts";
import { promoteWaitlistedBooking } from "../src/jobs/promotion.processor.ts";
import { enqueueConfirmation } from "../src/jobs/booking.enqueue.ts";
import { authHeader, resetDb, seedUser, seedUserAndEvent } from "./helpers.ts";

describe("waitlist promotion transaction", () => {
  beforeEach(async () => {
    await resetDb();
    vi.spyOn(emailQueue, "add");
    vi.spyOn(promotionQueue, "add");
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([0, 1])("does not promote at/after start by %d ms", async (offset) => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const booking = await prisma.booking.create({ data: { userId: user.id, eventId: event.id, status: "WAITLISTED" } });
    vi.spyOn(Date, "now").mockReturnValue(event.startsAt.getTime() + offset);
    await expect(promoteWaitlistedBooking(event.id, logger)).resolves.toBeNull();
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("WAITLISTED");
  });

  it("promotes the oldest waiting row before start and tolerates email handoff failure", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const other = await seedUser({ role: "ATTENDEE", email: "later-waiting@test.local" });
    const oldest = await prisma.booking.create({
      data: {
        userId: user.id, eventId: event.id,
        status: "WAITLISTED", createdAt: new Date("2029-01-01T00:00:00Z")
      }
    });
    await prisma.booking.create({
      data: {
        userId: other.id, eventId: event.id,
        status: "WAITLISTED", createdAt: new Date("2029-01-02T00:00:00Z")
      }
    });
    vi.spyOn(Date, "now").mockReturnValue(event.startsAt.getTime() - 1);
    const id = await promoteWaitlistedBooking(event.id, logger);
    expect(id).toBe(oldest.id);
    vi.mocked(emailQueue.add).mockRejectedValueOnce(new Error("unavailable"));
    await expect(enqueueConfirmation(id!, event.id, logger)).resolves.toBeUndefined();
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: oldest.id } })).status).toBe("CONFIRMED");
    expect(await prisma.booking.count({ where: { eventId: event.id, status: "CONFIRMED" } })).toBe(1);
  });

  it("does nothing when full or when no one is waiting", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    await expect(promoteWaitlistedBooking(event.id, logger)).resolves.toBeNull();
    await prisma.booking.create({ data: { userId: user.id, eventId: event.id } });
    await expect(promoteWaitlistedBooking(event.id, logger)).resolves.toBeNull();
  });

  it("does not retry a missing event as a recoverable worker failure", async () => {
    await expect(promoteWaitlistedBooking(randomUUID(), logger)).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it("keeps capacity when cancellation, a new booking, and promotion overlap", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const waiting = await seedUser({ role: "ATTENDEE", email: "waiting-race@test.local" });
    const newcomer = await seedUser({ role: "ATTENDEE", email: "new-race@test.local" });
    const original = await prisma.booking.create({ data: { userId: user.id, eventId: event.id } });
    await prisma.booking.create({ data: { userId: waiting.id, eventId: event.id, status: "WAITLISTED" } });
    const [cancel, create] = await Promise.all([
      request(app).delete(`/v1/bookings/${original.id}`).set(authHeader(user)),
      request(app).post("/v1/bookings").set(authHeader(newcomer)).send({ eventId: event.id }),
      promoteWaitlistedBooking(event.id, logger),
    ]);
    expect(cancel.status).toBe(204);
    expect(create.status).toBe(201);
    expect(await prisma.booking.count({ where: { eventId: event.id, status: "CONFIRMED" } })).toBeLessThanOrEqual(1);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: original.id } })).status).toBe("CANCELLED");
    expect(promotionQueue.add).toHaveBeenCalledTimes(1);
  });

  it("two promotion transactions allocate at most the one available seat", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const other = await seedUser({ role: "ATTENDEE", email: "second-promotion@test.local" });
    await prisma.booking.createMany({
      data: [user, other].map((attendee) => ({
        userId: attendee.id, eventId: event.id, status: "WAITLISTED" as const,
      }))
    });
    const ids = await Promise.all([1, 2].map(() => promoteWaitlistedBooking(event.id, logger)));
    expect(ids.filter((id) => id !== null)).toHaveLength(1);
    expect(await prisma.booking.count({ where: { eventId: event.id, status: "CONFIRMED" } })).toBe(1);
  });
});
