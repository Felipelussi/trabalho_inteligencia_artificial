import { MCPServer } from '@mastra/mcp';
import { tutorAgent } from '../agents/tutor-agent';
import { retrieverAgent } from '../agents/retriever-agent';

/**
 * Servidor MCP que expõe os AGENTES do Tutor Inteligente para clientes MCP
 * externos (Claude Desktop, Mastra Studio, outro app...). Cada agente passado
 * em `agents` vira automaticamente a tool `ask_<chave>`:
 *   - ask_tutor     -> conversa com o Tutor (supervisor; usa RAG internamente)
 *   - ask_retriever -> recuperação pura de trechos dos materiais
 *
 * Não chamamos startStdio() aqui: o servidor é registrado na instância Mastra
 * (src/mastra/index.ts -> mcpServers), que o serve via HTTP e o mostra no Studio.
 * Para rodá-lo como processo stdio independente, use `pnpm mcp` (scripts/mcp-server.ts).
 */
export const tutorMcpServer = new MCPServer({
  id: 'tutor-mcp-server',
  name: 'Tutor Inteligente MCP Server',
  version: '1.0.0',
  description: 'Expõe os agentes do Tutor Inteligente (Tutor e Recuperador) via MCP.',
  instructions:
    'Use ask_tutor para tirar dúvidas da disciplina (resposta didática fundamentada nos ' +
    'materiais, com fontes). Use ask_retriever para obter os trechos crus dos materiais.',
  // Sem tools "cruas": o acesso é exposto pelos agentes (abaixo).
  tools: {},
  // A chave de cada agente define o nome da tool: ask_tutor e ask_retriever.
  agents: { tutor: tutorAgent, retriever: retrieverAgent },
});
