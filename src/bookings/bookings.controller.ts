import type { Request, Response } from "express";
import { createBooking, getBooking, deleteBooking } from "./bookings.service.ts";
import { HttpError } from "../errors/http-error.ts";
import type { CreateBookingInput } from "./bookings.schema.ts";

export function createBookingHandler(req: Request, res: Response) {
    const { eventId } = req.body as CreateBookingInput;
    const currentUserId = "temp-user-id"; // Hard-coded current user as per spec

    const booking = createBooking(eventId, currentUserId);
    res.status(201).json(booking);
}

export function getBookingHandler(req: Request<{ id: string }>, res: Response) {
    const booking = getBooking(req.params.id);

    if (!booking) {
        throw new HttpError(404, "Booking not found");
    }

    res.status(200).json(booking);
}

export function deleteBookingHandler(req: Request<{ id: string }>, res: Response) {
    const booking = deleteBooking(req.params.id);

    if (!booking) {
        throw new HttpError(404, "Booking not found");
    }

    res.status(200).json(booking);
}
