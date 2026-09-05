import type { Booking } from "../generated/prisma/client.ts";
import { prisma } from "../infra/db.ts";
import { HttpError, ForbiddenError } from "../errors/http-error.ts";
import * as bookingsRepo from "./bookings.repository.ts";
import { emailQueue } from "../jobs/email.queue.ts";

export async function createBooking(
  eventId: string,
  userId: string,
): Promise<Booking> {
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const booking = await prisma.$transaction(
        async (tx) => {
          // Read event directly from DB inside transaction
          const event = await tx.event.findUnique({
            where: { id: eventId },
          });

          if (!event) {
            throw new HttpError(404, "Event not found");
          }

          const confirmedCount = await tx.booking.count({
            where: { eventId, status: "CONFIRMED" },
          });

          const isFull = confirmedCount >= event.capacity;

          const existingBooking = await tx.booking.findUnique({
            where: { userId_eventId: { userId, eventId } },
          });

          if (existingBooking) {
            if (existingBooking.status === "CANCELLED") {
              if (isFull) {
                throw new HttpError(409, "Event is full");
              }
              return await tx.booking.update({
                where: { id: existingBooking.id },
                data: { status: "CONFIRMED" },
              });
            } else if (existingBooking.status === "WAITLISTED") {
              throw new HttpError(409, "User is already waitlisted");
            }

            // If CONFIRMED, attempt to create it anyway to trigger P2002 unique constraint violation
            return await tx.booking.create({
              data: { userId, eventId, status: "CONFIRMED" },
            });
          }

          // No existing row
          if (isFull) {
            return await tx.booking.create({
              data: {
                userId,
                eventId,
                status: "WAITLISTED",
              },
            });
          }

          return await tx.booking.create({
            data: {
              userId,
              eventId,
              status: "CONFIRMED",
            },
          });
        },
        { isolationLevel: "Serializable" },
      );

      // Transaction committed successfully
      await emailQueue.add("confirmation", {
        bookingId: booking.id,
      });

      return booking;
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === "P2002") {
        throw new HttpError(409, "Duplicate booking");
      }
      if (err.code === "P2034") {
        attempt++;
        if (attempt >= MAX_RETRIES) {
          throw error;
        }
        continue;
      }
      throw error;
    }
  }

  throw new Error("Transaction failed after max retries");
}

export async function getBooking(id: string): Promise<Booking | null> {
  return await bookingsRepo.findById(id);
}

export async function deleteBooking(
  id: string,
  userId: string,
  userRole: string,
): Promise<Booking | null> {
  const booking = await bookingsRepo.findById(id);
  if (!booking) {
    return null;
  }

  if (userRole !== "ADMIN" && booking.userId !== userId) {
    throw new ForbiddenError();
  }

  return await bookingsRepo.update(id, { status: "CANCELLED" });
}
