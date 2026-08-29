import type { CreateEventInput, UpdateEventInput, EventQuery } from "./events.schema.ts";
import type { Prisma } from "../generated/prisma/client.ts";
import * as eventsRepo from "./events.repository.ts";
import { ForbiddenError } from "../errors/http-error.ts";

export async function createEvent(input: CreateEventInput, organizerId: string) {
    return eventsRepo.save({
        organizerId,
        ...input,
    });
}

export async function listEvents(query: EventQuery = {}) {
    const { page = 1, limit = 20, venue, from, to, sort } = query;
    
    const where: Prisma.EventWhereInput = {};
    if (venue) {
        where.venue = venue;
    }
    if (from || to) {
        where.startsAt = {};
        if (from) where.startsAt.gte = from;
        if (to) where.startsAt.lte = to;
    }

    const orderBy: Prisma.EventOrderByWithRelationInput = {};
    if (sort === "startsAt:asc") {
        orderBy.startsAt = 'asc';
    } else if (sort === "startsAt:desc") {
        orderBy.startsAt = 'desc';
    }

    const startIndex = (page - 1) * limit;

    const [data, total] = await Promise.all([
        eventsRepo.findMany({
            where,
            orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
            skip: startIndex,
            take: limit,
        }),
        eventsRepo.count({ where }),
    ]);

    return {
        data,
        page,
        limit,
        total,
    };
}

export async function getEvent(id: string) {
    return eventsRepo.findById(id);
}

export async function updateEvent(
    id: string,
    input: UpdateEventInput,
    userId: string,
    userRole: string
) {
    const event = await eventsRepo.findById(id);

    if (!event) {
        return null;
    }

    if (userRole !== 'ADMIN' && event.organizerId !== userId) {
        throw new ForbiddenError();
    }

    return eventsRepo.update(id, input);
}

export async function deleteEvent(id: string, userId: string, userRole: string) {
    const event = await eventsRepo.findById(id);

    if (!event) {
        return false;
    }

    if (userRole !== 'ADMIN' && event.organizerId !== userId) {
        throw new ForbiddenError();
    }

    return eventsRepo.remove(id);
}