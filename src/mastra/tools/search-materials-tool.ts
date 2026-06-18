import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { searchPassages } from '../rag/vector-store';

export const searchMaterialsTool = createTool({
  id: 'search-materials',
  description:
    'Busca trechos relevantes nos materiais didáticos indexados da disciplina. ' +
    'Use sempre que precisar de conteúdo do material para responder a uma pergunta.',
  inputSchema: z.object({
    query: z.string().describe('A pergunta ou os termos de busca do aluno'),
  }),
  outputSchema: z.object({
    passages: z.array(
      z.object({
        text: z.string(),
        source: z.string(),
        score: z.number(),
      }),
    ),
  }),
  execute: async ({ query }) => {
    const passages = await searchPassages(query);
    return { passages };
  },
});
