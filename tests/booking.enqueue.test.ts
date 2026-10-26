import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../src/jobs/email.queue.ts", () => ({ emailQueue: { add: vi.fn() } }));
vi.mock("../src/jobs/promotion.queue.ts", () => ({ promotionQueue: { add: vi.fn() } }));
import { emailQueue } from "../src/jobs/email.queue.ts";
import { promotionQueue } from "../src/jobs/promotion.queue.ts";
import { logger } from "../src/infra/logger.ts";
import { runWithLogger } from "../src/infra/logger-context.ts";
import { enqueueConfirmation, enqueuePromotion } from "../src/jobs/booking.enqueue.ts";

describe("booking job handoff", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("sends the existing job names and payloads", async () => {
    await enqueueConfirmation("booking-1", "event-1");
    await enqueuePromotion("booking-1", "event-1");
    expect(emailQueue.add).toHaveBeenCalledWith("confirmation", { bookingId: "booking-1" });
    expect(promotionQueue.add).toHaveBeenCalledWith("promote", { eventId: "event-1" });
  });

  it("uses the request context logger when a logger is not supplied", async () => {
    const requestLog = logger.child({ requestId: "unit-request" });
    const error = vi.spyOn(requestLog, "error");
    vi.mocked(emailQueue.add).mockRejectedValueOnce(new Error("redis://secret@host"));
    await expect(runWithLogger(requestLog, () => enqueueConfirmation("b", "e")))
      .resolves.toBeUndefined();
    expect(requestLog.bindings()).toMatchObject({ requestId: "unit-request" });
    expect(error).toHaveBeenCalledWith({
      jobType: "confirmation", bookingId: "b", eventId: "e", errorType: "Error",
    }, "background job enqueue failed");
    expect(JSON.stringify(error.mock.calls)).not.toContain("secret");
    expect(emailQueue.add).toHaveBeenCalledTimes(1);
  });

  it("logs promotion handoff failure once and does not reject", async () => {
    const log = logger.child({ jobId: "unit-promotion-job" });
    const error = vi.spyOn(log, "error");
    vi.mocked(promotionQueue.add).mockRejectedValueOnce(new Error("unavailable"));
    await expect(enqueuePromotion("b", "e", log)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith({
      jobType: "promote", bookingId: "b", eventId: "e", errorType: "Error",
    }, "background job enqueue failed");
    expect(promotionQueue.add).toHaveBeenCalledTimes(1);
  });
});
