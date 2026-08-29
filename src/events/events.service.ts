import type { CreateEventInput, UpdateEventInput, EventQuery } from "./events.schema.ts";
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
    let filteredEvents = await eventsRepo.findAll();

    if (venue) {
        filteredEvents = filteredEvents.filter(e => e.venue === venue);
    }

    if (from) {
        filteredEvents = filteredEvents.filter(e => e.startsAt >= from);
    }

    if (to) {
        filteredEvents = filteredEvents.filter(e => e.startsAt <= to);
    }

    if (sort === "startsAt:asc") {
        filteredEvents.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    } else if (sort === "startsAt:desc") {
        filteredEvents.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
    }

    const total = filteredEvents.length;

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = filteredEvents.slice(startIndex, endIndex);

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