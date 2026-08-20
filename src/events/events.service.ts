import type { Event } from "../domain.ts";
import type { CreateEventInput, UpdateEventInput, EventQuery } from "./events.schema.ts";

const events = new Map<string, Event>();

export function createEvent(input: CreateEventInput): Event {
    const event: Event = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        organizerId: "temp-organizer-id",
        ...input,
    };

    events.set(event.id, event);

    return event;
}

export function listEvents(_query: EventQuery = {}): Event[] {
    return Array.from(events.values());

}

export function getEvent(id: string): Event | undefined {
    return events.get(id);
}

export function updateEvent(
    id: string,
    input: UpdateEventInput,
): Event | undefined {
    const event = events.get(id);

    if (!event) {
        return undefined;
    }

    Object.assign(event, input);

    return event;
}

export function deleteEvent(id: string): boolean {
    return events.delete(id);
}