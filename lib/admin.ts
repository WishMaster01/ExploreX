import "server-only";
import { getServerEnvironment } from "@/lib/env";
import { isAdminIdentity } from "./domain/ownership";

type AdminCandidate = {
  clerkUserId: string | null;
  email: string;
  role: string;
};

export function isAdmin(user: AdminCandidate): boolean {
  return isAdminIdentity(
    user,
    (getServerEnvironment().ADMIN_USERS ?? "").split(","),
  );
}
