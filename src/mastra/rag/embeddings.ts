import { embed, embedMany } from 'ai';
import { ollama } from '../ollama';
import { config } from '../config';

const embedder = ollama.textEmbeddingModel(config.embedModel);

/** Embed many texts at once (used during ingestion). Returns one vector per input. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({ model: embedder, values: texts });
  return embeddings;
}

/** Embed a single query string (used at retrieval time). */
export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embedder, value: text });
  return embedding;
}
