import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { boundedString } from "./api";
import { prisma } from "./db";
import "server-only";

type UserProfile = {
  clerkUserId: string;
  email: string;
  imageUrl: string | null;
  name: string;
};

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function findExistingUser(profile: UserProfile) {
  const userByClerkId = await prisma.user.findUnique({
    where: { clerkUserId: profile.clerkUserId },
  });

  if (userByClerkId) {
    return userByClerkId;
  }

  return prisma.user.findUnique({
    where: { email: profile.email },
  });
}

export async function getOrCreateCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();
  const primaryEmail =
    clerkUser?.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    return null;
  }

  const profile = {
    clerkUserId: userId,
    email: primaryEmail.toLowerCase(),
    imageUrl: clerkUser?.imageUrl || null,
    name:
      boundedString(clerkUser?.fullName, 120) ||
      boundedString(
        [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" "),
        120,
      ) ||
      "New User",
  };

  try {
    const existingUser = await findExistingUser(profile);

    if (existingUser) {
      return prisma.user.update({
        where: { id: existingUser.id },
        data: profile,
      });
    }

    return prisma.user.create({
      data: {
        ...profile,
        subscription: "free",
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existingUser = await findExistingUser(profile);

      if (existingUser) {
        return prisma.user.update({
          where: { id: existingUser.id },
          data: profile,
        });
      }
    }

    throw error;
  }
}
