import { ollama } from './ollama';
import { config } from './config';


export function chatModel() {
  return ollama(config.llmModel);
}

export function chatModelLabel(): string {
  return `ollama/${config.llmModel}`;
}
