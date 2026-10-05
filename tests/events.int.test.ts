import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.ts";
import { authHeader, resetDb, seedEvent, seedUser } from "./helpers.ts";

const eventInput = {
  title: "Backend Workshop",
  description: "A practical workshop about backend development",
  venue: "Room 101",
  startsAt: "2030-06-01T10:00:00.000Z",
  capacity: 25,
  priceCents: 2_500,
};

describe("Events", () => {
  beforeEach(resetDb);

  it("allows an organizer to create an event", async () => {
    const organizer = await seedUser({ role: "ORGANIZER" });

    const response = await request(app)
      .post("/v1/events")
      .set(authHeader(organizer))
      .send(eventInput)
      .expect(201);

    expect(response.body.title).toBe(eventInput.title);
    expect(response.body.organizerId).toBe(organizer.id);
  });

  it("forbids an attendee from creating an event", async () => {
    const attendee = await seedUser({ role: "ATTENDEE" });

    await request(app)
      .post("/v1/events")
      .set(authHeader(attendee))
      .send(eventInput)
      .expect(403);
  });

  it("returns fresh event data after a cache-invalidating write", async () => {
    const organizer = await seedUser({ role: "ORGANIZER" });

    const cachedResponse = await request(app).get("/v1/events").expect(200);
    expect(cachedResponse.body.total).toBe(0);

    await seedEvent({ organizerId: organizer.id, capacity: 10 });

    const staleResponse = await request(app).get("/v1/events").expect(200);
    expect(staleResponse.body.total).toBe(0);

    await request(app)
      .post("/v1/events")
      .set(authHeader(organizer))
      .send(eventInput)
      .expect(201);

    const freshResponse = await request(app).get("/v1/events").expect(200);

    expect(freshResponse.body.total).toBe(2);
    expect(freshResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Test Event" }),
        expect.objectContaining({ title: eventInput.title }),
      ]),
    );
  });
});
