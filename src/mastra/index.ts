import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { config } from './config';
import { tutorAgent } from './agents/tutor-agent';
import { retrieverAgent } from './agents/retriever-agent';
import { tutorMcpServer } from './mcp/server';

export const mastra = new Mastra({
  agents: { tutorAgent, retrieverAgent },
  mcpServers: { tutorDocs: tutorMcpServer },
  storage: new LibSQLStore({ id: 'mastra-storage', url: config.dbUrl }),
  logger: new PinoLogger({ name: 'TutorInteligente', level: 'info' }),
});
