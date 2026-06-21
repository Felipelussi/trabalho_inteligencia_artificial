// Inicia o servidor MCP do Tutor como processo stdio independente, para clientes
// MCP externos (ex.: Claude Desktop). Dentro da aplicação, o mesmo servidor já é
// servido via HTTP por estar registrado em src/mastra/index.ts (mcpServers).
//
// Uso: pnpm mcp
import { tutorMcpServer } from '../src/mastra/mcp/server';

await tutorMcpServer.startStdio();
