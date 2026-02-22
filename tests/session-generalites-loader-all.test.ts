import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSession } from '../src/lib/quizEngine.ts';
import { loadGeneralitesQuestions } from '../src/lib/generalitesLoader.ts';
import { makeQuestion } from './helpers.ts';

test('généralités chunkées: all -> session.length = somme des chunks', async () => {
  const chunkA = Array.from({ length: 40 }, (_, index) => makeQuestion(index + 1));
  const chunkB = Array.from({ length: 35 }, (_, index) => makeQuestion(index + 41));
  const chunkC = Array.from({ length: 25 }, (_, index) => makeQuestion(index + 76));
  const expectedTotal = chunkA.length + chunkB.length + chunkC.length;

  const importers = {
    './data/questions/generalites/difficile/generalites-001.json': async () => ({ default: chunkA }),
    './data/questions/generalites/difficile/generalites-002.json': async () => ({ default: chunkB }),
    './data/questions/generalites/difficile/generalites-003.json': async () => ({ default: chunkC })
  };

  const loaded = await loadGeneralitesQuestions({
    difficulty: 'difficile',
    limit: 'all',
    importers,
    chunkCache: new Map(),
    yieldControl: async () => {}
  });

  const session = buildSession(loaded, { limit: 'all', shuffle: true });
  assert.equal(session.length, expectedTotal);
});
