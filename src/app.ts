import express from "express";
import { HttpError } from "./errors/http-error.ts";
import eventsRouter from "./events/events.routes.ts";
import bookingsRouter from "./bookings/bookings.routes.ts";
import authRouter from "./auth/auth.routes.ts";
import { type Request, type Response, type NextFunction } from "express";
import { prisma } from "./infra/db.ts";
import { requestLogger } from "./middleware/request-logger.ts";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./docs/openapi.ts";
export const app = express();
app.use(requestLogger);
app.use(express.json({ limit: "100kb" }));

app.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customCss: "",
    customSiteTitle: "Eventify API Docs",
    swaggerOptions: {
      persistAuthorization: false,
      displayRequestDuration: true,
      withCredentials: true,
    },
  }),
);

app.use("/v1/auth", authRouter);
app.use("/v1/events", eventsRouter);
app.use("/v1/bookings", bookingsRouter);
app.get('/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;

  res.json({
    status: 'ok',
    uptime: process.uptime(),
  });
});

app.use((_req, _res) => {
  throw new HttpError(404, "Route not found");
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      details: err.details,
    });
  }

  req.log.error(
    { errorType: err instanceof Error ? err.name : "UnknownError" },
    "unhandled request error",
  );

  res.status(500).json({
    error: "Internal server error",
  });
});
