import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.ts";
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
