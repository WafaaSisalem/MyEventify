import { prisma } from '../infra/db.ts';
import type { User } from '../generated/prisma/client.ts';

export async function findByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function create(data: {
  email: string;
  password: string;
  name: string;
}) {
  return prisma.user.create({
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function storeRefreshToken(tokenHash: string, userId: string, expiresAt: Date) {
  return prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });
}

export async function findRefreshToken(tokenHash: string) {
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

export async function rotateRefreshToken(oldTokenHash: string, newTokenHash: string, userId: string, expiresAt: Date) {
  return prisma.$transaction(async (tx) => {
    // 1. Create the new token
    const newRow = await tx.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId,
        expiresAt,
      }
    });

    // 2. Revoke the old token and link to the new one
    await tx.refreshToken.update({
      where: { tokenHash: oldTokenHash },
      data: {
        revokedAt: new Date(),
        replacedById: newRow.id,
      }
    });

    return newRow;
  });
}

export async function revokeAllUserTokens(userId: string) {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
