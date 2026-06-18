import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { config } from '../src/mastra/config';
import { ensureIndex, upsertChunks } from '../src/mastra/rag/vector-store';
import { embedTexts } from '../src/mastra/rag/embeddings';
import { extractPdfText, chunkText } from '../src/mastra/rag/documents';

async function main() {
  await ensureIndex();

  let files: string[];
  try {
    files = (await readdir(config.materialsDir)).filter(
      (f) => extname(f).toLowerCase() === '.pdf',
    );
  } catch {
    console.error(`Diretório de materiais não encontrado: ${config.materialsDir}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(`Nenhum PDF encontrado em ${config.materialsDir}. Coloque os materiais lá.`);
    process.exit(1);
  }

  let totalChunks = 0;
  for (const file of files) {
    const path = join(config.materialsDir, file);
    try {
      const text = await extractPdfText(path);
      const chunks = await chunkText(text);
      if (chunks.length === 0) {
        console.warn(`Pulado (sem texto extraível): ${file}`);
        continue;
      }
      const vectors = await embedTexts(chunks);
      await upsertChunks(
        chunks.map((t) => ({ text: t, source: file })),
        vectors,
      );
      totalChunks += chunks.length;
      console.log(`Indexado ${file}: ${chunks.length} chunks`);
    } catch (err) {
      console.warn(`Falha ao processar ${file}: ${(err as Error).message}`);
    }
  }

  console.log(
    `\nConcluído. ${files.length} arquivo(s) processado(s), ${totalChunks} chunk(s) no índice "${config.indexName}".`,
  );
  process.exit(0);
}

main();
