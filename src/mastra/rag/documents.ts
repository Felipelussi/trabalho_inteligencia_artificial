import { readFile } from 'node:fs/promises';
import { extractText, getDocumentProxy } from 'unpdf';
import { MDocument } from '@mastra/rag';

/** Extract all text from a PDF file at `path` (pages merged into one string). */
export async function extractPdfText(path: string): Promise<string> {
  const buffer = await readFile(path);
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

/** Split text into overlapping chunks suitable for embedding. Drops empty chunks. */
export async function chunkText(text: string): Promise<string[]> {
  if (text.trim().length === 0) return [];
  const doc = MDocument.fromText(text);
  const chunks = await doc.chunk({
    strategy: 'recursive',
    maxSize: 512,
    overlap: 50,
  });
  return chunks.map((c) => c.text).filter((t) => t.trim().length > 0);
}
