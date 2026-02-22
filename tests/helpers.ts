import type { QuizQuestion } from '../src/lib/quizEngine.ts';

export function makeQuestion(i: number): QuizQuestion {
  return {
    id: `q-${i}`,
    book: 'Livre Test',
    chapter: 1,
    verseRef: `Livre 1:${i}`,
    verseText: `Texte ${i}`,
    question: `Question ${i}`,
    choices: ['A', 'B', 'C'],
    correctIndex: 0,
    explanation: `Explication ${i}`
  };
}
