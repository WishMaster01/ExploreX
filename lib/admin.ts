import "server-only";
import { isAdminIdentity } from "./domain/ownership";

type AdminCandidate = {
  clerkUserId: string | null;
  email: string;
  role: string;
};

export function isAdmin(user: AdminCandidate): boolean {
  return isAdminIdentity(user, (process.env.ADMIN_USERS ?? "").split(","));
}
