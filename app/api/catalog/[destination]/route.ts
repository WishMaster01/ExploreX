import { apiError, apiOk } from "@/lib/api";
import { loadJaipurCatalog } from "@/lib/data/india-catalog.server";
import "server-only";

export async function GET(
  _request: Request,
  context: { params: Promise<{ destination: string }> },
) {
  const { destination } = await context.params;
  if (destination !== "jaipur") {
    return apiError("Destination catalog is not available", 404, "NOT_FOUND");
  }
  const result = await loadJaipurCatalog();
  return apiOk({
    ...result,
  });
}
