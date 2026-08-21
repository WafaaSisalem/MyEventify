import { prisma } from "../infra/db.ts";
import type { Event } from "../generated/prisma/client.ts";

export async function findAll(): Promise<Event[]> {
    return prisma.event.findMany();
}

export async function findById(id: string): Promise<Event | null> {
    return prisma.event.findUnique({ where: { id } });
}

export async function save(data: {
    title: string;
    description: string;
    venue: string;
    startsAt: Date;
    capacity: number;
    priceCents: number;
    organizerId: string;
}) {
    return prisma.event.create({ data });
}

export async function update(id: string, data: {
    title?: string;
    description?: string;
    venue?: string;
    startsAt?: Date;
    capacity?: number;
    priceCents?: number;
}) {
    return prisma.event.update({ where: { id }, data });
}

export async function remove(id: string): Promise<boolean> {
    try {
        await prisma.event.delete({ where: { id } });
        return true;
    } catch {
        return false;
    }
}
