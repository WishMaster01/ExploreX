import { describe, expect, it } from "vitest";
import { buildKnowledgeFilters } from "./query";
import { knowledgeSearchSchema } from "./schemas";

describe("knowledge retrieval authorization predicates", () => {
  it("always restricts private records to the server supplied owner", () => {
    const query = knowledgeSearchSchema.parse({ query: "Jaipur" });
    const anonymous = buildKnowledgeFilters(query, null, false);
    expect(anonymous.where).toContain(
      `d.visibility='PUBLIC' OR (d.visibility='PRIVATE' AND d."ownerId"=$1)`,
    );
    expect(anonymous.values).toEqual([null]);
    const authenticated = buildKnowledgeFilters(query, "clerk-user-1", false);
    expect(authenticated.values).toContain("clerk-user-1");
  });

  it("applies verification, lifecycle, destination, and geographic predicates before retrieval limits", () => {
    const query = knowledgeSearchSchema.parse({
      query: "Jaipur heritage",
      destinationId: "jaipur-in",
      categoryIds: ["heritage-forts-palaces"],
      latitude: 26.9124,
      longitude: 75.7873,
      radiusKm: 20,
    });
    const built = buildKnowledgeFilters(query, "user-1", true);
    expect(built.where).toContain(`d."isCurrent"=true AND d."isActive"=true`);
    expect(built.where).toContain(
      `d."verificationStatus" IN ('VERIFIED','PROVIDER_SOURCED','CURATED')`,
    );
    expect(built.where).toContain(`d."categoryIds" &&`);
    expect(built.where).toContain("d.latitude IS NOT NULL");
    expect(built.values).toContain("jaipur-in");
    expect(built.values).toContain("user-1");
  });
});
