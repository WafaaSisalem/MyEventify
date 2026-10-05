import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.ts";
import { prisma } from "../src/infra/db.ts";
import {
  authHeader,
  resetDb,
  seedUser,
  seedUserAndEvent,
} from "./helpers.ts";

describe("POST /v1/bookings", () => {
  beforeEach(resetDb);

  it("confirms a booking, then rejects the duplicate", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });

    const response = await request(app)
      .post("/v1/bookings")
      .set(authHeader(user))
      .send({ eventId: event.id })
      .expect(201);

    expect(response.body.status).toBe("CONFIRMED");

    await request(app)
      .post("/v1/bookings")
      .set(authHeader(user))
      .send({ eventId: event.id })
      .expect(409);
  });

  it("waitlists a booking when the event is full", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const secondAttendee = await seedUser({
      role: "ATTENDEE",
      email: "second-attendee@test.local",
    });

    await request(app)
      .post("/v1/bookings")
      .set(authHeader(user))
      .send({ eventId: event.id })
      .expect(201);

    const response = await request(app)
      .post("/v1/bookings")
      .set(authHeader(secondAttendee))
      .send({ eventId: event.id })
      .expect(201);

    expect(response.body.status).toBe("WAITLISTED");
  });

  it("restores a cancelled booking when the attendee rebooks", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });

    const originalBooking = await request(app)
      .post("/v1/bookings")
      .set(authHeader(user))
      .send({ eventId: event.id })
      .expect(201);

    await request(app)
      .delete(`/v1/bookings/${originalBooking.body.id}`)
      .set(authHeader(user))
      .expect(204);

    const rebooked = await request(app)
      .post("/v1/bookings")
      .set(authHeader(user))
      .send({ eventId: event.id })
      .expect(201);

    expect(rebooked.body.id).toBe(originalBooking.body.id);
    expect(rebooked.body.status).toBe("CONFIRMED");
  });
});

describe("GET /v1/bookings/:id", () => {
  beforeEach(resetDb);

  it("allows the booking owner to read it", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const booking = await prisma.booking.create({
      data: { userId: user.id, eventId: event.id },
    });

    const response = await request(app)
      .get(`/v1/bookings/${booking.id}`)
      .set(authHeader(user))
      .expect(200);

    expect(response.body.id).toBe(booking.id);
    expect(response.body.userId).toBe(user.id);
  });

  it("allows an admin to read another user's booking", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const admin = await seedUser({
      role: "ADMIN",
      email: "booking-admin@test.local",
    });
    const booking = await prisma.booking.create({
      data: { userId: user.id, eventId: event.id },
    });

    await request(app)
      .get(`/v1/bookings/${booking.id}`)
      .set(authHeader(admin))
      .expect(200);
  });

  it("rejects another attendee", async () => {
    const { user, event } = await seedUserAndEvent({ capacity: 1 });
    const otherAttendee = await seedUser({
      role: "ATTENDEE",
      email: "other-attendee@test.local",
    });
    const booking = await prisma.booking.create({
      data: { userId: user.id, eventId: event.id },
    });

    await request(app)
      .get(`/v1/bookings/${booking.id}`)
      .set(authHeader(otherAttendee))
      .expect(403);
  });
});
