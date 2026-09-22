import jwt from "jsonwebtoken";
import type { User } from "../src/generated/prisma/client.ts";
import { config } from "../src/config.ts";
import { prisma } from "../src/infra/db.ts";

export async function resetDb(): Promise<void> {
  const databaseName = new URL(config.DATABASE_URL).pathname.slice(1);

  if (databaseName !== "eventify_test") {
    throw new Error(
      `Refusing to reset database "${databaseName}". Expected "eventify_test".`,
    );
  }

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "Booking", "RefreshToken", "Event", "User"
    RESTART IDENTITY CASCADE
  `);
}

export async function seedUserAndEvent({ capacity }: { capacity: number }) {
  const user = await prisma.user.create({
    data: {
      email: "attendee@test.local",
      name: "Test Attendee",
      password: "not-used-in-this-test",
      role: "ATTENDEE",
    },
  });

  const organizer = await prisma.user.create({
    data: {
      email: "organizer@test.local",
      name: "Test Organizer",
      password: "not-used-in-this-test",
      role: "ORGANIZER",
    },
  });

  const event = await prisma.event.create({
    data: {
      title: "Test Event",
      description: "Event created for an integration test",
      startsAt: new Date("2030-01-01T12:00:00.000Z"),
      capacity,
      priceCents: 1_000,
      organizerId: organizer.id,
    },
  });

  return { user, event };
}

export function authHeader(user: Pick<User, "id" | "role">) {
  const token = jwt.sign(
    { sub: user.id, role: user.role },
    config.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "15m" },
  );

  return { Authorization: `Bearer ${token}` };
}
