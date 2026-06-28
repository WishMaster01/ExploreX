type AdminCandidate = {
  clerkUserId: string | null;
  email: string;
  role: string;
};

export function isAdmin(
  user: AdminCandidate,
): boolean {
  if (user.role === "admin") return true;
  const allowed = (process.env.ADMIN_USERS ?? "")
    .split(",")
    .map((value) => value.trim().toLocaleLowerCase())
    .filter(Boolean);
  return (
    allowed.includes(user.email.toLocaleLowerCase()) ||
    Boolean(
      user.clerkUserId &&
      allowed.includes(user.clerkUserId.toLocaleLowerCase()),
    )
  );
}
