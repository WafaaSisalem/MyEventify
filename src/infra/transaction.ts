import type { Prisma } from "../generated/prisma/client.ts";
import { prisma } from "./db.ts";

export async function runSerializable<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: "Serializable",
      });
    } catch (error: unknown) {
      const err = error as { code?: string } | null | undefined;
      if (err?.code === "P2034") {
        attempt++;
        if (attempt >= MAX_RETRIES) {
          throw error;
        }
        continue;
      }
      throw error;
    }
  }

  throw new Error("Transaction failed after max retries");
}
