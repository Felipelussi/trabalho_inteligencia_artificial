import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Raiz do projeto, derivada da localização DESTE módulo — não de process.cwd().
// O cwd difere entre entrypoints: os scripts `tsx` rodam na raiz, mas o servidor
// do `mastra dev`/`build` roda de outro diretório (ex.: src/mastra/public). Usar
// cwd fazia o ingest e o servidor abrirem arquivos tutor.db diferentes e o .env
// nunca ser carregado pelo servidor. Tanto src/mastra/config.ts quanto o bundle
// em .mastra/output/*.mjs ficam dois níveis abaixo da raiz.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// tsx/pnpm não carregam .env automaticamente. Carregamos aqui (este módulo é
// importado por todos os entrypoints). Sem arquivo .env (ex.: Docker, onde as
// variáveis vêm do compose) simplesmente seguimos com o process.env atual.
const envPath = resolve(projectRoot, '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

// Normaliza uma URL libSQL `file:` relativa para um caminho absoluto ancorado na
// raiz do projeto. URLs remotas (libsql://, http(s)://) ou caminhos já absolutos
// passam inalterados.
function resolveDbUrl(raw: string): string {
  if (!raw.startsWith('file:')) return raw;
  const path = raw.slice('file:'.length);
  if (path.startsWith('/')) return raw;
  return `file:${resolve(projectRoot, path)}`;
}

export const config = {
  /** Base URL for the local Ollama provider (it appends /chat, /embeddings, etc.). */
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/api',
  /** Chat model used by both agents (Ollama, local). Must support tool calling. */
  llmModel: process.env.TUTOR_LLM_MODEL ?? 'llama3.2:3b',
  /**
   * OpenAI API key (opcional). Se definido, os agentes usam a OpenAI no lugar do
   * Ollama — útil para testar com um modelo melhor em tool-calling. O Mastra lê
   * OPENAI_API_KEY do ambiente ao rotear modelos "openai/...".
   */
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  /** Modelo OpenAI usado quando openaiApiKey está definido. */
  openaiModel: process.env.TUTOR_OPENAI_MODEL ?? 'gpt-4o-mini',
  /** Embedding model. nomic-embed-text => 768 dims. */
  embedModel: process.env.TUTOR_EMBED_MODEL ?? 'nomic-embed-text',
  /** Embedding dimension. MUST match the embed model's output and the vector index. */
  embedDim: Number(process.env.TUTOR_EMBED_DIM ?? 768),
  /** libSQL file used for BOTH conversation memory and the vector index. */
  dbUrl: resolveDbUrl(process.env.TUTOR_DB_URL ?? 'file:./tutor.db'),
  /** Vector index (collection) name. */
  indexName: process.env.TUTOR_INDEX ?? 'materials',
  /** Number of chunks to retrieve per query. */
  topK: Number(process.env.TUTOR_TOPK ?? 4),
  /** Minimum cosine similarity for a chunk to be returned. */
  minScore: Number(process.env.TUTOR_MIN_SCORE ?? 0.3),
  /** Directory containing source PDFs. */
  materialsDir: resolve(projectRoot, process.env.TUTOR_MATERIALS_DIR ?? 'materials'),
} as const;
