import { Worker, UnrecoverableError } from "bullmq";
import {
  closeQueueConnection,
  connection,
} from "./infra/queue-backend.ts";
import * as bookingRepo from "./bookings/bookings.repository.ts";
import { mailer } from "./infra/mailer.ts";
import { prisma } from "./infra/db.ts";
import { emailQueue } from "./jobs/email.queue.ts";
import { promotionQueue } from "./jobs/promotion.queue.ts";
import { promoteWaitlistedBooking } from "./jobs/promotion.processor.ts";
import { enqueueConfirmation } from "./jobs/booking.enqueue.ts";
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

    const promotedBookingId = await promoteWaitlistedBooking(eventId, jobLogger);
    if (promotedBookingId) {
      jobLogger.info(
        { bookingId: promotedBookingId },
        "promoted waitlisted booking",
      );
      await enqueueConfirmation(promotedBookingId, eventId, jobLogger);
    }
  },
  {
    connection,
    concurrency: 1, // Safe to run sequentially for waitlist
  },
);

registerWorkerShutdown([emailWorker, promotionWorker], [
  { name: "email queue", close: () => emailQueue.close() },
  { name: "promotion queue", close: () => promotionQueue.close() },
  { name: "queue Redis", close: closeQueueConnection },
  { name: "Prisma", close: () => prisma.$disconnect() },
]);
