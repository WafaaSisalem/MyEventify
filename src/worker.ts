import { Worker, UnrecoverableError } from "bullmq";
import {
  closeQueueConnection,
  connection,
} from "./infra/queue-backend.ts";
import * as bookingRepo from "./bookings/bookings.repository.ts";
import { mailer } from "./infra/mailer.ts";
import { prisma } from "./infra/db.ts";
import { emailQueue } from "./jobs/email.queue.ts";
import { logger } from "./infra/logger.ts";
import { registerWorkerShutdown } from "./infra/shutdown.ts";

const workerLogger = logger.child({ component: "worker" });

const emailWorker = new Worker<{ bookingId: string }>(
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

const promotionWorker = new Worker<{ eventId: string }>(
  "waitlist-promote",
  async (job) => {
    const { eventId } = job.data;
    const jobLogger = workerLogger.child({
      queue: "waitlist-promote",
      jobId: job.id,
      eventId,
    });
    jobLogger.info("processing waitlist promotion");

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

        jobLogger.debug(
          { confirmedCount, capacity: event.capacity },
          "checked event capacity",
        );

        if (confirmedCount >= event.capacity) {
          jobLogger.info("event is full; no booking promoted");
          return null; // Still full, do nothing
        }

        const oldestWaitlisted = await tx.booking.findFirst({
          where: { eventId, status: "WAITLISTED" },
          orderBy: { createdAt: "asc" },
        });

        if (!oldestWaitlisted) {
          jobLogger.info("no waitlisted booking found");
          return null; // No one to promote
        }

        jobLogger.info(
          { bookingId: oldestWaitlisted.id },
          "promoting waitlisted booking",
        );
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

registerWorkerShutdown([emailWorker, promotionWorker], [
  { name: "email queue", close: () => emailQueue.close() },
  { name: "queue Redis", close: closeQueueConnection },
  { name: "Prisma", close: () => prisma.$disconnect() },
]);
