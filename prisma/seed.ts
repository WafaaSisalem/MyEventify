import { prisma } from "../src/infra/db.ts";

async function main() {
    console.log("Seeding database...");

    // 1. Upsert base users (ORGANIZER, ADMIN, ATTENDEE)
    // UUIDv7 placeholders for deterministic seeding
    const organizerId = "0194bc00-0000-7000-0000-000000000001";
    const adminId = "0194bc00-0000-7000-0000-000000000002";
    const attendeeId = "0194bc00-0000-7000-0000-000000000003";

    await prisma.user.upsert({
        where: { email: "org@example.com" },
        update: {},
        create: { id: organizerId, email: "org@example.com", name: "Organizer User", role: "ORGANIZER" }
    });
    await prisma.user.upsert({
        where: { email: "admin@example.com" },
        update: {},
        create: { id: adminId, email: "admin@example.com", name: "Admin User", role: "ADMIN" }
    });
    await prisma.user.upsert({
        where: { email: "attendee@example.com" },
        update: {},
        create: { id: attendeeId, email: "attendee@example.com", name: "Standard Attendee", role: "ATTENDEE" }
    });

    // 2. Upsert 20 additional test users for concurrency tests
    for (let i = 1; i <= 20; i++) {
        const id = `0194bc00-0000-7000-0000-0000000001${i.toString().padStart(2, '0')}`;
        await prisma.user.upsert({
            where: { email: `testuser${i}@example.com` },
            update: {},
            create: { id, email: `testuser${i}@example.com`, name: `Concurrency Tester ${i}`, role: "ATTENDEE" }
        });
    }

    // 3. Upsert 5 Events
    const concurrencyEventId = "0194bc00-0000-7000-0000-000000000201";
    
    // The capacity: 5 event specifically for testing
    await prisma.event.upsert({
        where: { id: concurrencyEventId },
        update: { capacity: 5 }, // Ensure capacity is exactly 5 on re-runs
        create: {
            id: concurrencyEventId,
            title: "Concurrency Test Event",
            description: "An event explicitly limited to 5 attendees for testing concurrency limits.",
            venue: "Server Room",
            startsAt: new Date(Date.now() + 86400000 * 5),
            capacity: 5,
            priceCents: 0,
            organizerId
        }
    });

    // 4 additional regular events
    for (let i = 2; i <= 5; i++) {
        const eventId = `0194bc00-0000-7000-0000-00000000020${i}`;
        await prisma.event.upsert({
            where: { id: eventId },
            update: {},
            create: {
                id: eventId,
                title: `Tech Conference ${i}`,
                description: `Description for tech conference ${i}`,
                venue: "Convention Center",
                startsAt: new Date(Date.now() + 86400000 * (10 + i)),
                capacity: 100,
                priceCents: 5000 * i,
                organizerId
            }
        });
    }

    // 4. Sample bookings (not touching the concurrency event to keep it pristine)
    const sampleEventId = "0194bc00-0000-7000-0000-000000000202";
    await prisma.booking.upsert({
        where: { userId_eventId: { userId: attendeeId, eventId: sampleEventId } },
        update: {},
        create: {
            userId: attendeeId,
            eventId: sampleEventId,
            status: "CONFIRMED"
        }
    });

    console.log("Database seeded successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
