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