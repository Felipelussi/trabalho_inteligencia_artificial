import { describe, it, expect } from 'vitest';
import { LibSQLVector } from '@mastra/libsql';

// Verifies our assumptions about LibSQLVector: createIndex + upsert with metadata,
// then query returns nearest vectors with their metadata intact. No Ollama needed.
describe('LibSQLVector round-trip', () => {
  it('returns the nearest vector with its metadata', async () => {
    const store = new LibSQLVector({ id: 'test-vec', url: 'file:test.db' });
    await store.createIndex({ indexName: 'test_index', dimension: 3 });

    await store.upsert({
      indexName: 'test_index',
      vectors: [
        [1, 0, 0],
        [0, 1, 0],
      ],
      metadata: [
        { text: 'first', source: 'a.pdf' },
        { text: 'second', source: 'b.pdf' },
      ],
    });

    const results = await store.query({
      indexName: 'test_index',
      queryVector: [0.9, 0.1, 0],
      topK: 1,
    });

    expect(results).toHaveLength(1);
    expect(results[0].metadata?.text).toBe('first');
    expect(results[0].metadata?.source).toBe('a.pdf');
    expect(results[0].score).toBeGreaterThan(0.5);
  });
});
