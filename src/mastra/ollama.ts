import { createOllama } from 'ollama-ai-provider-v2';
import { config } from './config';

/**
 * Local Ollama provider.
 * - `ollama(modelId)` returns a chat LanguageModel (used by the agents).
 * - `ollama.textEmbeddingModel(modelId)` returns an embedding model (used by RAG).
 */
export const ollama = createOllama({ baseURL: config.ollamaBaseUrl });
