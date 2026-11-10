import {
  knowledgeDocumentInputSchema,
  ragSourcesRegistrySchema,
} from "./schemas.ts";
import { z } from "zod";
import type { RagSource } from "./schemas.ts";
import type { KnowledgeDocumentInput } from "./core.ts";
import sourceRegistryJson from "../../data/catalogs/source-registry.json" with { type: "json" };
import jaipurDestinationJson from "../../data/destinations/jaipur-in/destination.json" with { type: "json" };
import jaipurPlacesJson from "../../data/destinations/jaipur-in/places.json" with { type: "json" };

const registry = ragSourcesRegistrySchema.parse(sourceRegistryJson).sources;
const jaipurDestination = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    categoryIds: z.array(z.string()),
    coordinates: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
      .optional(),
    lastVerifiedAt: z.string().date(),
  })
  .passthrough()
  .parse(jaipurDestinationJson);
const jaipurPlaces = jaipurPlacesJson;

export const ragSources: RagSource[] = registry;

function findSource(sourceId: string) {
  return registry.find((source) => source.id === sourceId);
}

function curateInput(input: KnowledgeDocumentInput): KnowledgeDocumentInput {
  return knowledgeDocumentInputSchema.parse(input);
}

function buildInitialCorpus(): KnowledgeDocumentInput[] {
  const documents: KnowledgeDocumentInput[] = [];
  const destinationSource = findSource("rajasthan-tourism-jaipur");
  if (
    destinationSource?.currentUse === "used" &&
    destinationSource.licenseStatus === "attribution_required"
  ) {
    documents.push(
      curateInput({
        sourceId: destinationSource.id,
        sourceDocumentId: "destination:jaipur-in:identity",
        title: "Jaipur",
        content: "Jaipur",
        destinationId: jaipurDestination.id,
        categoryIds: jaipurDestination.categoryIds,
        factTypes: ["destination_identity"],
        language: "en",
        verificationStatus: "VERIFIED",
        sourceUrl: destinationSource.url,
        attribution: destinationSource.attribution,
        license: destinationSource.license,
        storagePolicy: destinationSource.storagePolicy,
        lastVerifiedAt: "2026-10-28",
      }),
    );
  }

  const coordinateSource = findSource("jaipur-municipal-city-profile");
  const coordinates = jaipurDestination.coordinates;
  if (
    coordinateSource?.currentUse === "used" &&
    coordinateSource.licenseStatus === "attribution_required" &&
    coordinateSource.storagePolicy.toLowerCase().includes("coordinate") &&
    coordinates
  ) {
    const content = `City-center coordinate: latitude ${coordinates.latitude}, longitude ${coordinates.longitude}. This identifies the city center, not an attraction.`;
    documents.push(
      curateInput({
        sourceId: coordinateSource.id,
        sourceDocumentId: `destination:${jaipurDestination.id}:city-center-coordinate`,
        title: "Jaipur city-center coordinate",
        content,
        destinationId: jaipurDestination.id,
        categoryIds: [],
        factTypes: ["city_center_coordinate"],
        language: "en",
        verificationStatus: "VERIFIED",
        sourceUrl: coordinateSource.url,
        attribution: coordinateSource.attribution,
        license: coordinateSource.license,
        storagePolicy: coordinateSource.storagePolicy,
        lastVerifiedAt: "2026-10-28",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      }),
    );
  }

  for (const place of jaipurPlaces) {
    if (place.verificationStatus !== "VERIFIED") continue;
    const source = place.sourceRefs
      .map(findSource)
      .find(
        (candidate) =>
          candidate?.currentUse === "used" &&
          candidate.licenseStatus === "attribution_required" &&
          /name/i.test(candidate.storagePolicy),
      );
    if (!source) continue;
    documents.push(
      curateInput({
        sourceId: source.id,
        sourceDocumentId: `place:${place.id}:name`,
        title: place.name,
        content: place.name,
        destinationId: place.destinationId,
        categoryIds: place.categoryIds,
        factTypes: ["place_name"],
        language: "en",
        verificationStatus: "VERIFIED",
        sourceUrl: source.url,
        attribution: source.attribution,
        license: source.license,
        storagePolicy: source.storagePolicy,
        lastVerifiedAt: place.lastVerifiedAt ?? undefined,
      }),
    );
  }
  return documents;
}

export const curatedKnowledgeDocuments = buildInitialCorpus();
export const supportedKnowledgeDestinations = [
  {
    id: jaipurDestination.id,
    name: jaipurDestination.name,
    aliases: ["pink city"],
  },
];
