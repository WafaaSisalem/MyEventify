import { Router } from "express";

import {
    createEventHandler,
    listEventsHandler,
    getEventHandler,
    updateEventHandler,
    deleteEventHandler,
} from "./events.controller.ts";
import { validate, validateQuery } from "../middleware/validate.ts";
import { CreateEventSchema, UpdateEventSchema, EventQuerySchema } from "./events.schema.ts";

const router = Router();

router.post(
    "/events",
    validate(CreateEventSchema),
    createEventHandler,
);
router.get("/events", validateQuery(EventQuerySchema), listEventsHandler);
router.get("/events/:id", getEventHandler);
router.patch("/events/:id", validate(UpdateEventSchema), updateEventHandler);
router.delete("/events/:id", deleteEventHandler);

export default router;