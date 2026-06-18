import { MCPServer } from '@mastra/mcp';
import { searchMaterialsTool } from '../tools/search-materials-tool';

const server = new MCPServer({
  id: 'tutor-docs-server',
  name: 'Tutor Docs MCP Server',
  version: '1.0.0',
  description: 'Expõe a busca semântica nos materiais didáticos via MCP.',
  instructions: 'Use a tool searchMaterials para recuperar trechos relevantes dos materiais.',
  // The object KEY becomes the MCP tool name -> client namespaces it as `tutorDocs_searchMaterials`.
  tools: { searchMaterials: searchMaterialsTool },
});

await server.startStdio();
