import type { Booking } from "../domain.ts";
import { getEvent } from "../events/events.service.ts";
import { HttpError } from "../errors/http-error.ts";

const bookings = new Map<string, Booking>();

export function createBooking(eventId: string, userId: string): Booking {
    const event = getEvent(eventId);
    if (!event) {
        throw new HttpError(404, "Event not found");
    }

    // Check duplicate
    for (const booking of bookings.values()) {
        if (booking.userId === userId && booking.eventId === eventId) {
            throw new HttpError(409, "User already has a booking for this event");
        }
    }

    // Check capacity
    let confirmedCount = 0;
    for (const booking of bookings.values()) {
        if (booking.eventId === eventId && booking.status === "CONFIRMED") {
            confirmedCount++;
        }
    }

    if (confirmedCount >= event.capacity) {
        throw new HttpError(409, "Event is at full capacity");
    }

    const booking: Booking = {
        id: crypto.randomUUID(),
        userId,
        eventId,
        status: "CONFIRMED",
        createdAt: new Date().toISOString(),
    };

    bookings.set(booking.id, booking);

    return booking;
}

export function getBooking(id: string): Booking | undefined {
    return bookings.get(id);
}

export function deleteBooking(id: string): Booking | undefined {
    const booking = bookings.get(id);
    if (!booking) {
        return undefined;
    }

    booking.status = "CANCELLED";
    return booking;
}
