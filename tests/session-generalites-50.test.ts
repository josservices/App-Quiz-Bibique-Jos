import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSession } from '../src/lib/quizEngine.ts';
import { makeQuestion } from './helpers.ts';

test('généralités: 50 -> session.length = 50', () => {
  const pool = Array.from({ length: 500 }, (_, i) => makeQuestion(i + 1));
  const session = buildSession(pool, { limit: 50, shuffle: true });
  assert.equal(session.length, 50);
});
