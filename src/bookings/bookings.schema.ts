import { z } from "zod";

export const CreateBookingSchema = z.strictObject({
    eventId: z.string().min(1, "Event ID is required"),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
