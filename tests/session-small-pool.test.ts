import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSession } from '../src/lib/quizEngine.ts';
import { makeQuestion } from './helpers.ts';

test('si pool < 20 et limit 20 -> session.length = pool.length', () => {
  const pool = Array.from({ length: 12 }, (_, i) => makeQuestion(i + 1));
  const session = buildSession(pool, { limit: 20, shuffle: true });
  assert.equal(session.length, 12);
});
