import { describe, it, expect } from 'vitest';
import { chunkText } from '../src/mastra/rag/documents';

describe('chunkText', () => {
  it('splits long text into multiple non-empty chunks', async () => {
    const paragraph =
      'Uma transação ACID garante atomicidade, consistência, isolamento e durabilidade. ';
    const longText = paragraph.repeat(80); // well over one chunk

    const chunks = await chunkText(longText);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.trim().length > 0)).toBe(true);
  });

  it('returns an empty array for whitespace-only input', async () => {
    const chunks = await chunkText('   \n  ');
    expect(chunks).toEqual([]);
  });
});
