import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { boundedString, readJsonObject, safeString } from "./api";
import { prisma } from "./db";

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

export async function getOrCreateCurrentUser(request?: Request) {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();
  const body = request ? await readJsonObject(request) : null;
  const primaryEmail =
    clerkUser?.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    safeString(body?.email);

  if (!primaryEmail) {
    return null;
  }

  const profile = {
    clerkUserId: userId,
    email: primaryEmail.toLowerCase(),
    imageUrl: boundedString(clerkUser?.imageUrl || body?.imageUrl, 500) || null,
    name:
      boundedString(clerkUser?.fullName, 120) ||
      boundedString(
        [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" "),
        120
      ) ||
      boundedString(body?.name, 120, "New User"),
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
