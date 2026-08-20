import type { Request, Response } from "express";
import {
    createEvent,
    listEvents,
    getEvent,
    updateEvent,
    deleteEvent,
} from "./events.service.ts";
import { HttpError } from "../errors/http-error.ts";
import type { EventQuery } from "./events.schema.ts";
export function createEventHandler(req: Request, res: Response) {
    const event = createEvent(req.body);
    res.status(201).json(event);
}

export function listEventsHandler(_req: Request, res: Response) {
    const events = listEvents(res.locals.query as EventQuery);

    res.status(200).json(events);
}

export function getEventHandler(req: Request<{ id: string }>, res: Response) {

    const event = getEvent(req.params.id);

    if (!event) {
        throw new HttpError(404, "Event not found");
    }

    res.status(200).json(event);
}

export function updateEventHandler(req: Request<{ id: string }>, res: Response) {
    const event = updateEvent(req.params.id, req.body);

    if (!event) {
        throw new HttpError(404, "Event not found");
    }

    res.status(200).json(event);
}

export function deleteEventHandler(req: Request<{ id: string }>, res: Response) {
    const deleted = deleteEvent(req.params.id);

    if (!deleted) {
        throw new HttpError(404, "Event not found");
    }

    res.status(204).end();
}