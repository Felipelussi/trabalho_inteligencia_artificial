import { Agent } from '@mastra/core/agent';
import { ollama } from '../ollama';
import { config } from '../config';
import { mcpClient } from '../mcp/client';

export const retrieverAgent = new Agent({
  id: 'retriever-agent',
  name: 'Agente Recuperador',
  description:
    'Busca e retorna trechos relevantes dos materiais didáticos da disciplina, ' +
    'com a fonte de cada trecho. Use-o sempre que precisar de conteúdo do material.',
  instructions: `Você é o agente de RECUPERAÇÃO de um tutor inteligente.

Sua única tarefa é buscar conteúdo nos materiais e devolvê-lo. Você NÃO explica e NÃO inventa.

Regras:
- Para qualquer pedido, chame a tool de busca (tutorDocs_searchMaterials) usando a pergunta recebida como "query".
- Devolva CADA trecho recuperado seguido de "[Fonte: <arquivo>]".
- Se a busca não retornar nenhum trecho, responda exatamente: NENHUM_TRECHO_ENCONTRADO`,
  model: ollama(config.llmModel),
  // MCP tools are loaded once at module init; `tutorDocs_searchMaterials` is available here.
  getTools: async () => {
    return mcpClient.listTools();
  },
});
