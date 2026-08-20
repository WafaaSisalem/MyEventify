import express from "express";
export { app };
import { HttpError } from "./errors/http-error.ts";
import eventsRouter from "./events/events.routes.ts";
import {
    type Request,
    type Response,
    type NextFunction,
} from "express";
const app = express();
app.use(express.json());

app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});

app.use("/v1", eventsRouter);
app.get("/health", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: process.uptime() });
});


app.get("/boom", async (_req, _res) => {
    throw new Error("Something went wrong");
});
app.use((_req, _res) => {
    throw new HttpError(404, "Route not found");
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
        return res.status(err.status).json({
            error: err.message,
            details: err.details,
        });
    }

    console.error(err);

    res.status(500).json({
        error: "Internal server error",
    });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});