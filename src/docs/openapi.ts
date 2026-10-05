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
    details: z.unknown().optional(),
  }),
);

const jsonContent = (schema: z.ZodType) => ({
  "application/json": { schema },
});

const errorResponse = (description: string) => ({
  description,
  content: jsonContent(ErrorSchema),
});

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
    400: errorResponse("The request body failed validation."),
    409: errorResponse("An account with this email cannot be created."),
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
    400: errorResponse("The request body failed validation."),
    401: errorResponse("The email or password is invalid."),
    429: errorResponse("Too many login attempts."),
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
    401: errorResponse("The refresh token is missing, expired, invalid, or reused."),
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
    400: errorResponse("One or more query parameters are invalid."),
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
    400: errorResponse("The request body failed validation."),
    401: errorResponse("The access token is missing, invalid, or expired."),
    403: errorResponse("The authenticated user cannot create events."),
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
    400: errorResponse("The event ID is not a valid UUID."),
    404: errorResponse("The event does not exist."),
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
    400: errorResponse("The event ID or request body is invalid."),
    401: errorResponse("The access token is missing, invalid, or expired."),
    403: errorResponse("Only the event owner or an admin can update it."),
    404: errorResponse("The event does not exist."),
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
    400: errorResponse("The event ID is not a valid UUID."),
    401: errorResponse("The access token is missing, invalid, or expired."),
    403: errorResponse("Only the event owner or an admin can delete it."),
    404: errorResponse("The event does not exist."),
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
    400: errorResponse("The request body failed validation."),
    401: errorResponse("The access token is missing, invalid, or expired."),
    404: errorResponse("The selected event does not exist."),
    409: errorResponse("The booking is duplicated or already waitlisted."),
    429: errorResponse("Too many booking attempts."),
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
    400: errorResponse("The booking ID is not a valid UUID."),
    401: errorResponse("The access token is missing, invalid, or expired."),
    403: errorResponse("Only the booking owner or an admin can read it."),
    404: errorResponse("The booking does not exist."),
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
    400: errorResponse("The booking ID is not a valid UUID."),
    401: errorResponse("The access token is missing, invalid, or expired."),
    403: errorResponse("Only the booking owner or an admin can cancel it."),
    404: errorResponse("The booking does not exist."),
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
    500: errorResponse("The health check failed."),
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
