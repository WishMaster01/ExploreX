import { apiError, apiOk } from "@/lib/api";
import { loadJaipurCatalog } from "@/lib/data/india-catalog.server";
import { DESTINATIONS } from "@/lib/data/destinations";
import { loadTravelDataset } from "@/lib/data/travel-datasets.server";
import "server-only";

export async function GET(
  _request: Request,
  context: { params: Promise<{ destination: string }> },
) {
  const { destination: requestedDestination } = await context.params;
  const destination = DESTINATIONS.find((entry) =>
    entry.id === requestedDestination ||
    entry.city.toLocaleLowerCase() === requestedDestination.toLocaleLowerCase() ||
    entry.aliases.some((alias) => alias.toLocaleLowerCase() === requestedDestination.toLocaleLowerCase()),
  );
  if (!destination) {
    return apiError("Destination catalog is not available", 404, "NOT_FOUND");
  }
  try {
    const result = await loadTravelDataset(destination.id);
    if (!result) return apiError("Destination catalog is not available", 404, "NOT_FOUND");
    const legacy = destination.id === "jaipur-in" ? await loadJaipurCatalog() : undefined;
    return apiOk({ ...result, ...(legacy ? { legacy } : {}) });
  } catch {
    return apiError("Destination catalog is unavailable", 503, "SERVICE_UNAVAILABLE");
  }
}
