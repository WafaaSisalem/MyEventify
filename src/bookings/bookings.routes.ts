import { Router } from "express";
import {
    createBookingHandler,
    getBookingHandler,
    deleteBookingHandler,
} from "./bookings.controller.ts";
import { validate, validateParams, UuidParamSchema } from "../middleware/validate.ts";
import { CreateBookingSchema } from "./bookings.schema.ts";
import { requireAuth } from "../middleware/auth.ts";

const router = Router();

router.post("/", requireAuth, validate(CreateBookingSchema), createBookingHandler);
router.get("/:id", requireAuth, validateParams(UuidParamSchema), getBookingHandler);
router.delete("/:id", requireAuth, validateParams(UuidParamSchema), deleteBookingHandler);

export default router;
