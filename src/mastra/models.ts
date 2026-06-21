import { ollama } from './ollama';
import { config } from './config';

/**
 * Modelo de chat usado pelos dois agentes (Tutor e Recuperador).
 *
 * - Se OPENAI_API_KEY estiver definido, usa a OpenAI (string "openai/<modelo>"),
 *   que o roteador de modelos do Mastra resolve lendo OPENAI_API_KEY do ambiente.
 *   Útil para testar com um modelo melhor em tool-calling/delegação.
 * - Caso contrário, usa o modelo LOCAL via Ollama (padrão, 100% offline).
 *
 * A troca é só do LLM. Os embeddings continuam locais (nomic-embed-text), pois o
 * índice vetorial é fixado em 768 dims — trocar o modelo de embedding exigiria reindexar.
 */
export function chatModel() {
  if (config.openaiApiKey) {
    return `openai/${config.openaiModel}`;
  }
  return ollama(config.llmModel);
}

/** Rótulo legível do provider/modelo de chat ativo (para logs na CLI). */
export function chatModelLabel(): string {
  return config.openaiApiKey ? `openai/${config.openaiModel}` : `ollama/${config.llmModel}`;
}
