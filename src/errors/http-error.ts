export class HttpError extends Error {
    status: number;
    details?: unknown;

    constructor(
        status: number,
        message: string,
        details?: unknown,
    ) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

export class UnauthorizedError extends HttpError {
    constructor(message = 'Unauthorized', options?: { cause?: unknown }) {
        super(401, message);
        this.cause = options?.cause;
    }
}

export class ForbiddenError extends HttpError {
    constructor(message = 'Forbidden') {
        super(403, message);
    }
}