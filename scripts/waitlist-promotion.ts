// Manual verification script. Requires the API, worker, PostgreSQL, and Redis
// to be running and modifies dedicated test/fixture data.
import jwt from "jsonwebtoken";
import { prisma } from "../src/infra/db.ts";
import { config } from "../src/config.ts";
import { hashPassword } from "../src/auth/auth.utils.ts";
import { promotionQueue } from "../src/jobs/promotion.queue.ts";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const eventId = "0194bc00-0000-7000-8000-000000000301";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForPromotion(bookingId: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (booking?.status === "CONFIRMED") {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    "Timed out waiting for promotion. Make sure the API and worker are running.",
  );
}

function createAccessToken(user: { id: string; role: string }) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    config.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "5m" },
  );
}

async function bookEvent(accessToken: string) {
  return fetch(`${baseUrl}/v1/bookings`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ eventId }),
  });
}

async function main() {
  const password = await hashPassword("waitlist-script-password");

  const organizer = await prisma.user.upsert({
    where: { email: "waitlist-script-organizer@example.com" },
    update: { role: "ORGANIZER", password },
    create: {
      email: "waitlist-script-organizer@example.com",
      name: "Waitlist Script Organizer",
      role: "ORGANIZER",
      password,
    },
  });

  const confirmedUser = await prisma.user.upsert({
    where: { email: "waitlist-script-confirmed@example.com" },
    update: { password },
    create: {
      email: "waitlist-script-confirmed@example.com",
      name: "Confirmed User",
      password,
    },
  });

  const oldestWaitlistedUser = await prisma.user.upsert({
    where: { email: "waitlist-script-oldest@example.com" },
    update: { password },
    create: {
      email: "waitlist-script-oldest@example.com",
      name: "Oldest Waitlisted User",
      password,
    },
  });

  const secondWaitlistedUser = await prisma.user.upsert({
    where: { email: "waitlist-script-second@example.com" },
    update: { password },
    create: {
      email: "waitlist-script-second@example.com",
      name: "Second Waitlisted User",
      password,
    },
  });

  await prisma.event.upsert({
    where: { id: eventId },
    update: { capacity: 1, organizerId: organizer.id },
    create: {
      id: eventId,
      title: "Waitlist Promotion Verification",
      description: "Isolated fixture for the Session 5 verification script.",
      venue: "Test Venue",
      startsAt: new Date("2030-01-01T12:00:00.000Z"),
      capacity: 1,
      priceCents: 0,
      organizerId: organizer.id,
    },
  });

  await prisma.booking.deleteMany({ where: { eventId } });

  const confirmed = await prisma.booking.create({
    data: {
      eventId,
      userId: confirmedUser.id,
      status: "CONFIRMED",
    },
  });

  const oldestWaitlistedResponse = await bookEvent(
    createAccessToken(oldestWaitlistedUser),
  );
  assert(
    oldestWaitlistedResponse.status === 201,
    `Expected first full-event booking status 201, received ${oldestWaitlistedResponse.status}`,
  );
  const oldestWaitlisted = (await oldestWaitlistedResponse.json()) as {
    id: string;
    status: string;
  };
  assert(
    oldestWaitlisted.status === "WAITLISTED",
    `Expected WAITLISTED, received ${oldestWaitlisted.status}`,
  );

  const secondWaitlistedResponse = await bookEvent(
    createAccessToken(secondWaitlistedUser),
  );
  assert(
    secondWaitlistedResponse.status === 201,
    `Expected second full-event booking status 201, received ${secondWaitlistedResponse.status}`,
  );
  const secondWaitlisted = (await secondWaitlistedResponse.json()) as {
    id: string;
    status: string;
  };
  assert(
    secondWaitlisted.status === "WAITLISTED",
    `Expected WAITLISTED, received ${secondWaitlisted.status}`,
  );

  await prisma.booking.update({
    where: { id: oldestWaitlisted.id },
    data: { createdAt: new Date("2029-01-01T10:00:00.000Z") },
  });
  await prisma.booking.update({
    where: { id: secondWaitlisted.id },
    data: { createdAt: new Date("2029-01-01T11:00:00.000Z") },
  });

  const accessToken = createAccessToken(confirmedUser);

  const cancellation = await fetch(
    `${baseUrl}/v1/bookings/${confirmed.id}`,
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}` },
    },
  );

  assert(
    cancellation.status === 204,
    `Expected cancellation status 204, received ${cancellation.status}`,
  );

  await waitForPromotion(oldestWaitlisted.id);

  const afterFirstRun = await prisma.booking.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });

  assert(
    afterFirstRun.filter((booking) => booking.status === "CONFIRMED").length === 1,
    "Expected exactly one confirmed booking after promotion",
  );
  assert(
    afterFirstRun.find((booking) => booking.id === oldestWaitlisted.id)?.status ===
      "CONFIRMED",
    "The oldest waitlisted booking was not promoted",
  );
  assert(
    afterFirstRun.find((booking) => booking.id === secondWaitlisted.id)?.status ===
      "WAITLISTED",
    "The second waitlisted booking was promoted unexpectedly",
  );

  await promotionQueue.add("promote", { eventId });
  await new Promise((resolve) => setTimeout(resolve, 2_000));

  const afterSecondRun = await prisma.booking.findMany({ where: { eventId } });

  assert(
    afterSecondRun.filter((booking) => booking.status === "CONFIRMED").length === 1,
    "Re-running the job promoted more than one booking",
  );
  assert(
    afterSecondRun.find((booking) => booking.id === secondWaitlisted.id)?.status ===
      "WAITLISTED",
    "Re-running the job double-promoted the waitlist",
  );

  console.log(
    JSON.stringify({
      cancelledBookingId: confirmed.id,
      promotedBookingId: oldestWaitlisted.id,
      stillWaitlistedBookingId: secondWaitlisted.id,
      confirmedCount: 1,
      result: "PASS",
    }),
  );
}

main().then(
  async () => {
    await promotionQueue.close();
    await prisma.$disconnect();
    process.exit(0);
  },
  async (error: unknown) => {
    console.error(error);
    await promotionQueue.close();
    await prisma.$disconnect();
    process.exit(1);
  },
);
