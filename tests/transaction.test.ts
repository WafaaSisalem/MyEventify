import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../src/infra/db.ts", () => ({ prisma: { $transaction: vi.fn() } }));
import { prisma } from "../src/infra/db.ts";
import { runSerializable } from "../src/infra/transaction.ts";

describe("runSerializable", () => {
  const transaction = vi.mocked(prisma.$transaction);
  beforeEach(() => vi.resetAllMocks());

  it("uses Serializable and returns the transaction result", async () => {
    const operation = vi.fn();
    transaction.mockResolvedValueOnce("saved");
    await expect(runSerializable(operation)).resolves.toBe("saved");
    expect(transaction).toHaveBeenCalledWith(operation, {
      isolationLevel: "Serializable",
    });
  });

  it("retries conflicts and succeeds on the third total attempt", async () => {
    transaction.mockRejectedValueOnce({ code: "P2034" })
      .mockRejectedValueOnce({ code: "P2034" }).mockResolvedValueOnce("saved");
    await expect(runSerializable(vi.fn())).resolves.toBe("saved");
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it("throws the final conflict after exactly three attempts", async () => {
    const conflict = Object.assign(new Error("conflict"), { code: "P2034" });
    transaction.mockRejectedValue(conflict);
    await expect(runSerializable(vi.fn())).rejects.toBe(conflict);
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it.each([Object.assign(new Error("duplicate"), { code: "P2002" }),
  new Error("database unavailable"), null])("does not retry another error: %s", async (error) => {
    transaction.mockRejectedValueOnce(error);
    await expect(runSerializable(vi.fn())).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
