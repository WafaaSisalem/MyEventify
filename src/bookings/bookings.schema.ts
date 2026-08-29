import { z } from "zod";

export const CreateBookingSchema = z.strictObject({
    eventId: z.uuid("Invalid Event ID format"),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
