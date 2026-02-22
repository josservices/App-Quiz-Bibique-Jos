const BEST_SCORE_PREFIX = 'quiz-biblique-best-score:';
const THEME_KEY = 'quiz-biblique-theme';
const BOOK_SESSION_SIZE_KEY = 'quiz-biblique-last-book-session-size';
const GENERAL_SESSION_SIZE_KEY = 'quiz-biblique-last-general-session-size';
const memoryFallback = new Map<string, string>();

function safeGetItem(key: string): string | null {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) {
      return value;
    }
  } catch {
    // Ignore storage read errors and fallback to memory store.
  }

  return memoryFallback.get(key) ?? null;
}

function safeSetItem(key: string, value: string): void {
  memoryFallback.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage write errors and keep in-memory fallback.
  }
}

export function getBestScore(bookId: string): number {
  const value = safeGetItem(`${BEST_SCORE_PREFIX}${bookId}`);
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function saveBestScore(bookId: string, scorePercent: number): void {
  const current = getBestScore(bookId);
  if (scorePercent > current) {
    safeSetItem(`${BEST_SCORE_PREFIX}${bookId}`, String(scorePercent));
  }
}

export function getSavedTheme(): 'light' | 'dark' {
  const value = safeGetItem(THEME_KEY);
  return value === 'dark' ? 'dark' : 'light';
}

export function saveTheme(theme: 'light' | 'dark'): void {
  safeSetItem(THEME_KEY, theme);
}

export type SessionSizePreference = 20 | 30 | 50 | 'all';

function parseSessionSize(value: string | null, allowed: SessionSizePreference[]): SessionSizePreference {
  if (!value) return 30;
  if (value === 'all') return 'all';
  const num = Number(value);
  if (!Number.isFinite(num)) return 30;
  const parsed = num as SessionSizePreference;
  return allowed.includes(parsed) ? parsed : 30;
}

export function getLastBookSessionSize(): SessionSizePreference {
  return parseSessionSize(safeGetItem(BOOK_SESSION_SIZE_KEY), [20, 30, 50, 'all']);
}

export function saveLastBookSessionSize(size: SessionSizePreference): void {
  safeSetItem(BOOK_SESSION_SIZE_KEY, String(size));
}

export function getLastGeneralSessionSize(): SessionSizePreference {
  return parseSessionSize(safeGetItem(GENERAL_SESSION_SIZE_KEY), [30, 50, 'all']);
}

export function saveLastGeneralSessionSize(size: SessionSizePreference): void {
  safeSetItem(GENERAL_SESSION_SIZE_KEY, String(size));
}
