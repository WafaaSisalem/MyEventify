import { UnrecoverableError } from "bullmq";
import type { Logger } from "pino";
import { runSerializable } from "../infra/transaction.ts";

export async function promoteWaitlistedBooking(
  eventId: string,
  log: Logger,
): Promise<string | null> {
  return runSerializable(async (tx) => {
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new UnrecoverableError(`event ${eventId} not found`);
    }
    if (Date.now() >= event.startsAt.getTime()) {
      log.info("event has started; no booking promoted");
      return null;
    }
    const confirmedCount = await tx.booking.count({
      where: { eventId, status: "CONFIRMED" },
    });
    log.debug(
      { confirmedCount, capacity: event.capacity },
      "checked event capacity",
    );
    if (confirmedCount >= event.capacity) {
      log.info("event is full; no booking promoted");
      return null;
    }
    const oldestWaitlisted = await tx.booking.findFirst({
      where: { eventId, status: "WAITLISTED" },
      orderBy: { createdAt: "asc" },
    });
    if (!oldestWaitlisted) {
      log.info("no waitlisted booking found");
      return null;
    }
    await tx.booking.update({
      where: { id: oldestWaitlisted.id },
      data: { status: "CONFIRMED" },
    });
    return oldestWaitlisted.id;
  });
}
