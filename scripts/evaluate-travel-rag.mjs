import { readFile } from "node:fs/promises";
import { curatedKnowledgeDocuments } from "../lib/rag/curated-corpus.ts";
import { rankBm25, reciprocalRank, recallAtK } from "../lib/rag/core.ts";

const evaluation = JSON.parse(
  await readFile(
    new URL("../data/rag/evaluation.json", import.meta.url),
    "utf8",
  ),
);
const corpus = curatedKnowledgeDocuments.map((document) => ({
  id: document.sourceDocumentId,
  title: document.title,
  content: document.content,
}));
let recallSum = 0;
let mrrSum = 0;
let relevantQueries = 0;
let unsupportedQueries = 0;
const results = [];
for (const item of evaluation.queries) {
  const ranked = rankBm25(item.query, corpus).map((document) => document.id);
  const recall = item.relevant.length
    ? recallAtK(ranked, item.relevant, 5)
    : null;
  const mrr = item.relevant.length
    ? reciprocalRank(ranked, item.relevant)
    : null;
  if (item.relevant.length) {
    relevantQueries += 1;
    recallSum += recall ?? 0;
    mrrSum += mrr ?? 0;
  } else unsupportedQueries += 1;
  results.push({
    id: item.id,
    top5: ranked.slice(0, 5),
    recallAt5: recall,
    reciprocalRank: mrr,
    expectedAbstain: item.expectAbstain,
  });
}
process.stdout.write(
  `${JSON.stringify(
    {
      corpusDocuments: corpus.length,
      evaluationQueries: evaluation.queries.length,
      supportedQueries: relevantQueries,
      unsupportedQueries: unsupportedQueries,
      keywordRecallAt5: relevantQueries ? recallSum / relevantQueries : null,
      keywordMrr: relevantQueries ? mrrSum / relevantQueries : null,
      semanticEvaluation:
        "not run: offline evaluator does not connect to the vector store or embedding provider",
      results,
    },
    null,
    2,
  )}\n`,
);
