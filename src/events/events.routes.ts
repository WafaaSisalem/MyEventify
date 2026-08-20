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
    "/",
    validate(CreateEventSchema),
    createEventHandler,
);
router.get("/", validateQuery(EventQuerySchema), listEventsHandler);
router.get("/:id", getEventHandler);
router.patch("/:id", validate(UpdateEventSchema), updateEventHandler);
router.delete("/:id", deleteEventHandler);

export default router;