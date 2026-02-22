import { minQuestions } from './minQuestions.ts';

export interface QuizQuestion {
  id: string;
  book: string;
  chapter: number;
  verseRef: string;
  verseText: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizBook {
  id: string;
  name: string;
  chaptersCount: number;
  questionsFile: string;
}

export interface QuizSession {
  book: QuizBook;
  questions: QuizQuestion[];
}

export interface BuildSessionOptions {
  limit: number | 'all';
  shuffle?: boolean;
}

const FALLBACK_CHOICE = 'Aucune de ces réponses';

function normalizeChoicesAndIndex(
  rawChoices: unknown,
  rawCorrectIndex: unknown
): { choices: string[]; correctIndex: number } | null {
  if (!Array.isArray(rawChoices)) {
    return null;
  }

  const choices = rawChoices
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

  let correctIndex =
    typeof rawCorrectIndex === 'number' && Number.isInteger(rawCorrectIndex)
      ? rawCorrectIndex
      : Number.parseInt(String(rawCorrectIndex), 10);

  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) {
    return null;
  }

  if (choices.length === 2) {
    const fallback = choices.includes(FALLBACK_CHOICE) ? 'Réponse alternative' : FALLBACK_CHOICE;
    choices.push(fallback);
  } else if (choices.length > 3) {
    const correctChoice = choices[correctIndex];
    const reduced = [correctChoice, ...choices.filter((_, index) => index !== correctIndex).slice(0, 2)];
    return {
      choices: reduced,
      correctIndex: 0
    };
  }

  if (choices.length !== 3) {
    return null;
  }

  return {
    choices,
    correctIndex
  };
}

export function sanitizeQuestion(value: unknown): QuizQuestion | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<QuizQuestion> & { correctIndex?: unknown };
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) return null;
  if (typeof candidate.question !== 'string' || !candidate.question.trim()) return null;
  if (typeof candidate.verseRef !== 'string' || !candidate.verseRef.trim()) return null;

  const normalized = normalizeChoicesAndIndex(candidate.choices, candidate.correctIndex);
  if (!normalized) {
    return null;
  }

  const chapterNumber =
    typeof candidate.chapter === 'number' && Number.isFinite(candidate.chapter)
      ? candidate.chapter
      : Number.parseInt(String(candidate.chapter), 10);

  return {
    id: candidate.id.trim(),
    book: typeof candidate.book === 'string' ? candidate.book : '',
    chapter: Number.isFinite(chapterNumber) ? chapterNumber : 0,
    verseRef: candidate.verseRef.trim(),
    verseText: typeof candidate.verseText === 'string' ? candidate.verseText : '',
    question: candidate.question.trim(),
    choices: normalized.choices,
    correctIndex: normalized.correctIndex,
    explanation: typeof candidate.explanation === 'string' ? candidate.explanation : ''
  };
}

export function sanitizeQuestions(questions: unknown[]): QuizQuestion[] {
  return questions.map(sanitizeQuestion).filter((question): question is QuizQuestion => question !== null);
}

function isValidQuestion(value: unknown): value is QuizQuestion {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<QuizQuestion>;
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) return false;
  if (typeof candidate.question !== 'string' || !candidate.question.trim()) return false;
  if (typeof candidate.verseRef !== 'string' || !candidate.verseRef.trim()) return false;
  if (!Array.isArray(candidate.choices) || candidate.choices.length !== 3) return false;
  if (typeof candidate.correctIndex !== 'number') return false;
  if (candidate.correctIndex < 0 || candidate.correctIndex > 2) return false;

  return true;
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function pickRandomSubset<T>(items: T[], count: number): T[] {
  const n = items.length;
  if (count >= n) {
    return [...items];
  }

  const selected = new Set<number>();
  for (let i = n - count; i < n; i += 1) {
    const rand = Math.floor(Math.random() * (i + 1));
    if (selected.has(rand)) {
      selected.add(i);
    } else {
      selected.add(rand);
    }
  }

  const subset: T[] = [];
  for (const index of selected) {
    subset.push(items[index]);
  }
  return subset;
}

export function buildSession(questions: QuizQuestion[], options: BuildSessionOptions): QuizQuestion[] {
  const validQuestions = questions.filter(isValidQuestion);
  if (validQuestions.length === 0) {
    throw new Error('Aucune question valide disponible pour cette session.');
  }

  const requestedLimit = options.limit === 'all' ? validQuestions.length : options.limit;
  const effectiveLimit = Math.max(1, Math.min(requestedLimit, validQuestions.length));
  const shuffle = options.shuffle ?? true;

  const selected =
    effectiveLimit >= validQuestions.length
      ? [...validQuestions]
      : pickRandomSubset(validQuestions, effectiveLimit);

  if (!shuffle) {
    return selected;
  }

  return shuffleInPlace(selected);
}

export function buildQuizSession(book: QuizBook, questions: QuizQuestion[]): QuizSession {
  const minimum = minQuestions(book.chaptersCount);

  if (questions.length < minimum) {
    throw new Error(
      `Le livre ${book.name} nécessite au moins ${minimum} questions, reçu ${questions.length}.`
    );
  }

  return {
    book,
    questions
  };
}

export function computeScore(correctAnswers: number, totalQuestions: number): number {
  if (totalQuestions === 0) {
    return 0;
  }
  return Math.round((correctAnswers / totalQuestions) * 100);
}
