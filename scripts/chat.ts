import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { tutorAgent } from '../src/mastra/agents/tutor-agent';
import { chatModelLabel } from '../src/mastra/models';

// One stable thread per process => the Tutor's Memory accumulates the conversation.
const THREAD = 'cli-session';
const RESOURCE = 'student';

async function answer(question: string): Promise<string> {
  const res = await tutorAgent.generate(question, {
    memory: { thread: THREAD, resource: RESOURCE },
    maxSteps: 10, // allow delegate -> retrieve -> synthesize within one turn
  });
  return res.text;
}

async function main() {
  console.error(`[modelo: ${chatModelLabel()}]`);
  // One-shot mode: `pnpm chat "minha pergunta"`
  const oneShot = process.argv.slice(2).join(' ').trim();
  if (oneShot) {
    try {
      console.log(await answer(oneShot));
    } catch (err) {
      console.error(`[erro] ${(err as Error).message}\n(O Ollama está rodando? Tente: ollama serve)`);
    }
    process.exit(0);
  }

  const rl = readline.createInterface({ input, output });
  console.log('Tutor Inteligente — faça sua pergunta sobre a disciplina (digite "sair" para encerrar).\n');
  while (true) {
    const q = (await rl.question('Você: ')).trim();
    if (!q) continue;
    if (q.toLowerCase() === 'sair') break;
    try {
      const reply = await answer(q);
      console.log(`\nTutor: ${reply}\n`);
    } catch (err) {
      console.error(`\n[erro] ${(err as Error).message}\n(O Ollama está rodando? Tente: ollama serve)\n`);
    }
  }
  rl.close();
  process.exit(0);
}

main();
