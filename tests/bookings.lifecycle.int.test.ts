import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../src/app.ts";
import { prisma } from "../src/infra/db.ts";
import { emailQueue } from "../src/jobs/email.queue.ts";
import { promotionQueue } from "../src/jobs/promotion.queue.ts";
import { authHeader, resetDb, seedUser, seedUserAndEvent } from "./helpers.ts";

describe("booking lifecycle", () => {
  beforeEach(async () => {
    await resetDb();
    vi.spyOn(emailQueue, "add");
    vi.spyOn(promotionQueue, "add");
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(["CONFIRMED", "WAITLISTED", "CANCELLED"] as const)(
    "rejects creating/restoring after start with existing %s", async (status) => {
      const { user, event } = await seedUserAndEvent({ capacity: 2 });
      const booking = await prisma.booking.create({ data: { userId: user.id, eventId: event.id, status } });
      vi.spyOn(Date, "now").mockReturnValue(event.startsAt.getTime());
      const response = await request(app).post("/v1/bookings").set(authHeader(user))
        .send({ eventId: event.id }).expect(409);
      expect(response.body.error).toBe("Event has already started");
      expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe(status);
      expect(emailQueue.add).not.toHaveBeenCalled();
    });

  it.each([0, 1])("rejects a new booking at/after start by %d ms", async (offset) => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    vi.spyOn(Date, "now").mockReturnValue(event.startsAt.getTime() + offset);
    const response = await request(app).post("/v1/bookings").set(authHeader(user))
      .send({ eventId: event.id }).expect(409);
    expect(response.body.error).toBe("Event has already started");
    expect(await prisma.booking.count()).toBe(0);
    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it("allows a booking one millisecond before start", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    vi.spyOn(Date, "now").mockReturnValue(event.startsAt.getTime() - 1);
    const response = await request(app).post("/v1/bookings").set(authHeader(user))
      .send({ eventId: event.id }).expect(201);
    expect(response.body.status).toBe("CONFIRMED");
  });

  it.each([
    { status: "CONFIRMED", offset: 0 },
    { status: "CONFIRMED", offset: 1 },
    { status: "WAITLISTED", offset: 0 },
    { status: "WAITLISTED", offset: 1 },
  ] as const)("rejects cancellation of $status at/after start by $offset ms", async ({ status, offset }) => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const booking = await prisma.booking.create({ data: { userId: user.id, eventId: event.id, status } });
    vi.spyOn(Date, "now").mockReturnValue(event.startsAt.getTime() + offset);
    const response = await request(app).delete(`/v1/bookings/${booking.id}`)
      .set(authHeader(user)).expect(409);
    expect(response.body.error).toBe("Event has already started");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe(status);
    expect(promotionQueue.add).not.toHaveBeenCalled();
  });

  it.each(["CONFIRMED", "WAITLISTED"] as const)("cancels %s before start, with only the relevant job", async (status) => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const booking = await prisma.booking.create({ data: { userId: user.id, eventId: event.id, status } });
    vi.spyOn(Date, "now").mockReturnValue(event.startsAt.getTime() - 1);
    const response = await request(app).delete(`/v1/bookings/${booking.id}`)
      .set(authHeader(user)).expect(204);
    expect(response.text).toBe("");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("CANCELLED");
    expect(promotionQueue.add).toHaveBeenCalledTimes(status === "CONFIRMED" ? 1 : 0);
    if (status === "CONFIRMED") expect(promotionQueue.add).toHaveBeenCalledWith("promote", { eventId: event.id });
  });

  it("returns 204 for already cancelled after start without another update or job", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const booking = await prisma.booking.create({ data: { userId: user.id, eventId: event.id, status: "CANCELLED" } });
    vi.spyOn(Date, "now").mockReturnValue(event.startsAt.getTime() + 1);
    await request(app).delete(`/v1/bookings/${booking.id}`).set(authHeader(user)).expect(204);
    expect(promotionQueue.add).not.toHaveBeenCalled();
    expect(await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).toEqual(booking);
  });

  it("two concurrent cancellations produce one promotion job", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const booking = await prisma.booking.create({ data: { userId: user.id, eventId: event.id } });
    const responses = await Promise.all([1, 2].map(() => request(app)
      .delete(`/v1/bookings/${booking.id}`).set(authHeader(user))));
    expect(responses.map((response) => response.status)).toEqual([204, 204]);
    expect(promotionQueue.add).toHaveBeenCalledTimes(1);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("CANCELLED");
  });

  it("does not retry a saved booking for a transaction-like enqueue error", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const transaction = vi.spyOn(prisma, "$transaction");
    vi.mocked(emailQueue.add).mockRejectedValueOnce(
      Object.assign(new Error("redis://private@host"), { code: "P2034" }),
    );
    const requestId = randomUUID();
    const response = await request(app).post("/v1/bookings").set(authHeader(user))
      .set("x-request-id", requestId).send({ eventId: event.id }).expect(201);
    expect(response.body.status).toBe("CONFIRMED");
    expect(await prisma.booking.count({ where: { userId: user.id, eventId: event.id } })).toBe(1);
    expect(response.headers["x-request-id"]).toBe(requestId);
    expect(emailQueue.add).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("returns 204 when promotion enqueue fails after cancellation commit", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const booking = await prisma.booking.create({ data: { userId: user.id, eventId: event.id } });
    vi.mocked(promotionQueue.add).mockRejectedValueOnce(new Error("unavailable"));
    await request(app).delete(`/v1/bookings/${booking.id}`).set(authHeader(user)).expect(204);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("CANCELLED");
    expect(promotionQueue.add).toHaveBeenCalledTimes(1);
  });

  it("keeps cancellation ownership and missing-booking behavior", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const other = await seedUser({ role: "ATTENDEE", email: "other-lifecycle@test.local" });
    const admin = await seedUser({ role: "ADMIN", email: "admin-lifecycle@test.local" });
    const booking = await prisma.booking.create({ data: { userId: user.id, eventId: event.id } });
    await request(app).delete(`/v1/bookings/${booking.id}`).expect(401);
    await request(app).delete(`/v1/bookings/${booking.id}`).set(authHeader(other)).expect(403);
    await request(app).delete(`/v1/bookings/${randomUUID()}`).set(authHeader(user)).expect(404);
    await request(app).delete(`/v1/bookings/${booking.id}`).set(authHeader(admin)).expect(204);
  });

  it("preserves full-event rejection when restoring a cancelled booking", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const other = await seedUser({ role: "ATTENDEE", email: "full-lifecycle@test.local" });
    const booking = await prisma.booking.create({ data: { userId: user.id, eventId: event.id, status: "CANCELLED" } });
    await prisma.booking.create({ data: { userId: other.id, eventId: event.id } });
    const response = await request(app).post("/v1/bookings").set(authHeader(user))
      .send({ eventId: event.id }).expect(409);
    expect(response.body.error).toBe("Event is full");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("CANCELLED");
  });
});
