import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { HttpError } from "../errors/http-error.ts";

export const validate =
    (schema: z.ZodType) =>
        (req: Request, _res: Response, next: NextFunction) => {
            const result = schema.safeParse(req.body);

            if (!result.success) {
                throw new HttpError(
                    400,
                    "Validation failed",
                    result.error.issues,
                );
            }

            req.body = result.data;
            next();
        };

export const UuidParamSchema = z.object({
    id: z.uuid("Invalid ID format"),
});

export const validateQuery =
    (schema: z.ZodType) =>
        (req: Request, res: Response, next: NextFunction) => {
            const result = schema.safeParse(req.query);

            if (!result.success) {
                throw new HttpError(
                    400,
                    "Validation failed",
                    result.error.issues,
                );
            }

            res.locals.query = result.data;
            next();
        };

export const validateParams =
    (schema: z.ZodType) =>
        (req: Request, _res: Response, next: NextFunction) => {
            const result = schema.safeParse(req.params);

            if (!result.success) {
                throw new HttpError(
                    400,
                    "Invalid route parameters",
                    result.error.issues,
                );
            }

            // We do not overwrite req.params because express typing makes it tricky, 
            // but we know it's valid now.
            next();
        };