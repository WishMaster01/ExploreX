import { describe, expect, it } from "vitest";
import {
  assessPlannerEvidence,
  chunkKnowledgeText,
  duplicateKnowledgeDocumentKeys,
  hashKnowledgeContent,
  rankBm25,
  reciprocalRank,
  reciprocalRankFusion,
  recallAtK,
} from "./core";
import { knowledgeDocumentInputSchema, knowledgeSearchSchema } from "./schemas";
import { curatedKnowledgeDocuments } from "./curated-corpus";
import { plannerApiResponseSchema } from "../ai-schemas";
import evaluation from "../../data/rag/evaluation.json";

describe("travel knowledge contracts", () => {
  it("validates curated factual records and rejects incomplete provenance and coordinates", () => {
    expect(curatedKnowledgeDocuments.length).toBeGreaterThanOrEqual(5);
    expect(() =>
      knowledgeDocumentInputSchema.parse({ title: "No source" }),
    ).toThrow();
    expect(() =>
      knowledgeDocumentInputSchema.parse({
        ...curatedKnowledgeDocuments[0],
        latitude: 200,
        longitude: 2,
      }),
    ).toThrow();
  });

  it("requires a bounded, well-formed geo filter", () => {
    expect(() =>
      knowledgeSearchSchema.parse({ query: "Jaipur", latitude: 26 }),
    ).toThrow();
    expect(() =>
      knowledgeSearchSchema.parse({ query: "Jaipur", radiusKm: 20 }),
    ).toThrow();
    expect(knowledgeSearchSchema.parse({ query: "Jaipur" }).limit).toBe(6);
  });

  it("validates explicit planner abstention and traceable HTTPS source metadata", () => {
    const response = {
      status: "insufficient_evidence" as const,
      uncertainty: {
        reason: "Not enough verified evidence.",
        missingEvidence: ["Sourced attraction coordinates are unavailable."],
        destination: "Jaipur",
        sources: [
          {
            title: "Amber Palace",
            sourceUrl: "https://www.tourism.rajasthan.gov.in/amber-palace.html",
            attribution: "Department of Tourism, Government of Rajasthan",
            verificationStatus: "VERIFIED",
            lastVerifiedAt: "2026-10-28",
            retrievedAt: "2026-11-08T00:00:00.000Z",
          },
        ],
      },
    };
    expect(plannerApiResponseSchema.parse(response)).toEqual(response);
    expect(() =>
      plannerApiResponseSchema.parse({
        ...response,
        uncertainty: {
          ...response.uncertainty,
          sources: [
            {
              ...response.uncertainty.sources[0],
              sourceUrl: "http://example.com",
            },
          ],
        },
      }),
    ).toThrow();
  });

  it("chunks deterministically and hashes normalized text", () => {
    const input = Array.from(
      { length: 600 },
      (_, index) => `word${index}`,
    ).join(" ");
    expect(chunkKnowledgeText(input)).toHaveLength(4);
    expect(hashKnowledgeContent("Jaipur\nCity")).toBe(
      hashKnowledgeContent("Jaipur City"),
    );
  });

  it("detects duplicate stable source document identifiers", () => {
    expect(
      duplicateKnowledgeDocumentKeys([
        { sourceId: "source-a", sourceDocumentId: "record-1" },
        { sourceId: "source-a", sourceDocumentId: "record-1" },
        { sourceId: "source-b", sourceDocumentId: "record-1" },
      ]),
    ).toEqual(new Set(["source-a\u0000record-1"]));
  });

  it("ranks curated Jaipur queries and measures recall, MRR, and abstention expectations", () => {
    const records = curatedKnowledgeDocuments.map((document) => ({
      id: document.sourceDocumentId,
      title: document.title,
      content: document.content,
    }));
    const recalls: number[] = [];
    const reciprocalRanks: number[] = [];
    for (const item of evaluation.queries) {
      const ranked = rankBm25(item.query, records).map((record) => record.id);
      if (item.relevant.length) {
        recalls.push(recallAtK(ranked, item.relevant, 5) ?? 0);
        reciprocalRanks.push(reciprocalRank(ranked, item.relevant));
      }
      expect(item.expectAbstain).toBe(true);
    }
    expect(
      recalls.reduce((sum, value) => sum + value, 0) / recalls.length,
    ).toBeGreaterThanOrEqual(0.5);
    expect(
      reciprocalRanks.reduce((sum, value) => sum + value, 0) /
        reciprocalRanks.length,
    ).toBeGreaterThan(0);
    expect(
      assessPlannerEvidence(
        curatedKnowledgeDocuments.map((document) => ({
          title: document.title,
          factTypes: document.factTypes,
          verificationStatus: document.verificationStatus,
        })),
      ).sufficient,
    ).toBe(false);
  });

  it("fuses methods without duplicate evidence and retains method provenance", () => {
    const fused = reciprocalRankFusion([
      [
        { id: "one", value: 1 },
        { id: "two", value: 2 },
      ],
      [
        { id: "two", value: 2 },
        { id: "three", value: 3 },
      ],
    ]);
    expect(fused[0]?.id).toBe("two");
    expect(fused[0]?.retrievalMethods).toEqual(["semantic", "keyword"]);
  });
});
