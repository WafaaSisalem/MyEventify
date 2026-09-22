// Manual verification script. Requires the API, Redis, database, and seeded
// data to be ready before running.
const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const email = process.env.RATE_LIMIT_EMAIL ?? "attendee@example.com";
const password = process.env.RATE_LIMIT_PASSWORD ?? "password123";
const eventId =
  process.env.RATE_LIMIT_EVENT_ID ??
  "0194bc00-0000-7000-8000-000000000202";
const windowMs = 61_000;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function login() {
  return fetch(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

async function createBooking(accessToken: string) {
  return fetch(`${baseUrl}/v1/bookings`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ eventId }),
  });
}

function countStatus(statuses: number[], status: number) {
  return statuses.filter((value) => value === status).length;
}

async function main() {
  console.log("Testing login limiter: 5 requests per IP per 60 seconds...");

  const loginBurst = await Promise.all(
    Array.from({ length: 6 }, async () => (await login()).status),
  );

  console.log("Login burst statuses:", loginBurst);
  assert(
    countStatus(loginBurst, 429) === 1,
    `Expected exactly one login 429, received: ${loginBurst.join(", ")}`,
  );

  console.log("Waiting for the login rate-limit window to recover...");
  await new Promise((resolve) => setTimeout(resolve, windowMs));

  const recoveredLogin = await login();
  assert(
    recoveredLogin.status !== 429,
    "Login was still rate-limited after the window expired",
  );

  const loginBody = (await recoveredLogin.json()) as { accessToken?: string };
  assert(loginBody.accessToken, "Recovered login did not return an access token");

  console.log("Testing booking limiter: 3 requests per user per 60 seconds...");

  const bookingBurst = await Promise.all(
    Array.from(
      { length: 4 },
      async () => (await createBooking(loginBody.accessToken!)).status,
    ),
  );

  console.log("Booking burst statuses:", bookingBurst);
  assert(
    countStatus(bookingBurst, 429) === 1,
    `Expected exactly one booking 429, received: ${bookingBurst.join(", ")}`,
  );

  console.log("Waiting for the booking rate-limit window to recover...");
  await new Promise((resolve) => setTimeout(resolve, windowMs));

  const recoveredBooking = await createBooking(loginBody.accessToken);
  assert(
    recoveredBooking.status !== 429,
    "Booking was still rate-limited after the window expired",
  );

  console.log(
    JSON.stringify({
      loginBurst,
      recoveredLogin: recoveredLogin.status,
      bookingBurst,
      recoveredBooking: recoveredBooking.status,
      result: "PASS",
    }),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
