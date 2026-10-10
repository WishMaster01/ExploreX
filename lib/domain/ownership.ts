export function ownedTripWhere(userId: string, tripId?: string) {
  return tripId ? { id: tripId, userId } : { userId };
}

export function ownedReminderWhere(userId: string, reminderId?: string) {
  return reminderId ? { id: reminderId, userId } : { userId };
}

export function isAdminIdentity(
  user: { clerkUserId: string | null; email: string; role: string },
  allowlist: readonly string[],
) {
  if (user.role.toLowerCase() === "admin") return true;
  const allowed = new Set(
    allowlist.map((value) => value.trim().toLowerCase()).filter(Boolean),
  );
  return (
    allowed.has(user.email.toLowerCase()) ||
    Boolean(user.clerkUserId && allowed.has(user.clerkUserId.toLowerCase()))
  );
}
