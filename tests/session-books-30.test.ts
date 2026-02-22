import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSession } from '../src/lib/quizEngine.ts';
import { makeQuestion } from './helpers.ts';

test('livres: 30 -> session.length = 30', () => {
  const pool = Array.from({ length: 120 }, (_, i) => makeQuestion(i + 1));
  const session = buildSession(pool, { limit: 30, shuffle: true });
  assert.equal(session.length, 30);
});
