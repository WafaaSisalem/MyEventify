import { createServer } from 'node:http';
import type { Event } from "./domain.ts";
const events: Event[] = [
    {
        id: "evt-1",
        title: "JS 101",
        description: "JavaScript from zero ceremony",
        venue: "Room 4",
        startsAt: new Date("2026-09-14T18:00:00Z"),
        capacity: 30,
        priceCents: 0,
        organizerId: "usr-1",
        createdAt: new Date("2026-08-01T09:00:00Z"),
    },
    {
        id: "evt-2",
        title: "TS at Work",
        description: "Types that earn their keep",
        venue: null,
        startsAt: new Date("2026-09-21T18:00:00Z"),
        capacity: 80,
        priceCents: 1500,
        organizerId: "usr-1",
        createdAt: new Date("2026-08-01T09:05:00Z"),
    },
    {
        id: "evt-3",
        title: "Node Deep Dive",
        description: "The event loop, for real",
        venue: "Main Hall",
        startsAt: new Date("2026-10-02T18:00:00Z"),
        capacity: 25,
        priceCents: 2500,
        organizerId: "usr-2",
        createdAt: new Date("2026-08-02T10:00:00Z"),
    },
    {
        id: "evt-4",
        title: "API Design Live",
        description: "Endpoints designed in the open",
        venue: "Main Hall",
        startsAt: new Date("2026-11-20T18:00:00Z"),
        capacity: 125,
        priceCents: 0,
        organizerId: "usr-2",
        createdAt: new Date("2026-08-03T11:00:00Z"),
    },
];
const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "healthy", timestamp: process.uptime() }))
        return;
    }
    if (req.method === 'GET' && req.url === '/events') {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(events));
        return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
});
server.listen(3000, () => {
    console.log("Server running at http://localhost:3000")
});