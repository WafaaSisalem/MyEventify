import type { Logger } from "pino";
import { getContextLogger } from "../infra/logger-context.ts";
import { emailQueue } from "./email.queue.ts";
import { promotionQueue } from "./promotion.queue.ts";

function logEnqueueFailure(
  log: Logger,
  jobType: "confirmation" | "promote",
  bookingId: string,
  eventId: string,
  error: unknown,
) {
  log.error(
    {
      jobType,
      bookingId,
      eventId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    },
    "background job enqueue failed",
  );
}

export async function enqueueConfirmation(
  bookingId: string,
  eventId: string,
  log: Logger = getContextLogger(),
): Promise<void> {
  try {
    await emailQueue.add("confirmation", { bookingId });
  } catch (error: unknown) {
    logEnqueueFailure(log, "confirmation", bookingId, eventId, error);
  }
}

export async function enqueuePromotion(
  bookingId: string,
  eventId: string,
  log: Logger = getContextLogger(),
): Promise<void> {
  try {
    await promotionQueue.add("promote", { eventId });
  } catch (error: unknown) {
    logEnqueueFailure(log, "promote", bookingId, eventId, error);
  }
}
