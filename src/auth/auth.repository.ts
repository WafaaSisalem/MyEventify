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
