import { Router } from "express";
import {
    createBookingHandler,
    getBookingHandler,
    deleteBookingHandler,
} from "./bookings.controller.ts";
import { validate, validateParams, UuidParamSchema } from "../middleware/validate.ts";
import { CreateBookingSchema } from "./bookings.schema.ts";
import { requireAuth } from "../middleware/auth.ts";
import { limiter } from "../middleware/rate-limit.ts";

const router = Router();

router.post(
    "/",
    requireAuth,
    limiter(3, 60, (req) => req.user!.sub),
    validate(CreateBookingSchema),
    createBookingHandler
);
router.get("/:id", requireAuth, validateParams(UuidParamSchema), getBookingHandler);
router.delete("/:id", requireAuth, validateParams(UuidParamSchema), deleteBookingHandler);

export default router;
