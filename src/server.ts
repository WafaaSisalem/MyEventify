import { createServer } from 'node:http';
const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "healthy", timestamp: process.uptime() }))
        return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
});
server.listen(3000, () => {
    console.log("Server running at http://localhost:3000")
});