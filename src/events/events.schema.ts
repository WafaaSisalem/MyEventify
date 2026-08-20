import { z } from "zod";

export const CreateEventSchema = z.strictObject({
    title: z.string().min(3).max(120),
    description: z.string().max(2000),
    venue: z.string().min(1).max(120),
    startsAt: z.coerce.date(), //do we need to transform to iso
    capacity: z.number().int().positive().max(1000000),
    priceCents: z.number().int().nonnegative(),
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export const UpdateEventSchema = CreateEventSchema.partial();
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;

export const EventQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    venue: z.string().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
});

export type EventQuery = z.infer<typeof EventQuerySchema>;