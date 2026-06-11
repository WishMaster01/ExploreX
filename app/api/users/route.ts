import { apiError, apiOk, serverError } from "@/lib/api";
import { getOrCreateCurrentUser } from "@/lib/auth-user";

export async function POST(request: Request) {
  try {
    const user = await getOrCreateCurrentUser(request);

    if (!user) {
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    }

    return apiOk(user);
  } catch (error) {
    return serverError(error, "Error creating or updating user");
  }
}

export async function GET(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();

    if (!user) {
      return apiError("Authentication is required", 401, "UNAUTHORIZED");
    }

    return apiOk(user);
  } catch (error) {
    return serverError(error, "Error fetching user");
  }
}
