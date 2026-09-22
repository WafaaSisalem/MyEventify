import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.ts";
import { authHeader, resetDb, seedUserAndEvent } from "./helpers.ts";

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
});
