import { Worker, UnrecoverableError } from "bullmq";
import { connection } from "./infra/queue-backend.ts";
import * as bookingRepo from "./bookings/bookings.repository.ts";
import { mailer } from "./infra/mailer.ts";

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
