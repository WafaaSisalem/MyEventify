import type { Event } from "../domain.ts";
import type { CreateEventInput, UpdateEventInput, EventQuery } from "./events.schema.ts";
import * as eventsRepo from "./events.repository.ts";

export function createEvent(input: CreateEventInput): Event {
    const event: Event = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        organizerId: "temp-organizer-id",
        ...input,
    };

    return eventsRepo.save(event);
}

export function listEvents(query: EventQuery = {}) {
    const { page = 1, limit = 20, venue, from, to, sort } = query;
    let filteredEvents = eventsRepo.findAll();

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

export function getEvent(id: string): Event | undefined {
    return eventsRepo.findById(id);
}

export function updateEvent(
    id: string,
    input: UpdateEventInput,
): Event | undefined {
    const event = eventsRepo.findById(id);

    if (!event) {
        return undefined;
    }

    Object.assign(event, input);

    return eventsRepo.update(event);
}

export function deleteEvent(id: string): boolean {
    return eventsRepo.remove(id);
}