import { apiError, apiOk } from "@/lib/api";
import { DESTINATIONS } from "@/lib/data/destinations";
import { loadSiteDataset } from "@/lib/data/site-datasets";
import "server-only";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (key !== "destinations") {
    return apiError("Dataset is not available", 404, "NOT_FOUND");
  }
  const destinations = await loadSiteDataset("destinations", DESTINATIONS);
  return apiOk({ key, content: destinations });
}
