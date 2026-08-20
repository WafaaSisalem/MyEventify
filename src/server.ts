import { createServer } from 'node:http';
import type { Event } from "./domain.ts";
import { readFile } from "node:fs/promises";
import { findById } from './domain.ts';
async function loadEvents(): Promise<Event[]> {
    const file = await readFile("data/events.json", "utf-8");
    return JSON.parse(file);
}

const server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "healthy", timestamp: process.uptime() }))
        return;
    }
    if (req.method === 'GET' && req.url === '/events') {
        try {
            const events = await loadEvents();

            res.writeHead(200, { "content-type": "application/json" });

            res.end(JSON.stringify(events));
        } catch (err) {
            console.error(err);
            res.writeHead(500, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
        return;
    }
    if (req.method === "GET" && req.url?.startsWith("/events/")) {
        try {
            const events = await loadEvents();

            const id = req.url.split("/")[2];
            if (typeof id === "string") {
                const event = findById(events, id);

                if (!event) {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(JSON.stringify({ error: "Event not found" }));
                    return;
                }

                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify(event));
            }
        } catch (err) {
            console.error(err);

            res.writeHead(500, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }

        return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
});
server.listen(3000, () => {
    console.log("Server running at http://localhost:3000")
});