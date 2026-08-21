import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const fixturePath = path.join(__dirname, 'fixtures', 'parallel-users.json');
    const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    const { baseUrl, eventId, capacity, users } = fixtureData;

    console.log(`Starting concurrency test...`);
    console.log(`Targeting event: ${eventId} (Capacity: ${capacity})`);
    console.log(`Firing ${users.length} simultaneous POST requests...\n`);

    const requests = users.map((user: { userId: string; token: string }) => {
        return fetch(`${baseUrl}/v1/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': user.userId, // Controller currently reads from this header
            },
            body: JSON.stringify({ eventId })
        }).then(res => res.status)
          .catch(err => {
              console.error(`Request failed for user ${user.userId}:`, err.message);
              return 500; // Treat fetch failures as 500
          });
    });

    // Fire all requests simultaneously
    const statuses = await Promise.all(requests);

    // Tally the results
    const tally: Record<number, number> = {};
    for (const status of statuses) {
        tally[status] = (tally[status] || 0) + 1;
    }

    console.log('--- Results Tally ---');
    for (const [status, count] of Object.entries(tally)) {
        console.log(`HTTP ${status}: ${count}`);
    }
    console.log('---------------------\n');

    const confirmedCount = tally[201] || 0;

    if (confirmedCount > capacity) {
        console.error(`❌ FAIL: Oversell detected! Expected max ${capacity} confirmed bookings, but got ${confirmedCount}.`);
        process.exit(1);
    } else {
        console.log(`✅ PASS: Capacity check held. Only ${confirmedCount} bookings confirmed.`);
        process.exit(0);
    }
}

run().catch(err => {
    console.error("Script error:", err);
    process.exit(1);
});
