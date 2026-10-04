import jwt from "jsonwebtoken";
import type { Role, User } from "../src/generated/prisma/client.ts";
import { config } from "../src/config.ts";
import { prisma } from "../src/infra/db.ts";
import { redis } from "../src/infra/redis.ts";

export async function resetDb(): Promise<void> {
  const databaseName = new URL(config.DATABASE_URL).pathname.slice(1);

  if (databaseName !== "eventify_test") {
    throw new Error(
      `Refusing to reset database "${databaseName}". Expected "eventify_test".`,
    );
  }

  const redisDatabase = new URL(config.REDIS_URL).pathname.slice(1);

  if (redisDatabase !== "1") {
    throw new Error(
      `Refusing to reset Redis database "${redisDatabase || "0"}". Expected "1".`,
    );
  }

  await Promise.all([
    prisma.$executeRawUnsafe(`
      TRUNCATE TABLE "Booking", "RefreshToken", "Event", "User"
      RESTART IDENTITY CASCADE
    `),
    redis.flushDb(),
  ]);
}

export async function seedUser({
  role,
  email = `${role.toLowerCase()}@test.local`,
}: {
  role: Role;
  email?: string;
}) {
  return prisma.user.create({
    data: {
      email,
      name: `Test ${role.toLowerCase()}`,
      password: "not-used-in-this-test",
      role,
    },
  });
}

export async function seedEvent({
  organizerId,
  capacity,
}: {
  organizerId: string;
  capacity: number;
}) {
  return prisma.event.create({
    data: {
      title: "Test Event",
      description: "Event created for an integration test",
      venue: "Test Venue",
      startsAt: new Date("2030-01-01T12:00:00.000Z"),
      capacity,
      priceCents: 1_000,
      organizerId,
    },
  });
}

export async function seedUserAndEvent({ capacity }: { capacity: number }) {
  const user = await seedUser({ role: "ATTENDEE" });
  const organizer = await seedUser({ role: "ORGANIZER" });
  const event = await seedEvent({
    organizerId: organizer.id,
    capacity,
  });

  return { user, organizer, event };
}

export function authHeader(user: Pick<User, "id" | "role">) {
  const token = jwt.sign(
    { sub: user.id, role: user.role },
    config.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "15m" },
  );

  return { Authorization: `Bearer ${token}` };
}
