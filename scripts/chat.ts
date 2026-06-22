import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { MastraClient } from '@mastra/client-js';

// O chat agora é um cliente fino: fala com o Tutor pelo servidor HTTP do Mastra
// (mastra build + mastra start), em vez de instanciar o agente no processo.
// No Docker apontamos para o container "server"; localmente, para o servidor local.
const SERVER_URL = process.env.MASTRA_SERVER_URL ?? 'http://localhost:4111';

// One stable thread per process => the Tutor's Memory accumulates the conversation.
const THREAD = 'cli-session';
const RESOURCE = 'student';

const client = new MastraClient({ baseUrl: SERVER_URL });
// ID do agente registrado em src/mastra/index.ts (Agent({ id: 'tutor-agent' })).
const tutor = client.getAgent('tutor-agent');

async function answer(question: string): Promise<string> {
  const res = await tutor.generate(question, {
    memory: { thread: THREAD, resource: RESOURCE },
    maxSteps: 10, // allow delegate -> retrieve -> synthesize within one turn
  });
  return res.text;
}

const hint = `(O servidor Mastra está rodando em ${SERVER_URL}? Tente: pnpm dev — ou suba o serviço "server" no docker compose)`;

async function main() {
  console.error(`[servidor: ${SERVER_URL}]`);
  // One-shot mode: `pnpm chat "minha pergunta"`
  const oneShot = process.argv.slice(2).join(' ').trim();
  if (oneShot) {
    try {
      console.log(await answer(oneShot));
    } catch (err) {
      console.error(`[erro] ${(err as Error).message}\n${hint}`);
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
      console.error(`\n[erro] ${(err as Error).message}\n${hint}\n`);
    }
  }
  rl.close();
  process.exit(0);
}

main();
