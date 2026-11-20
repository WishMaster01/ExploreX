import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../lib/db";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ownerEmail = `integration-owner-${suffix}@example.test`;
const otherEmail = `integration-other-${suffix}@example.test`;

describe("PostgreSQL transaction and ownership constraints", () => {
  let ownerId: string;
  let otherUserId: string;
  let tripId: string;

  beforeAll(async () => {
    await prisma.$connect();
    const [owner, other] = await prisma.$transaction([
      prisma.user.create({
        data: { email: ownerEmail, name: "Integration Owner" },
      }),
      prisma.user.create({
        data: { email: otherEmail, name: "Integration Other" },
      }),
    ]);
    ownerId = owner.id;
    otherUserId = other.id;
    const trip = await prisma.trip.create({
      data: {
        userId: ownerId,
        destination: "Jaipur",
        duration: "1 day",
        planHash: `plan-${suffix}`,
      },
    });
    tripId = trip.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, otherEmail] } },
    });
    await prisma.$disconnect();
  });

  it("rolls back all writes when a transaction fails", async () => {
    const rollbackEmail = `integration-rollback-${suffix}@example.test`;
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: { email: rollbackEmail, name: "Must Roll Back" },
        });
        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");
    await expect(
      prisma.user.findUnique({ where: { email: rollbackEmail } }),
    ).resolves.toBeNull();
  });

  it("enforces reminder ownership with the database composite foreign key", async () => {
    await expect(
      prisma.reminder.create({
        data: {
          userId: otherUserId,
          tripId,
          message: "Should fail ownership constraint",
          remindAt: new Date(Date.now() + 60_000),
          timeZone: "UTC",
        },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("enforces owner-scoped trip idempotency and permits another owner", async () => {
    await expect(
      prisma.trip.create({
        data: {
          userId: ownerId,
          destination: "Jaipur duplicate",
          planHash: `plan-${suffix}`,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });

    await expect(
      prisma.trip.create({
        data: {
          userId: otherUserId,
          destination: "Jaipur for another owner",
          planHash: `plan-${suffix}`,
        },
      }),
    ).resolves.toMatchObject({ userId: otherUserId });
  });

  it("creates the fixture under the expected owner", async () => {
    await expect(
      prisma.trip.findUnique({
        where: { id: tripId },
        select: { userId: true },
      }),
    ).resolves.toEqual({ userId: ownerId });
  });
});
