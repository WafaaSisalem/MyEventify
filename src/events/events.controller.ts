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

export async function createEventHandler(req: Request, res: Response) {
    const event = await createEvent(req.body);
    res.status(201).json(event);
}

export async function listEventsHandler(_req: Request, res: Response) {
    const events = await listEvents(res.locals.query as EventQuery);

    res.status(200).json(events);
}

export async function getEventHandler(req: Request<{ id: string }>, res: Response) {

    const event = await getEvent(req.params.id);

    if (!event) {
        throw new HttpError(404, "Event not found");
    }

    res.status(200).json(event);
}

export async function updateEventHandler(req: Request<{ id: string }>, res: Response) {
    const event = await updateEvent(req.params.id, req.body);

    if (!event) {
        throw new HttpError(404, "Event not found");
    }

    res.status(200).json(event);
}

export async function deleteEventHandler(req: Request<{ id: string }>, res: Response) {
    const deleted = await deleteEvent(req.params.id);

    if (!deleted) {
        throw new HttpError(404, "Event not found");
    }

    res.status(204).end();
}