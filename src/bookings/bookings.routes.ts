import { Router } from "express";
import {
    createBookingHandler,
    getBookingHandler,
    deleteBookingHandler,
} from "./bookings.controller.ts";
import { validate } from "../middleware/validate.ts";
import { CreateBookingSchema } from "./bookings.schema.ts";

const router = Router();

router.post("/", validate(CreateBookingSchema), createBookingHandler);
router.get("/:id", getBookingHandler);
router.delete("/:id", deleteBookingHandler);

export default router;
