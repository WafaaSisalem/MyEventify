import type { Booking } from "../domain.ts";
import { getEvent } from "../events/events.service.ts";
import { HttpError } from "../errors/http-error.ts";
import * as bookingsRepo from "./bookings.repository.ts";

export function createBooking(eventId: string, userId: string): Booking {
    const event = getEvent(eventId);
    if (!event) {
        throw new HttpError(404, "Event not found");
    }

    // Check duplicate
    const existingBooking = bookingsRepo.findByUserAndEvent(userId, eventId);
    if (existingBooking) {
        throw new HttpError(409, "User already has a booking for this event");
    }

    // Check capacity
    const confirmedCount = bookingsRepo.countConfirmedByEvent(eventId);
    const bookingStatus = confirmedCount >= event.capacity ? "WAITLISTED" : "CONFIRMED";

    const booking: Booking = {
        id: crypto.randomUUID(),
        userId,
        eventId,
        status: bookingStatus,
        createdAt: new Date().toISOString(),
    };

    return bookingsRepo.save(booking);
}

export function getBooking(id: string): Booking | undefined {
    return bookingsRepo.findById(id);
}

export function deleteBooking(id: string): Booking | undefined {
    const booking = bookingsRepo.findById(id);
    if (!booking) {
        return undefined;
    }

    booking.status = "CANCELLED";
    return bookingsRepo.update(booking);
}
