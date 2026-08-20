import type { Event } from "../domain.ts";

const events = new Map<string, Event>();

export function findAll(): Event[] {
    return Array.from(events.values());
}

export function findById(id: string): Event | undefined {
    return events.get(id);
}

export function save(event: Event): Event {
    events.set(event.id, event);
    return event;
}

export function update(event: Event): Event {
    events.set(event.id, event);
    return event;
}

export function remove(id: string): boolean {
    return events.delete(id);
}
