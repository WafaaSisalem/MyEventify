import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.ts";
import { UnauthorizedError, ForbiddenError } from "../errors/http-error.ts";

const payloadSchema = z.object({
  sub: z.uuid(),
  role: z.enum(['ATTENDEE', 'ORGANIZER', 'ADMIN']),
});

export type TokenPayload = z.infer<typeof payloadSchema>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');

  if (!token) {
    throw new UnauthorizedError('Missing token');
  }

  try {
    const payload = jwt.verify(
      token,
      config.JWT_ACCESS_SECRET,
      { algorithms: ['HS256'] }
    );

    req.user = payloadSchema.parse(payload);
  } catch (err) {
    throw new UnauthorizedError(
      'Invalid or expired token',
      { cause: err }
    );
  }

  next();
}

export const requireRole =
  (...roles: TokenPayload['role'][]) =>
    (req: Request, _res: Response, next: NextFunction) => {
      if (!req.user || !roles.includes(req.user.role)) {
        throw new ForbiddenError();
      }

      next();
    };
