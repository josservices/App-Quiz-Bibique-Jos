import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSession, type QuizQuestion } from '../src/lib/quizEngine.ts';
import { makeQuestion } from './helpers.ts';

test('guard invalides: pas de crash, conserve valides', () => {
  const valid = Array.from({ length: 10 }, (_, i) => makeQuestion(i + 1));
  const invalid = {
    id: 'bad-1',
    question: '',
    choices: ['A'],
    correctIndex: 2
  } as unknown as QuizQuestion;

  const session = buildSession([...valid, invalid], { limit: 20, shuffle: true });
  assert.equal(session.length, 10);
  assert.ok(session.every((q) => q.question.startsWith('Question')));
});
