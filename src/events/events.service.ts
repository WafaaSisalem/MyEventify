import type { CreateEventInput, UpdateEventInput, EventQuery } from "./events.schema.ts";
import * as eventsRepo from "./events.repository.ts";

export async function createEvent(input: CreateEventInput) {
    return eventsRepo.save({
        organizerId: "temp-organizer-id",
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
) {
    const event = await eventsRepo.findById(id);

    if (!event) {
        return null;
    }

    return eventsRepo.update(id, input);
}

export async function deleteEvent(id: string) {
    return eventsRepo.remove(id);
}