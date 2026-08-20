import type { Booking } from "../domain.ts";

const bookings = new Map<string, Booking>();

export function findAll(): Booking[] {
    return Array.from(bookings.values());
}

export function findById(id: string): Booking | undefined {
    return bookings.get(id);
}

export function findByUserAndEvent(userId: string, eventId: string): Booking | undefined {
    return Array.from(bookings.values()).find(
        b => b.userId === userId && b.eventId === eventId
    );
}

export function countConfirmedByEvent(eventId: string): number {
    let count = 0;
    for (const booking of bookings.values()) {
        if (booking.eventId === eventId && booking.status === "CONFIRMED") {
            count++;
        }
    }
    return count;
}

export function save(booking: Booking): Booking {
    bookings.set(booking.id, booking);
    return booking;
}

export function update(booking: Booking): Booking {
    bookings.set(booking.id, booking);
    return booking;
}
