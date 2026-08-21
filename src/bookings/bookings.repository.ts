import { prisma } from "../infra/db.ts";
import type { Booking } from "../generated/prisma/client.ts";

export async function findById(id: string): Promise<Booking | null> {
    return prisma.booking.findUnique({ where: { id } });
}

export async function findByUserAndEvent(userId: string, eventId: string): Promise<Booking | null> {
    return prisma.booking.findUnique({
        where: {
            userId_eventId: {
                userId,
                eventId
            }
        }
    });
}

export async function countConfirmedByEvent(eventId: string): Promise<number> {
    return prisma.booking.count({
        where: {
            eventId,
            status: "CONFIRMED"
        }
    });
}

export async function save(data: {
    userId: string;
    eventId: string;
    status?: "CONFIRMED" | "WAITLISTED" | "CANCELLED";
}): Promise<Booking> {
    return prisma.booking.create({ data });
}

export async function update(id: string, data: {
    status?: "CONFIRMED" | "WAITLISTED" | "CANCELLED";
}): Promise<Booking> {
    return prisma.booking.update({ where: { id }, data });
}
