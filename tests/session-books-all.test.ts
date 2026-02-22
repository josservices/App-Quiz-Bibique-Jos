import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSession } from '../src/lib/quizEngine.ts';
import { makeQuestion } from './helpers.ts';

test('livres: all -> session.length = pool.length', () => {
  const pool = Array.from({ length: 75 }, (_, i) => makeQuestion(i + 1));
  const session = buildSession(pool, { limit: 'all', shuffle: true });
  assert.equal(session.length, 75);
});
