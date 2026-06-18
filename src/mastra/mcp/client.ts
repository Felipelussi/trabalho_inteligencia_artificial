import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { MCPClient } from '@mastra/mcp';

const here = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(here, 'server.ts');

export const mcpClient = new MCPClient({
  id: 'tutor-docs-client',
  servers: {
    // Server key `tutorDocs` => tools are namespaced as `tutorDocs_<toolName>`.
    tutorDocs: {
      command: 'npx',
      args: ['tsx', serverPath],
    },
  },
});
