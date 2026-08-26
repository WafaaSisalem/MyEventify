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
import { requireAuth, requireRole } from "../middleware/auth.ts";

const router = Router();

router.post(
    "/",
    requireAuth,
    requireRole('ORGANIZER', 'ADMIN'),
    validate(CreateEventSchema),
    createEventHandler,
);
router.get("/", validateQuery(EventQuerySchema), listEventsHandler);
router.get("/:id", getEventHandler);
router.patch(
    "/:id",
    requireAuth,
    requireRole('ORGANIZER', 'ADMIN'),
    validate(UpdateEventSchema),
    updateEventHandler
);
router.delete(
    "/:id",
    requireAuth,
    requireRole('ORGANIZER', 'ADMIN'),
    deleteEventHandler
);

export default router;