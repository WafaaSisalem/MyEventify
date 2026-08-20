
export type Role = "ATTENDEE" | "ORGANIZER" | "ADMIN";
export type BookingStatus = "CONFIRMED" | "CANCELLED" | "WAITLISTED";
export interface User {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: Role;
    createdAt: Date;
}
export interface Event {
    id: string;
    title: string;
    description: string;
    venue: string | null;
    startsAt: Date;
    capacity: number;
    priceCents: number;
    organizerId: string;
    createdAt: Date;
}
export interface Booking {
    id: string;
    userId: string;
    eventId: string;
    status: BookingStatus;
}
export function findById<T extends { id: string }>(
    rows: T[],
    id: string,
): T | undefined {
    return rows.find((row) => row.id === id);
}