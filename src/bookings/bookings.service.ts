import type { Booking } from "../generated/prisma/client.ts";
import { prisma } from "../infra/db.ts";
import { getEvent } from "../events/events.service.ts";
import { HttpError } from "../errors/http-error.ts";
import * as bookingsRepo from "./bookings.repository.ts";

export async function createBooking(eventId: string, userId: string): Promise<Booking> {
    const event = await getEvent(eventId);
    if (!event) {
        throw new HttpError(404, "Event not found");
    }

    try {
        return await prisma.$transaction(async (tx) => {
            const confirmedCount = await tx.booking.count({
                where: { eventId, status: "CONFIRMED" }
            });

            if (confirmedCount >= event.capacity) {
                throw new HttpError(409, "Event is full");
            }

            const existingBooking = await tx.booking.findUnique({
                where: { userId_eventId: { userId, eventId } }
            });

            if (existingBooking) {
                if (existingBooking.status === "CANCELLED") {
                    return await tx.booking.update({
                        where: { id: existingBooking.id },
                        data: { status: "CONFIRMED" }
                    });
                } else if (existingBooking.status === "WAITLISTED") {
                    throw new HttpError(409, "User is already waitlisted");
                }

                // If CONFIRMED, attempt to create it anyway to trigger P2002 unique constraint violation
                return await tx.booking.create({
                    data: { userId, eventId, status: "CONFIRMED" }
                });
            }

            // No existing row
            return await tx.booking.create({
                data: {
                    userId,
                    eventId,
                    status: "CONFIRMED"
                }
            });
        }, { isolationLevel: 'Serializable' });
    } catch (error: any) {
        if (error.code === 'P2002') {
            throw new HttpError(409, "Duplicate booking");
        }
        throw error;
    }
}

export async function getBooking(id: string): Promise<Booking | null> {
    return await bookingsRepo.findById(id);
}

export async function deleteBooking(id: string): Promise<Booking | null> {
    const booking = await bookingsRepo.findById(id);
    if (!booking) {
        return null;
    }

    return await bookingsRepo.update(id, { status: "CANCELLED" });
}
