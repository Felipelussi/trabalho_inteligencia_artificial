import { resolve } from 'node:path';

export const config = {
  /** Base URL for the local Ollama provider (it appends /chat, /embeddings, etc.). */
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/api',
  /** Chat model used by both agents. Must support tool calling for the supervisor pattern. */
  llmModel: process.env.TUTOR_LLM_MODEL ?? 'llama3.2:3b',
  /** Embedding model. nomic-embed-text => 768 dims. */
  embedModel: process.env.TUTOR_EMBED_MODEL ?? 'nomic-embed-text',
  /** Embedding dimension. MUST match the embed model's output and the vector index. */
  embedDim: Number(process.env.TUTOR_EMBED_DIM ?? 768),
  /** libSQL file used for BOTH conversation memory and the vector index. */
  dbUrl: process.env.TUTOR_DB_URL ?? 'file:./tutor.db',
  /** Vector index (collection) name. */
  indexName: process.env.TUTOR_INDEX ?? 'materials',
  /** Number of chunks to retrieve per query. */
  topK: Number(process.env.TUTOR_TOPK ?? 4),
  /** Minimum cosine similarity for a chunk to be returned. */
  minScore: Number(process.env.TUTOR_MIN_SCORE ?? 0.3),
  /** Directory containing source PDFs. */
  materialsDir: resolve(process.cwd(), 'materials'),
} as const;
