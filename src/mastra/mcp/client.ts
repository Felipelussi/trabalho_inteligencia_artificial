import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { MCPClient } from '@mastra/mcp';

const here = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(here, 'server.ts');

// O transporte stdio do MCP so herda um subconjunto seguro de variaveis de ambiente
// (HOME, PATH, SHELL, ...). Nossas variaveis de config (OLLAMA_BASE_URL, TUTOR_DB_URL,
// etc.) precisam ser repassadas explicitamente, senao o subprocesso do servidor usa os
// padroes (Ollama em localhost, ./tutor.db) — o que quebra dentro do Docker.
const forwardedEnv: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (typeof value === 'string') forwardedEnv[key] = value;
}

export const mcpClient = new MCPClient({
  id: 'tutor-docs-client',
  servers: {
    // Server key `tutorDocs` => tools are namespaced as `tutorDocs_<toolName>`.
    tutorDocs: {
      command: 'npx',
      args: ['tsx', serverPath],
      env: forwardedEnv,
    },
  },
});
