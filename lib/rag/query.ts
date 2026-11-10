import type { KnowledgeSearchInput } from "./schemas";

/** Parameterized SQL predicates. ownerId must come from server authentication. */
export function buildKnowledgeFilters(
  input: KnowledgeSearchInput,
  ownerId: string | null,
  includeQuery: boolean,
) {
  const values: unknown[] = includeQuery ? [input.query] : [];
  const clauses = [
    `d."isCurrent"=true AND d."isActive"=true`,
    `d."verificationStatus" IN ('VERIFIED','PROVIDER_SOURCED','CURATED')`,
    `(d.visibility='PUBLIC' OR (d.visibility='PRIVATE' AND d."ownerId"=$${values.push(ownerId)}))`,
  ];
  if (input.destinationId)
    clauses.push(`d."destinationId"=$${values.push(input.destinationId)}`);
  if (input.categoryIds?.length)
    clauses.push(
      `d."categoryIds" && $${values.push(input.categoryIds)}::text[]`,
    );
  if (input.language)
    clauses.push(`d.language=$${values.push(input.language)}`);
  if (input.latitude !== undefined && input.longitude !== undefined) {
    const radius = input.radiusKm ?? 50;
    const latDelta = radius / 110.574;
    const lonDelta =
      radius / Math.max(1, 111.32 * Math.cos((input.latitude * Math.PI) / 180));
    const minLatitude = values.push(input.latitude - latDelta);
    const maxLatitude = values.push(input.latitude + latDelta);
    const minLongitude = values.push(input.longitude - lonDelta);
    const maxLongitude = values.push(input.longitude + lonDelta);
    const centerLatitude = values.push(input.latitude);
    const centerLongitude = values.push(input.longitude);
    const radiusParameter = values.push(radius);
    clauses.push(
      `(d.latitude IS NOT NULL AND d.latitude BETWEEN $${minLatitude} AND $${maxLatitude} AND d.longitude BETWEEN $${minLongitude} AND $${maxLongitude} AND 6371 * 2 * asin(sqrt(power(sin(radians(d.latitude-$${centerLatitude})/2),2) + cos(radians($${centerLatitude}))*cos(radians(d.latitude))*power(sin(radians(d.longitude-$${centerLongitude})/2),2))) <= $${radiusParameter})`,
    );
  }
  return { values, where: clauses.join(" AND ") };
}
