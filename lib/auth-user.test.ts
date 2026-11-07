import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  },
}));

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getOrCreateCurrentUser } from "./auth-user";

describe("current user account linking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-a" } as never);
  });

  it("does not link an existing account through an unverified email", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      id: "clerk-a",
      primaryEmailAddressId: "email-a",
      emailAddresses: [
        {
          id: "email-a",
          emailAddress: "a@example.com",
          verification: { status: "unverified" },
        },
      ],
    } as never);

    await expect(getOrCreateCurrentUser()).resolves.toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("allows an existing account match through a verified primary email", async () => {
    const existing = { id: "user-a", email: "a@example.com" };
    vi.mocked(currentUser).mockResolvedValue({
      id: "clerk-a",
      primaryEmailAddressId: "email-a",
      emailAddresses: [
        {
          id: "email-a",
          emailAddress: "a@example.com",
          verification: { status: "verified" },
        },
      ],
      fullName: "User A",
      imageUrl: null,
    } as never);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing as never);
    vi.mocked(prisma.user.update).mockResolvedValue(existing as never);

    await getOrCreateCurrentUser();
    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
      where: { email: "a@example.com" },
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-a" },
        data: expect.objectContaining({ clerkUserId: "clerk-a" }),
      }),
    );
  });
});
