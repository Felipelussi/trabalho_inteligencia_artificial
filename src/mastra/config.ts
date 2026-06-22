import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Raiz derivada deste módulo (não do cwd, que difere entre os scripts tsx e o
// servidor do mastra). Garante o mesmo tutor.db e o mesmo .env em todos os entrypoints.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// tsx/pnpm não carregam .env automaticamente. Sem .env (ex.: Docker) seguimos com o process.env atual.
const envPath = resolve(projectRoot, '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

// Normaliza URL libSQL `file:` relativa para caminho absoluto na raiz; URLs remotas e caminhos absolutos passam inalterados.
function resolveDbUrl(raw: string): string {
  if (!raw.startsWith('file:')) return raw;
  const path = raw.slice('file:'.length);
  if (path.startsWith('/')) return raw;
  return `file:${resolve(projectRoot, path)}`;
}

export const config = {
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/api',
  llmModel: process.env.TUTOR_LLM_MODEL ?? 'llama3.2:3b',
  // Se definido, os agentes usam a OpenAI no lugar do Ollama (melhor em tool-calling).
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiModel: process.env.TUTOR_OPENAI_MODEL ?? 'gpt-4o-mini',
  embedModel: process.env.TUTOR_EMBED_MODEL ?? 'nomic-embed-text',
  // DEVE bater com a saída do modelo de embedding e com o índice vetorial.
  embedDim: Number(process.env.TUTOR_EMBED_DIM ?? 768),
  dbUrl: resolveDbUrl(process.env.TUTOR_DB_URL ?? 'file:./tutor.db'),
  indexName: process.env.TUTOR_INDEX ?? 'materials',
  topK: Number(process.env.TUTOR_TOPK ?? 4),
  minScore: Number(process.env.TUTOR_MIN_SCORE ?? 0.3),
  materialsDir: resolve(projectRoot, process.env.TUTOR_MATERIALS_DIR ?? 'materials'),
} as const;
