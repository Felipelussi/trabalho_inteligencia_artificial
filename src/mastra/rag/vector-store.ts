import { LibSQLVector } from '@mastra/libsql';
import { embedQuery } from './embeddings';
import { config } from '../config';

export const vectorStore = new LibSQLVector({
  id: 'tutor-vector',
  url: config.dbUrl,
});

export interface Passage {
  text: string;
  source: string;
  score: number;
}

/** Create the vector index if it does not exist yet. Safe to call repeatedly. */
export async function ensureIndex(): Promise<void> {
  const indexes = await vectorStore.listIndexes();
  if (!indexes.includes(config.indexName)) {
    await vectorStore.createIndex({
      indexName: config.indexName,
      dimension: config.embedDim,
    });
  }
}

/** Store chunks with their precomputed vectors. `items` and `vectors` must be aligned. */
export async function upsertChunks(
  items: { text: string; source: string }[],
  vectors: number[][],
): Promise<void> {
  await vectorStore.upsert({
    indexName: config.indexName,
    vectors,
    metadata: items.map((it) => ({ text: it.text, source: it.source })),
  });
}

/** Embed the query and return the most relevant passages above the score threshold. */
export async function searchPassages(query: string): Promise<Passage[]> {
  const queryVector = await embedQuery(query);
  const results = await vectorStore.query({
    indexName: config.indexName,
    queryVector,
    topK: config.topK,
    minScore: config.minScore,
  });
  return results.map((r) => ({
    text: String(r.metadata?.text ?? ''),
    source: String(r.metadata?.source ?? 'desconhecido'),
    score: r.score,
  }));
}
