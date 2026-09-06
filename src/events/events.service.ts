import type {
  CreateEventInput,
  UpdateEventInput,
  EventQuery,
} from "./events.schema.ts";

import type { Prisma, Event } from "../generated/prisma/client.ts";
import * as eventsRepo from "./events.repository.ts";
import { ForbiddenError } from "../errors/http-error.ts";
import { cache } from "../infra/cache.ts";

export async function createEvent(
  input: CreateEventInput,
  organizerId: string,
) {
  const event = await eventsRepo.save({
    organizerId,
    ...input,
  });

  // Invalidate all cached event lists
  await cache.incr("eventify:events:list:v");

  return event;
}

export async function listEvents(query: EventQuery = {}) {
  const { page = 1, limit = 20, venue, from, to, sort } = query;

  const version = (await cache.get<number>("eventify:events:list:v")) ?? 0;

  const cacheKey = [
    "eventify:events:list",
    version,
    `page=${page}`,
    `limit=${limit}`,
    `venue=${venue ?? ""}`,
    `from=${from?.toISOString() ?? ""}`,
    `to=${to?.toISOString() ?? ""}`,
    `sort=${sort ?? ""}`,
  ].join(":");

  const cached = await cache.get<{
    data: Event[];
    page: number;
    limit: number;
    total: number;
  }>(cacheKey);

  if (cached) {
    return cached;
  }

  const where: Prisma.EventWhereInput = {};

  if (venue) {
    where.venue = venue;
  }

  if (from || to) {
    where.startsAt = {};

    if (from) {
      where.startsAt.gte = from;
    }

    if (to) {
      where.startsAt.lte = to;
    }
  }

  const orderBy: Prisma.EventOrderByWithRelationInput = {};

  if (sort === "startsAt:asc") {
    orderBy.startsAt = "asc";
  } else if (sort === "startsAt:desc") {
    orderBy.startsAt = "desc";
  }

  const startIndex = (page - 1) * limit;

  const [data, total] = await Promise.all([
    eventsRepo.findMany({
      where,
      orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
      skip: startIndex,
      take: limit,
    }),

    eventsRepo.count({ where }),
  ]);

  const result = {
    data,
    page,
    limit,
    total,
  };

  const jitter = Math.floor(Math.random() * 15);

  await cache.set(cacheKey, result, 60 + jitter);

  return result;
}

export async function getEvent(id: string) {
  const key = `eventify:event:${id}`;

  const cached = await cache.get<Event>(key);

  if (cached) {
    return cached;
  }

  const event = await eventsRepo.findById(id);

  if (!event) {
    return null;
  }

  const eventTTL = 3600;

  const jitter = Math.floor(Math.random() * 15);

  await cache.set(key, event, eventTTL + jitter);

  return event;
}

export async function updateEvent(
  id: string,
  input: UpdateEventInput,
  userId: string,
  userRole: string,
) {
  const event = await eventsRepo.findById(id);

  if (!event) {
    return null;
  }

  if (userRole !== "ADMIN" && event.organizerId !== userId) {
    throw new ForbiddenError();
  }

  const updatedEvent = await eventsRepo.update(id, input);

  await cache.del(`eventify:event:${id}`);

  await cache.incr("eventify:events:list:v");

  return updatedEvent;
}

export async function deleteEvent(
  id: string,
  userId: string,
  userRole: string,
) {
  const event = await eventsRepo.findById(id);

  if (!event) {
    return false;
  }

  if (userRole !== "ADMIN" && event.organizerId !== userId) {
    throw new ForbiddenError();
  }

  const deleted = await eventsRepo.remove(id);

  if (deleted) {
    await cache.del(`eventify:event:${id}`);

    await cache.incr("eventify:events:list:v");
  }

  return deleted;
}
