import { Worker, UnrecoverableError } from "bullmq";
import { connection } from "./infra/queue-backend.ts";
import * as bookingRepo from "./bookings/bookings.repository.ts";
import { mailer } from "./infra/mailer.ts";
import { prisma } from "./infra/db.ts";
import { emailQueue } from "./jobs/email.queue.ts";

new Worker<{ bookingId: string }>(
  "booking-email",
  async (job) => {
    const b = await bookingRepo.findWithUserAndEvent(job.data.bookingId);

    if (!b) {
      throw new UnrecoverableError(`booking ${job.data.bookingId} not found`);
    }

    await mailer.sendMail({
      to: b.user.email,
      subject: `Booking confirmed: ${b.event.title}`,
      text: `See you at ${b.event.venue}, ${b.event.startsAt.toISOString()}`,
    });
  },
  {
    connection,
    concurrency: 5,
  },
);

new Worker<{ eventId: string }>(
  "waitlist-promote",
  async (job) => {
    const { eventId } = job.data;
    console.log(`Processing waitlist-promote for event ${eventId}`);

    const promotedBookingId = await prisma.$transaction(
      async (tx) => {
        const event = await tx.event.findUnique({
          where: { id: eventId },
        });

        if (!event) {
          throw new UnrecoverableError(`event ${eventId} not found`);
        }

        const confirmedCount = await tx.booking.count({
          where: { eventId, status: "CONFIRMED" },
        });

        console.log(`Confirmed count: ${confirmedCount}, Capacity: ${event.capacity}`);

        if (confirmedCount >= event.capacity) {
          console.log("Event is full, not promoting");
          return null; // Still full, do nothing
        }

        const oldestWaitlisted = await tx.booking.findFirst({
          where: { eventId, status: "WAITLISTED" },
          orderBy: { createdAt: "asc" },
        });

        if (!oldestWaitlisted) {
          console.log("No waitlisted bookings found");
          return null; // No one to promote
        }

        console.log(`Promoting booking ${oldestWaitlisted.id}`);
        await tx.booking.update({
          where: { id: oldestWaitlisted.id },
          data: { status: "CONFIRMED" },
        });

        return oldestWaitlisted.id;
      },
      { isolationLevel: "Serializable" }
    );

    if (promotedBookingId) {
      await emailQueue.add("confirmation", { bookingId: promotedBookingId });
    }
  },
  {
    connection,
    concurrency: 1, // Safe to run sequentially for waitlist
  },
);
