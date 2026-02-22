import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSession } from '../src/lib/quizEngine.ts';
import { loadGeneralitesQuestions } from '../src/lib/generalitesLoader.ts';
import { makeQuestion } from './helpers.ts';

test('généralités chunkées: limit=50 -> session.length = 50', async () => {
  const chunkA = Array.from({ length: 60 }, (_, index) => makeQuestion(index + 1));
  const importers = {
    './data/questions/generalites/normal/generalites-001.json': async () => ({ default: chunkA })
  };

  const loaded = await loadGeneralitesQuestions({
    difficulty: 'normal',
    limit: 50,
    importers,
    chunkCache: new Map(),
    yieldControl: async () => {}
  });

  const session = buildSession(loaded, { limit: 50, shuffle: true });
  assert.equal(session.length, 50);
});
