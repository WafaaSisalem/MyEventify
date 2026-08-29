import type { Request, Response } from "express";
import { createBooking, getBooking, deleteBooking } from "./bookings.service.ts";
import { HttpError } from "../errors/http-error.ts";
import type { CreateBookingInput } from "./bookings.schema.ts";

export async function createBookingHandler(req: Request, res: Response) {
    const { eventId } = req.body as CreateBookingInput;

    const booking = await createBooking(eventId, req.user!.sub);
    res.status(201).json(booking);
}

export async function getBookingHandler(req: Request<{ id: string }>, res: Response) {
    const booking = await getBooking(req.params.id);

    if (!booking) {
        throw new HttpError(404, "Booking not found");
    }

    res.status(200).json(booking);
}

export async function deleteBookingHandler(req: Request<{ id: string }>, res: Response) {
    const booking = await deleteBooking(req.params.id, req.user!.sub, req.user!.role);

    if (!booking) {
        throw new HttpError(404, "Booking not found");
    }

    res.status(204).end();
}
