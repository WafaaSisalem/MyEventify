import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { SignupSchema, LoginSchema } from "../auth/auth.schema.ts";
import { CreateBookingSchema } from "../bookings/bookings.schema.ts";
import {
  CreateEventSchema,
  EventQuerySchema,
  UpdateEventSchema,
} from "../events/events.schema.ts";
import { UuidParamSchema } from "../middleware/validate.ts";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Access token returned by the login or refresh endpoint.",
});

const refreshCookie = registry.registerComponent(
  "securitySchemes",
  "refreshCookie",
  {
    type: "apiKey",
    in: "cookie",
    name: "refresh_token",
    description:
      "HttpOnly refresh cookie set by login and rotated by the refresh endpoint.",
  },
);

const SignupInputSchema = registry.register(
  "SignupInput",
  SignupSchema.meta({
    id: "SignupInput",
    example: {
      email: "attendee@example.com",
      password: "strong-password-123",
      name: "Amina Khalil",
    },
  }),
);
const LoginInputSchema = registry.register(
  "LoginInput",
  LoginSchema.meta({
    id: "LoginInput",
    example: {
      email: "attendee@example.com",
      password: "strong-password-123",
    },
  }),
);
const CreateEventInputSchema = registry.register(
  "CreateEventInput",
  CreateEventSchema.extend({
    startsAt: z.iso.datetime({ offset: true }),
  }).meta({
    id: "CreateEventInput",
    example: {
      title: "Backend Workshop",
      description: "A practical workshop about backend development.",
      venue: "Room 101",
      startsAt: "2030-06-01T10:00:00.000Z",
      capacity: 25,
      priceCents: 2500,
    },
  }),
);
const UpdateEventInputSchema = registry.register(
  "UpdateEventInput",
  UpdateEventSchema.extend({
    startsAt: z.iso.datetime({ offset: true }).optional(),
  }).meta({
    id: "UpdateEventInput",
    example: {
      title: "Advanced Backend Workshop",
      capacity: 30,
    },
  }),
);
const EventQueryParametersSchema = registry.register(
  "EventQueryParameters",
  EventQuerySchema.extend({
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
  }).meta({ id: "EventQueryParameters" }),
);
const CreateBookingInputSchema = registry.register(
  "CreateBookingInput",
  CreateBookingSchema.meta({
    id: "CreateBookingInput",
    example: { eventId: "019582f0-7210-7000-8000-000000000001" },
  }),
);
const IdParameterSchema = registry.register(
  "IdParameter",
  UuidParamSchema.meta({ id: "IdParameter" }),
);

const RoleSchema = registry.register(
  "Role",
  z.enum(["ATTENDEE", "ORGANIZER", "ADMIN"]),
);

const BookingStatusSchema = registry.register(
  "BookingStatus",
  z.enum(["CONFIRMED", "CANCELLED", "WAITLISTED"]),
);

const UserSchema = registry.register(
  "User",
  z.strictObject({
    id: z.uuid(),
    email: z.email(),
    name: z.string(),
    role: RoleSchema,
    createdAt: z.iso.datetime(),
  }).meta({
    example: {
      id: "019582f0-7210-7000-8000-000000000002",
      email: "attendee@example.com",
      name: "Amina Khalil",
      role: "ATTENDEE",
      createdAt: "2030-01-15T09:30:00.000Z",
    },
  }),
);

const EventSchema = registry.register(
  "Event",
  z.strictObject({
    id: z.uuid(),
    title: z.string(),
    description: z.string(),
    venue: z.string().nullable(),
    startsAt: z.iso.datetime(),
    capacity: z.number().int().positive(),
    priceCents: z.number().int().nonnegative(),
    organizerId: z.uuid(),
    createdAt: z.iso.datetime(),
  }).meta({
    example: {
      id: "019582f0-7210-7000-8000-000000000001",
      title: "Backend Workshop",
      description: "A practical workshop about backend development.",
      venue: "Room 101",
      startsAt: "2030-06-01T10:00:00.000Z",
      capacity: 25,
      priceCents: 2500,
      organizerId: "019582f0-7210-7000-8000-000000000003",
      createdAt: "2030-01-15T10:00:00.000Z",
    },
  }),
);

const BookingSchema = registry.register(
  "Booking",
  z.strictObject({
    id: z.uuid(),
    userId: z.uuid(),
    eventId: z.uuid(),
    status: BookingStatusSchema,
    createdAt: z.iso.datetime(),
  }).meta({
    example: {
      id: "019582f0-7210-7000-8000-000000000004",
      userId: "019582f0-7210-7000-8000-000000000002",
      eventId: "019582f0-7210-7000-8000-000000000001",
      status: "CONFIRMED",
      createdAt: "2030-01-15T10:05:00.000Z",
    },
  }),
);

const EventListSchema = registry.register(
  "EventList",
  z.strictObject({
    data: z.array(EventSchema),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().nonnegative(),
  }),
);

const AccessTokenSchema = registry.register(
  "AccessToken",
  z.strictObject({
    accessToken: z.string(),
  }).meta({
    example: { accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
  }),
);

const HealthSchema = registry.register(
  "Health",
  z.strictObject({
    status: z.literal("ok"),
    uptime: z.number().nonnegative(),
  }),
);

const ErrorSchema = registry.register(
  "Error",
  z.strictObject({
    error: z.string(),
  }),
);

const ValidationIssueSchema = registry.register(
  "ValidationIssue",
  z
    .object({
      origin: z.string().optional(),
      code: z.string(),
      format: z.string().optional(),
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      inclusive: z.boolean().optional(),
      path: z.array(z.union([z.string(), z.number()])),
      message: z.string(),
    })
    .catchall(z.unknown()),
);

const ValidationErrorSchema = registry.register(
  "ValidationError",
  z.strictObject({
    error: z.enum(["Validation failed", "Invalid route parameters"]),
    details: z.array(ValidationIssueSchema),
  }),
);

const jsonContent = (schema: z.ZodType) => ({
  "application/json": { schema },
});

type ErrorExamples = Record<
  string,
  {
    summary: string;
    value: {
      error: string;
      details?: unknown;
    };
  }
>;

type ErrorExample = ErrorExamples[string];

const bodyValidationExample: ErrorExample = {
  summary: "A request field failed validation",
  value: {
    error: "Validation failed",
    details: [
      {
        origin: "string",
        code: "too_small",
        minimum: 12,
        inclusive: true,
        path: ["password"],
        message: "Too small: expected string to have >=12 characters",
      },
    ],
  },
};

const invalidIdExample: ErrorExample = {
  summary: "The path ID is not a UUID",
  value: {
    error: "Invalid route parameters",
    details: [
      {
        origin: "string",
        code: "invalid_format",
        format: "uuid",
        path: ["id"],
        message: "Invalid ID format",
      },
    ],
  },
};

const errorResponse = (
  description: string,
  examples: ErrorExamples,
  schema: z.ZodType = ErrorSchema,
) => ({
  description,
  content: {
    "application/json": {
      schema,
      examples,
    },
  },
});

const bodyValidationError = errorResponse(
  "The request body failed validation.",
  {
    validationFailed: bodyValidationExample,
  },
  ValidationErrorSchema,
);

const queryValidationError = errorResponse(
  "One or more query parameters are invalid.",
  {
    invalidPage: {
      summary: "A query parameter failed validation",
      value: {
        error: "Validation failed",
        details: [
          {
            origin: "number",
            code: "too_small",
            minimum: 1,
            inclusive: true,
            path: ["page"],
            message: "Too small: expected number to be >=1",
          },
        ],
      },
    },
  },
  ValidationErrorSchema,
);

const idValidationError = errorResponse(
  "The path ID is not a valid UUID.",
  {
    invalidId: invalidIdExample,
  },
  ValidationErrorSchema,
);

const authError = errorResponse(
  "The access token is missing, invalid, or expired.",
  {
    missingToken: {
      summary: "No bearer token was provided",
      value: { error: "Missing token" },
    },
    invalidToken: {
      summary: "The bearer token is invalid or expired",
      value: { error: "Invalid or expired token" },
    },
  },
);

const forbiddenError = errorResponse(
  "The authenticated user does not have the required permission.",
  {
    forbidden: {
      summary: "The user lacks permission for this operation",
      value: { error: "Forbidden" },
    },
  },
);

const rateLimitError = errorResponse(
  "The request rate limit was exceeded.",
  {
    tooManyRequests: {
      summary: "Too many requests were sent in the current window",
      value: { error: "Too many requests" },
    },
  },
);

const internalServerError = errorResponse(
  "An unexpected server error occurred.",
  {
    internalServerError: {
      summary: "Unexpected server failure",
      value: { error: "Internal server error" },
    },
  },
);

registry.registerPath({
  method: "post",
  path: "/v1/auth/signup",
  tags: ["Auth"],
  operationId: "signup",
  summary: "Create an attendee account",
  request: {
    body: {
      required: true,
      content: jsonContent(SignupInputSchema),
    },
  },
  responses: {
    201: {
      description: "Account created. The password is never returned.",
      content: jsonContent(UserSchema),
    },
    400: bodyValidationError,
    409: errorResponse("An account with this email cannot be created.", {
      accountConflict: {
        summary: "The email is already registered",
        value: { error: "Unable to create account" },
      },
    }),
    500: internalServerError,
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/auth/login",
  tags: ["Auth"],
  operationId: "login",
  summary: "Log in and receive access and refresh credentials",
  description:
    "Returns a short-lived access token and sets an HttpOnly `refresh_token` cookie.",
  request: {
    body: {
      required: true,
      content: jsonContent(LoginInputSchema),
    },
  },
  responses: {
    200: {
      description: "Login succeeded.",
      headers: {
        "Set-Cookie": {
          description: "HttpOnly refresh token cookie scoped to `/v1/auth/refresh`.",
          schema: { type: "string" },
        },
      },
      content: jsonContent(AccessTokenSchema),
    },
    400: bodyValidationError,
    401: errorResponse("The email or password is invalid.", {
      invalidCredentials: {
        summary: "The email or password is incorrect",
        value: { error: "Invalid credentials" },
      },
    }),
    429: rateLimitError,
    500: internalServerError,
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/auth/refresh",
  tags: ["Auth"],
  operationId: "refreshAccessToken",
  summary: "Rotate the refresh token",
  description:
    "Uses the HttpOnly refresh cookie, revokes it, and returns a new access token and refresh cookie.",
  security: [{ [refreshCookie.name]: [] }],
  responses: {
    200: {
      description: "Token rotation succeeded.",
      headers: {
        "Set-Cookie": {
          description: "New HttpOnly refresh token cookie.",
          schema: { type: "string" },
        },
      },
      content: jsonContent(AccessTokenSchema),
    },
    401: errorResponse(
      "The refresh token is missing, expired, invalid, or reused.",
      {
        invalidRefreshToken: {
          summary: "The refresh cookie is missing, invalid, or expired",
          value: { error: "Invalid or expired refresh token" },
        },
        reusedRefreshToken: {
          summary: "A revoked refresh token was reused",
          value: {
            error: "Refresh token has been revoked (potential token theft)",
          },
        },
      },
    ),
    500: internalServerError,
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/events",
  tags: ["Events"],
  operationId: "listEvents",
  summary: "List and filter events",
  request: { query: EventQueryParametersSchema },
  responses: {
    200: {
      description: "A paginated event list.",
      content: jsonContent(EventListSchema),
    },
    400: queryValidationError,
    500: internalServerError,
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/events",
  tags: ["Events"],
  operationId: "createEvent",
  summary: "Create an event",
  description: "Requires an ORGANIZER or ADMIN access token.",
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      required: true,
      content: jsonContent(CreateEventInputSchema),
    },
  },
  responses: {
    201: {
      description: "Event created.",
      content: jsonContent(EventSchema),
    },
    400: bodyValidationError,
    401: authError,
    403: forbiddenError,
    500: internalServerError,
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/events/{id}",
  tags: ["Events"],
  operationId: "getEvent",
  summary: "Retrieve an event",
  request: { params: IdParameterSchema },
  responses: {
    200: {
      description: "The requested event.",
      content: jsonContent(EventSchema),
    },
    400: idValidationError,
    404: errorResponse("The event does not exist.", {
      eventNotFound: {
        summary: "No event exists for the supplied ID",
        value: { error: "Event not found" },
      },
    }),
    500: internalServerError,
  },
});

registry.registerPath({
  method: "patch",
  path: "/v1/events/{id}",
  tags: ["Events"],
  operationId: "updateEvent",
  summary: "Update an event",
  description: "Requires the event owner or an ADMIN access token.",
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: IdParameterSchema,
    body: {
      required: true,
      content: jsonContent(UpdateEventInputSchema),
    },
  },
  responses: {
    200: {
      description: "Event updated.",
      content: jsonContent(EventSchema),
    },
    400: errorResponse(
      "The event ID or request body failed validation.",
      {
        invalidId: invalidIdExample,
        invalidBody: bodyValidationExample,
      },
      ValidationErrorSchema,
    ),
    401: authError,
    403: forbiddenError,
    404: errorResponse("The event does not exist.", {
      eventNotFound: {
        summary: "No event exists for the supplied ID",
        value: { error: "Event not found" },
      },
    }),
    500: internalServerError,
  },
});

registry.registerPath({
  method: "delete",
  path: "/v1/events/{id}",
  tags: ["Events"],
  operationId: "deleteEvent",
  summary: "Delete an event",
  description: "Requires the event owner or an ADMIN access token.",
  security: [{ [bearerAuth.name]: [] }],
  request: { params: IdParameterSchema },
  responses: {
    204: { description: "Event deleted." },
    400: idValidationError,
    401: authError,
    403: forbiddenError,
    404: errorResponse("The event does not exist.", {
      eventNotFound: {
        summary: "No event exists for the supplied ID",
        value: { error: "Event not found" },
      },
    }),
    500: internalServerError,
  },
});

registry.registerPath({
  method: "post",
  path: "/v1/bookings",
  tags: ["Bookings"],
  operationId: "createBooking",
  summary: "Book a seat or join the waitlist",
  description:
    "Creates a CONFIRMED booking when capacity is available, otherwise a WAITLISTED booking.",
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      required: true,
      content: jsonContent(CreateBookingInputSchema),
    },
  },
  responses: {
    201: {
      description: "Booking created or restored.",
      content: jsonContent(BookingSchema),
    },
    400: bodyValidationError,
    401: authError,
    404: errorResponse("The selected event does not exist.", {
      eventNotFound: {
        summary: "No event exists for the supplied eventId",
        value: { error: "Event not found" },
      },
    }),
    409: errorResponse("The booking conflicts with its current state.", {
      duplicateBooking: {
        summary: "The user already has a confirmed booking",
        value: { error: "Duplicate booking" },
      },
      alreadyWaitlisted: {
        summary: "The user is already on the waitlist",
        value: { error: "User is already waitlisted" },
      },
      fullRebooking: {
        summary: "A cancelled booking cannot be restored because the event is full",
        value: { error: "Event is full" },
      },
    }),
    429: rateLimitError,
    500: internalServerError,
  },
});

registry.registerPath({
  method: "get",
  path: "/v1/bookings/{id}",
  tags: ["Bookings"],
  operationId: "getBooking",
  summary: "Retrieve a booking",
  description: "Requires the booking owner or an ADMIN access token.",
  security: [{ [bearerAuth.name]: [] }],
  request: { params: IdParameterSchema },
  responses: {
    200: {
      description: "The requested booking.",
      content: jsonContent(BookingSchema),
    },
    400: idValidationError,
    401: authError,
    403: forbiddenError,
    404: errorResponse("The booking does not exist.", {
      bookingNotFound: {
        summary: "No booking exists for the supplied ID",
        value: { error: "Booking not found" },
      },
    }),
    500: internalServerError,
  },
});

registry.registerPath({
  method: "delete",
  path: "/v1/bookings/{id}",
  tags: ["Bookings"],
  operationId: "cancelBooking",
  summary: "Cancel a booking",
  description: "Requires the booking owner or an ADMIN access token.",
  security: [{ [bearerAuth.name]: [] }],
  request: { params: IdParameterSchema },
  responses: {
    204: { description: "Booking cancelled." },
    400: idValidationError,
    401: authError,
    403: forbiddenError,
    404: errorResponse("The booking does not exist.", {
      bookingNotFound: {
        summary: "No booking exists for the supplied ID",
        value: { error: "Booking not found" },
      },
    }),
    500: internalServerError,
  },
});

registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["Health"],
  operationId: "healthCheck",
  summary: "Check API and PostgreSQL health",
  responses: {
    200: {
      description: "The API and its PostgreSQL connection are healthy.",
      content: jsonContent(HealthSchema),
    },
    500: internalServerError,
  },
});

const generator = new OpenApiGeneratorV31(registry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: "3.1.0",
  info: {
    title: "Eventify API",
    version: "1.0.0",
    description:
      "REST API for authentication, event management, bookings, and waitlists.",
  },
  servers: [
    {
      url: "/",
      description: "The same host serving this documentation",
    },
  ],
  tags: [
    { name: "Auth", description: "Registration and token lifecycle" },
    { name: "Events", description: "Event discovery and management" },
    { name: "Bookings", description: "Seat booking and cancellation" },
    { name: "Health", description: "Service health" },
  ],
});
