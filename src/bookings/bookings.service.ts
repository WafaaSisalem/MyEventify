import type { Booking } from "../generated/prisma/client.ts";
import { HttpError, ForbiddenError } from "../errors/http-error.ts";
import * as bookingsRepo from "./bookings.repository.ts";
import { runSerializable } from "../infra/transaction.ts";
import {
  enqueueConfirmation,
  enqueuePromotion,
} from "../jobs/booking.enqueue.ts";

export async function createBooking(
  eventId: string,
  userId: string,
): Promise<Booking> {
  let booking: Booking;
  try {
    booking = await runSerializable(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) {
        throw new HttpError(404, "Event not found");
      }
      if (Date.now() >= event.startsAt.getTime()) {
        throw new HttpError(409, "Event has already started");
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

        // Existing CONFIRMED: preserve the database duplicate constraint.
        return await tx.booking.create({
          data: { userId, eventId, status: "CONFIRMED" },
        });
      }

      if (isFull) {
        return await tx.booking.create({
          data: { userId, eventId, status: "WAITLISTED" },
        });
      }

      return await tx.booking.create({
        data: { userId, eventId, status: "CONFIRMED" },
      });
    });
  } catch (error: unknown) {
    const err = error as { code?: string } | null | undefined;
    if (err?.code === "P2002") {
      throw new HttpError(409, "Duplicate booking");
    }
    throw error;
  }

  if (booking.status === "CONFIRMED") {
    await enqueueConfirmation(booking.id, booking.eventId);
  }
  return booking;
}

export async function getBooking(
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

  return booking;
}

export async function deleteBooking(
  id: string,
  userId: string,
  userRole: string,
): Promise<Booking | null> {
  const result = await runSerializable(async (tx) => {
    const record = await tx.booking.findUnique({
      where: { id },
      include: { event: { select: { startsAt: true } } },
    });
    if (!record) {
      return null;
    }

    const { event, ...booking } = record;
    if (userRole !== "ADMIN" && booking.userId !== userId) {
      throw new ForbiddenError();
    }
    if (booking.status === "CANCELLED") {
      return { booking, promote: false };
    }
    if (Date.now() >= event.startsAt.getTime()) {
      throw new HttpError(409, "Event has already started");
    }

    const transition = await tx.booking.updateMany({
      where: { id, status: booking.status },
      data: { status: "CANCELLED" },
    });
    if (transition.count !== 1) {
      throw new Error("Booking cancellation transition failed");
    }

    return {
      booking: { ...booking, status: "CANCELLED" as const },
      promote: booking.status === "CONFIRMED",
    };
  });

  if (!result) {
    return null;
  }
  if (result.promote) {
    await enqueuePromotion(result.booking.id, result.booking.eventId);
  }
  return result.booking;
}
