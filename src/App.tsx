import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookList } from './components/BookList';
import { LoginView } from './components/LoginView';
import { QuizView } from './components/QuizView';
import { ResultView } from './components/ResultView';
import { SEO } from './components/SEO';
import { SessionSizeView } from './components/SessionSizeView';
import booksData from './data/books.json';
import { buildSession, computeScore, sanitizeQuestions, type QuizBook, type QuizQuestion } from './lib/quizEngine';
import { loadGeneralitesQuestions, type GeneralitesProgress } from './lib/generalitesLoader';
import {
  UI_ERROR_STABILIZATION_MS,
  canDisplayDeferredError,
  isLatestRequest
} from './lib/uiStability';
import {
  getBestScore,
  getLastBookSessionSize,
  getLastGeneralSessionSize,
  getSavedTheme,
  saveBestScore,
  saveLastBookSessionSize,
  saveLastGeneralSessionSize,
  saveTheme,
  type SessionSizePreference
} from './lib/storage';
import { getNetlifyIdentity, isNetlifyIdentityEnabled, type IdentityUser } from './lib/netlifyIdentity';
import { validateSimpleCredentials } from './lib/simpleAuth';

type ScreenState = 'books' | 'session-size' | 'quiz' | 'result';
type Difficulty = 'normal' | 'difficile';
type AuthGateState = 'checking' | 'open' | 'login-required';

interface DatasetLoadResult {
  modulePath: string;
  rawCount: number;
  validCount: number;
  questions: QuizQuestion[];
}

interface DebugInfo {
  bookId: string;
  difficulty: Difficulty;
  modulePath: string;
  rawCount: number;
  validCount: number;
  errorDetails: string | null;
}

const DIFFICILE_TIME_LIMIT_SECONDS = 10;
const SIMPLE_AUTH_STORAGE_KEY = 'simple_auth';

const books: QuizBook[] = booksData as QuizBook[];

const isDev = import.meta.env.DEV;
const requireLogin = import.meta.env.VITE_REQUIRE_LOGIN === 'true';
const simpleAuthUsername = (import.meta.env.VITE_APP_USER ?? '').trim();
const simpleAuthPassword = import.meta.env.VITE_APP_PASSWORD ?? '';
const useSimpleAuth = requireLogin && simpleAuthUsername.length > 0 && simpleAuthPassword.length > 0;
const questionImporters = import.meta.glob<{ default: unknown }>('./data/questions/*-*.json');
const generalitesChunkImporters = import.meta.glob<{ default: unknown }>('./data/questions/generalites/**/*.json');
const questionsCache = new Map<string, DatasetLoadResult>();
const generalitesChunkCache = new Map<string, QuizQuestion[]>();

function isGeneralBook(book: QuizBook | null): boolean {
  return !!book && book.id === 'generalitebible';
}

function getSessionOptions(book: QuizBook | null): SessionSizePreference[] {
  return isGeneralBook(book) ? [30, 50, 'all'] : [20, 30, 50, 'all'];
}

function toDatasetSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function toTitleCase(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getDatasetPath(book: QuizBook, difficulty: Difficulty): string {
  const baseFile = book.questionsFile?.trim();
  if (baseFile) {
    if (baseFile.endsWith('-normal.json')) {
      return `./data/questions/${baseFile.replace('-normal.json', `-${difficulty}.json`)}`;
    }
    if (baseFile.endsWith('-difficile.json')) {
      return `./data/questions/${baseFile.replace('-difficile.json', `-${difficulty}.json`)}`;
    }
  }

  const slug = toDatasetSlug(book.id || book.name);
  return `./data/questions/${slug}-${difficulty}.json`;
}

function getErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    const cause = 'cause' in error && error.cause ? `\nCause: ${String(error.cause)}` : '';
    return `${error.name}: ${error.message}\n${error.stack ?? ''}${cause}`.trim();
  }
  return String(error);
}

function isOfflineContentUnavailable(error: unknown): boolean {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (!offline) {
    return false;
  }

  if (!(error instanceof Error)) {
    return true;
  }

  const summary = `${error.name} ${error.message}`.toLowerCase();
  return (
    summary.includes('failed to fetch') ||
    summary.includes('networkerror') ||
    summary.includes('load failed') ||
    summary.includes('dynamically imported module') ||
    summary.includes('importing a module script failed')
  );
}

const OFFLINE_MISSING_CONTENT_MESSAGE =
  'Contenu non disponible hors ligne. Ouvrez ce livre une fois en ligne pour le mettre en cache.';

async function loadQuestionsForBook(book: QuizBook, difficulty: Difficulty): Promise<DatasetLoadResult> {
  const cacheKey = `${book.id}:${difficulty}`;
  const fromCache = questionsCache.get(cacheKey);
  if (fromCache) {
    return fromCache;
  }

  const modulePath = getDatasetPath(book, difficulty);
  const loader = questionImporters[modulePath];
  if (!loader) {
    throw new Error(`Dataset introuvable: ${modulePath}`);
  }

  const mod = await loader();
  if (!Array.isArray(mod.default)) {
    throw new Error(`Dataset invalide (tableau attendu): ${modulePath}`);
  }

  const rawQuestions = mod.default as unknown[];
  const sanitized = sanitizeQuestions(rawQuestions);
  const result: DatasetLoadResult = {
    modulePath,
    rawCount: rawQuestions.length,
    validCount: sanitized.length,
    questions: sanitized
  };
  questionsCache.set(cacheKey, result);
  return result;
}

function stripHint(question: string): string {
  return question.split('Indice:')[0].trim();
}

function stripLeadingQuestionNumber(question: string): string {
  return question
    .replace(/^\s*(?:[A-Za-z]{1,3}\s*)?\d{1,4}\s*[\].):\-]\s*/u, '')
    .trim();
}

function shuffleChoices(question: QuizQuestion): QuizQuestion {
  const indexedChoices = question.choices.map((choice, index) => ({ choice, index }));

  for (let i = indexedChoices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexedChoices[i], indexedChoices[j]] = [indexedChoices[j], indexedChoices[i]];
  }

  const choices = indexedChoices.map((item) => item.choice);
  const correctIndex = indexedChoices.findIndex((item) => item.index === question.correctIndex);

  return {
    ...question,
    choices,
    correctIndex
  };
}

function prepareWithYield<T>(task: () => T): Promise<T> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idle = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback;
      idle(() => resolve(task()));
      return;
    }

    globalThis.setTimeout(() => resolve(task()), 0);
  });
}

function nowInMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('books');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [timeLeft, setTimeLeft] = useState(DIFFICILE_TIME_LIMIT_SECONDS);
  const [theme, setTheme] = useState<'light' | 'dark'>(getSavedTheme());
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [authGate, setAuthGate] = useState<AuthGateState>(requireLogin ? 'checking' : 'open');
  const [identityUser, setIdentityUser] = useState<IdentityUser | null>(null);
  const [simpleAuthError, setSimpleAuthError] = useState<string | null>(null);
  const [isSimpleAuthSubmitting, setIsSimpleAuthSubmitting] = useState(false);

  const [questionPool, setQuestionPool] = useState<QuizQuestion[] | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [selectedSessionSize, setSelectedSessionSize] = useState<SessionSizePreference>(30);

  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);

  const prepTokenRef = useRef(0);
  const poolLoadRequestIdRef = useRef(0);
  const poolErrorTimerRef = useRef<number | null>(null);
  const loadingAbortRef = useRef<AbortController | null>(null);
  const timerCycleRef = useRef(0);
  const isLoadingPoolRef = useRef(false);
  const isPreparingRef = useRef(false);
  const previousScreenRef = useRef<ScreenState>('books');
  const appStartTimeRef = useRef(nowInMs());

  const traceDev = useCallback((event: string, payload?: Record<string, unknown>) => {
    if (!isDev) {
      return;
    }

    const elapsed = Math.round(nowInMs() - appStartTimeRef.current);
    console.info(`[DEV TRACE +${elapsed}ms] ${event}`, payload ?? {});
  }, []);

  const clearPoolErrorTimer = useCallback(() => {
    if (poolErrorTimerRef.current !== null) {
      window.clearTimeout(poolErrorTimerRef.current);
      poolErrorTimerRef.current = null;
    }
  }, []);

  const deferPoolError = useCallback((message: string, guard: () => boolean) => {
    clearPoolErrorTimer();
    poolErrorTimerRef.current = window.setTimeout(() => {
      poolErrorTimerRef.current = null;
      if (!guard()) {
        traceDev('loadError:ignored', { reason: 'guard-failed', message });
        return;
      }
      setPoolError(message);
      traceDev('loadError:displayed', { message });
    }, UI_ERROR_STABILIZATION_MS);
  }, [clearPoolErrorTimer, traceDev]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!requireLogin) {
      setAuthGate('open');
      return;
    }

    if (useSimpleAuth) {
      const isAuthenticated = typeof window !== 'undefined' && window.localStorage.getItem(SIMPLE_AUTH_STORAGE_KEY) === 'true';
      setIdentityUser(isAuthenticated ? { id: 'simple-auth-user' } : null);
      setAuthGate(isAuthenticated ? 'open' : 'login-required');
      return;
    }

    let active = true;
    const identity = getNetlifyIdentity();
    if (!identity) {
      setAuthGate('open');
      return;
    }

    const onInit = (user?: IdentityUser | Error | null) => {
      if (!active) {
        return;
      }
      const normalized = user instanceof Error ? null : (user ?? null);
      setIdentityUser(normalized);
      setAuthGate(normalized ? 'open' : 'login-required');
    };

    const onLogin = (user?: IdentityUser | Error | null) => {
      if (!active) {
        return;
      }
      const normalized = user instanceof Error ? null : (user ?? null);
      setIdentityUser(normalized);
      setAuthGate(normalized ? 'open' : 'login-required');
      identity.close();
    };

    const onLogout = () => {
      if (!active) {
        return;
      }
      setIdentityUser(null);
      setAuthGate('login-required');
    };

    const onError = () => {
      if (!active) {
        return;
      }
      setAuthGate('open');
    };

    const initIdentity = async () => {
      const enabled = await isNetlifyIdentityEnabled();
      if (!active) {
        return;
      }

      if (!enabled) {
        setAuthGate('open');
        return;
      }

      identity.on('init', onInit);
      identity.on('login', onLogin);
      identity.on('logout', onLogout);
      identity.on('error', onError);
      identity.init();
      const existingUser = identity.currentUser();
      if (existingUser) {
        setIdentityUser(existingUser);
        setAuthGate('open');
      }
    };

    void initIdentity();

    return () => {
      active = false;
      identity.off('init', onInit);
      identity.off('login', onLogin);
      identity.off('logout', onLogout);
      identity.off('error', onError);
    };
  }, []);

  useEffect(() => {
    isLoadingPoolRef.current = isLoadingPool;
  }, [isLoadingPool]);

  useEffect(() => {
    isPreparingRef.current = isPreparing;
  }, [isPreparing]);

  useEffect(() => {
    const from = previousScreenRef.current;
    if (from !== screen) {
      traceDev('screenTransition', { from, to: screen });
      previousScreenRef.current = screen;
    }
  }, [screen]);

  useEffect(() => {
    if (screen === 'quiz') {
      traceDev('questionIndexChange', { currentIndex, total: questions.length });
    }
  }, [currentIndex, questions.length, screen]);

  useEffect(() => () => clearPoolErrorTimer(), [clearPoolErrorTimer]);

  useEffect(() => {
    const updateStatus = () => {
      const next = typeof navigator !== 'undefined' ? !navigator.onLine : false;
      setIsOffline(next);
      traceDev('networkStatus', { offline: next });
    };

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, [traceDev]);

  const selectedBook = useMemo(() => {
    if (!selectedBookId) return null;
    return books.find((b) => b.id === selectedBookId) ?? null;
  }, [selectedBookId]);

  useEffect(() => {
    if (!selectedBookId || !selectedBook) {
      setQuestionPool(null);
      setPoolError(null);
      setIsLoadingPool(false);
      if (isDev) {
        setDebugInfo(null);
      }
      return;
    }

    if (isGeneralBook(selectedBook)) {
      setQuestionPool(null);
      setPoolError(null);
      setIsLoadingPool(false);
      return;
    }

    let active = true;
    const requestId = poolLoadRequestIdRef.current + 1;
    poolLoadRequestIdRef.current = requestId;
    setIsLoadingPool(true);
    clearPoolErrorTimer();
    setPoolError(null);
    setQuestionPool(null);
    traceDev('startLoad', { source: 'book-pool', requestId, bookId: selectedBook.id, difficulty });

    loadQuestionsForBook(selectedBook, difficulty)
      .then((result) => {
        if (!active || !isLatestRequest(poolLoadRequestIdRef.current, requestId)) {
          traceDev('loadSuccess:ignored', { source: 'book-pool', requestId, bookId: selectedBook.id });
          return;
        }

        if (isDev) {
          setDebugInfo({
            bookId: selectedBook.id,
            difficulty,
            modulePath: result.modulePath,
            rawCount: result.rawCount,
            validCount: result.validCount,
            errorDetails: null
          });
        }

        if (result.validCount === 0) {
          throw new Error(`Aucune question valide trouvée dans ${result.modulePath}`);
        }

        setQuestionPool(result.questions);
        traceDev('loadSuccess', {
          source: 'book-pool',
          requestId,
          bookId: selectedBook.id,
          rawCount: result.rawCount,
          validCount: result.validCount
        });
      })
      .catch((error) => {
        if (!active || !isLatestRequest(poolLoadRequestIdRef.current, requestId)) {
          traceDev('loadError:ignored', { source: 'book-pool', requestId, reason: 'stale-request' });
          return;
        }

        const errorDetails = getErrorDetails(error);
        console.error('Erreur chargement dataset quiz', {
          bookId: selectedBookId,
          difficulty,
          error,
          details: errorDetails
        });

        if (isDev) {
          setDebugInfo({
            bookId: selectedBook.id,
            difficulty,
            modulePath: getDatasetPath(selectedBook, difficulty),
            rawCount: 0,
            validCount: 0,
            errorDetails
          });
        }

        const message = isOfflineContentUnavailable(error)
          ? OFFLINE_MISSING_CONTENT_MESSAGE
          : `Impossible de charger les questions pour "${selectedBook.name}" (${difficulty}).`;

        deferPoolError(
          message,
          () =>
            canDisplayDeferredError({
              isLatest: isLatestRequest(poolLoadRequestIdRef.current, requestId),
              isLoading: isLoadingPoolRef.current,
              isPreparing: isPreparingRef.current
            })
        );
        traceDev('loadError', {
          source: 'book-pool',
          requestId,
          bookId: selectedBook.id,
          details: errorDetails
        });
      })
      .finally(() => {
        if (active && isLatestRequest(poolLoadRequestIdRef.current, requestId)) {
          setIsLoadingPool(false);
        }
      });

    return () => {
      active = false;
    };
  }, [difficulty, selectedBook, selectedBookId]);

  const startSessionPreparation = async (showQuizLoader = false) => {
    if (!selectedBook) {
      return;
    }

    const token = prepTokenRef.current + 1;
    prepTokenRef.current = token;
    timerCycleRef.current += 1;
    if (loadingAbortRef.current) {
      traceDev('abort', { source: 'session-load', token, reason: 'new-session-started' });
      loadingAbortRef.current.abort();
    }
    loadingAbortRef.current = null;

    clearPoolErrorTimer();
    setIsPreparing(true);
    setPoolError(null);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedIndex(null);
    setCorrectCount(0);
    setTimeLeft(DIFFICILE_TIME_LIMIT_SECONDS);

    if (showQuizLoader) {
      setScreen('quiz');
    }

    traceDev('startSession', {
      token,
      bookId: selectedBook.id,
      difficulty,
      selectedSessionSize,
      showQuizLoader
    });

    try {
      let poolForSession = questionPool;

      if (isGeneralBook(selectedBook)) {
        const controller = new AbortController();
        loadingAbortRef.current = controller;
        setLoadingProgress(null);
        traceDev('startLoad', { source: 'generalites', token, difficulty, selectedSessionSize });

        const progressHandler = (progress: GeneralitesProgress) => {
          if (prepTokenRef.current !== token) {
            return;
          }
          setLoadingProgress({ current: progress.loadedChunks, total: progress.totalChunks });
          setLoadingLabel(
            selectedSessionSize === 'all'
              ? `Chargement progressif des questions (${progress.loadedQuestions} chargées)...`
              : `Chargement des questions nécessaires (${progress.loadedQuestions} chargées)...`
          );
        };

        poolForSession = await loadGeneralitesQuestions({
          difficulty,
          limit: selectedSessionSize,
          importers: generalitesChunkImporters,
          chunkCache: generalitesChunkCache,
          onProgress: progressHandler,
          signal: controller.signal
        });

        loadingAbortRef.current = null;
        traceDev('loadSuccess', {
          source: 'generalites',
          token,
          loadedQuestions: poolForSession.length
        });
      } else if (!poolForSession) {
        throw new Error('Le dataset du livre est introuvable.');
      }

      if (!poolForSession || poolForSession.length === 0) {
        throw new Error('Aucune question disponible pour cette session.');
      }

      const options = { limit: selectedSessionSize, shuffle: true as const };
      const shouldYield = selectedSessionSize === 'all' && poolForSession.length > 500;

      const prepared = shouldYield
        ? await prepareWithYield(() => buildSession(poolForSession, options))
        : buildSession(poolForSession, options);

      if (prepTokenRef.current !== token) {
        return;
      }

      const finalQuestions = prepared.map((question) => {
        const cleanedQuestion: QuizQuestion = {
          ...question,
          question: stripLeadingQuestionNumber(stripHint(question.question))
        };

        return shuffleChoices(cleanedQuestion);
      });

      setQuestions(finalQuestions);
      setScreen('quiz');
    } catch (error) {
      if (!isLatestRequest(prepTokenRef.current, token)) {
        traceDev('loadError:ignored', { source: 'session-load', token, reason: 'stale-request' });
        return;
      }

      const errorDetails = getErrorDetails(error);
      const aborted = error instanceof Error && error.name === 'AbortError';

      if (aborted) {
        traceDev('abort', { source: 'session-load', token, reason: 'abort-controller' });
        setPoolError(null);
        setIsPreparing(false);
        setLoadingLabel(null);
        setLoadingProgress(null);
        setScreen('books');
        return;
      }

      console.error('Erreur préparation session quiz', {
        bookId: selectedBook.id,
        difficulty,
        selectedSessionSize,
        error,
        details: errorDetails
      });
      if (isDev) {
        setDebugInfo((prev) => ({
          bookId: selectedBook.id,
          difficulty,
          modulePath: prev?.modulePath ?? getDatasetPath(selectedBook, difficulty),
          rawCount: prev?.rawCount ?? 0,
          validCount: prev?.validCount ?? 0,
          errorDetails
        }));
      }
      const message = isOfflineContentUnavailable(error)
        ? OFFLINE_MISSING_CONTENT_MESSAGE
        : selectedSessionSize === 'all'
          ? `Impossible de charger toutes les questions pour "${selectedBook.name}" (${difficulty}).`
          : `Impossible de préparer la session pour "${selectedBook.name}" (${difficulty}).`;

      deferPoolError(message, () =>
        canDisplayDeferredError({
          isLatest: isLatestRequest(prepTokenRef.current, token),
          isLoading: isLoadingPoolRef.current,
          isPreparing: isPreparingRef.current
        })
      );
      traceDev('loadError', {
        source: 'session-load',
        token,
        bookId: selectedBook.id,
        details: errorDetails
      });
      setScreen('session-size');
    } finally {
      if (prepTokenRef.current === token) {
        setIsPreparing(false);
        setLoadingLabel(null);
        setLoadingProgress(null);
        loadingAbortRef.current = null;
      }
    }
  };

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (screen !== 'quiz' || difficulty !== 'difficile' || !currentQuestion || selectedIndex !== null) {
      return;
    }

    const cycle = timerCycleRef.current;

    if (timeLeft <= 0) {
      const isLastQuestion = currentIndex >= questions.length - 1;
      if (isLastQuestion) {
        const percent = computeScore(correctCount, questions.length);
        if (selectedBookId) {
          saveBestScore(`${selectedBookId}:${difficulty}`, percent);
        }
        setScreen('result');
        return;
      }

      setCurrentIndex((prev) => prev + 1);
      setSelectedIndex(null);
      return;
    }

    const timer = window.setTimeout(() => {
      if (cycle !== timerCycleRef.current) {
        return;
      }
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [
    correctCount,
    currentIndex,
    currentQuestion,
    difficulty,
    questions.length,
    screen,
    selectedBookId,
    selectedIndex,
    timeLeft
  ]);

  useEffect(() => {
    if (screen !== 'quiz' || difficulty !== 'difficile' || !currentQuestion || selectedIndex !== null) {
      return;
    }

    timerCycleRef.current += 1;
    setTimeLeft(DIFFICILE_TIME_LIMIT_SECONDS);
  }, [currentQuestion, difficulty, screen, selectedIndex]);

  const handleSelectBook = (bookId: string) => {
    const book = books.find((item) => item.id === bookId) ?? null;
    if (!book) {
      return;
    }

    prepTokenRef.current += 1;
    if (loadingAbortRef.current) {
      traceDev('abort', { source: 'session-load', reason: 'selectBook' });
      loadingAbortRef.current.abort();
    }
    loadingAbortRef.current = null;
    clearPoolErrorTimer();
    setIsPreparing(false);
    setLoadingLabel(null);
    setLoadingProgress(null);

    traceDev('selectBook', { bookId, difficulty });
    setSelectedBookId(bookId);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedIndex(null);
    setCorrectCount(0);
    setTimeLeft(DIFFICILE_TIME_LIMIT_SECONDS);
    setPoolError(null);

    const defaultSize = isGeneralBook(book) ? getLastGeneralSessionSize() : getLastBookSessionSize();
    setSelectedSessionSize(defaultSize);
    setScreen('session-size');
  };

  const handleSessionSizeSelect = (size: SessionSizePreference) => {
    setSelectedSessionSize(size);
  };

  const handleStartSession = () => {
    if (!selectedBook) {
      return;
    }

    if (isGeneralBook(selectedBook)) {
      saveLastGeneralSessionSize(selectedSessionSize);
    } else {
      saveLastBookSessionSize(selectedSessionSize);
    }

    void startSessionPreparation(false);
  };

  const handleChoice = (choiceIndex: number) => {
    if (!currentQuestion || selectedIndex !== null) {
      return;
    }

    setSelectedIndex(choiceIndex);
    if (choiceIndex === currentQuestion.correctIndex) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (!currentQuestion || selectedIndex === null) {
      return;
    }

    const isLastQuestion = currentIndex >= questions.length - 1;
    if (isLastQuestion) {
      const percent = computeScore(correctCount, questions.length);
      if (selectedBookId) {
        saveBestScore(`${selectedBookId}:${difficulty}`, percent);
      }
      setScreen('result');
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setSelectedIndex(null);
    setTimeLeft(DIFFICILE_TIME_LIMIT_SECONDS);
  };

  const handleBackToBooks = () => {
    if (loadingAbortRef.current) {
      traceDev('abort', { source: 'session-load', reason: 'back-to-books' });
      loadingAbortRef.current.abort();
    }
    loadingAbortRef.current = null;
    clearPoolErrorTimer();
    timerCycleRef.current += 1;
    setSelectedBookId(null);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedIndex(null);
    setCorrectCount(0);
    setTimeLeft(DIFFICILE_TIME_LIMIT_SECONDS);
    setPoolError(null);
    setLoadingLabel(null);
    setLoadingProgress(null);
    setIsPreparing(false);
    setScreen('books');
  };

  const handleGoHome = () => {
    handleBackToBooks();
  };

  const handleLogin = () => {
    setSimpleAuthError(null);
    const identity = getNetlifyIdentity();
    if (!identity) {
      return;
    }
    identity.open('login');
  };

  const handleSimpleLogin = ({ username, password }: { username: string; password: string }) => {
    setIsSimpleAuthSubmitting(true);
    setSimpleAuthError(null);

    const isValid = validateSimpleCredentials({
      username,
      password,
      expectedUsername: simpleAuthUsername,
      expectedPassword: simpleAuthPassword
    });

    if (!isValid) {
      setSimpleAuthError('Identifiant ou mot de passe incorrect.');
      setIsSimpleAuthSubmitting(false);
      return;
    }

    window.localStorage.setItem(SIMPLE_AUTH_STORAGE_KEY, 'true');
    setIdentityUser({ id: 'simple-auth-user' });
    setAuthGate('open');
    setIsSimpleAuthSubmitting(false);
  };

  const handleLogout = () => {
    if (useSimpleAuth) {
      window.localStorage.removeItem(SIMPLE_AUTH_STORAGE_KEY);
      setIdentityUser(null);
      setSimpleAuthError(null);
      setIsSimpleAuthSubmitting(false);
      if (requireLogin) {
        setAuthGate('login-required');
      }
      return;
    }

    const identity = getNetlifyIdentity();
    if (!identity) {
      return;
    }
    identity.logout();
    setIdentityUser(null);
    if (requireLogin) {
      setAuthGate('login-required');
    }
  };

  const handleRestart = () => {
    void startSessionPreparation(true);
  };

  const handleCancelLoading = () => {
    if (loadingAbortRef.current) {
      traceDev('abort', { source: 'session-load', reason: 'cancel-button' });
      loadingAbortRef.current.abort();
    }
  };

  const currentBestScore = selectedBookId ? getBestScore(`${selectedBookId}:${difficulty}`) : 0;
  const incorrectCount = questions.length - correctCount;
  const playedCount = currentIndex + (selectedIndex !== null ? 1 : 0);
  const liveIncorrectCount = Math.max(0, playedCount - correctCount);
  const isGeneralSelected = isGeneralBook(selectedBook);

  let seoTitle = 'Quiz Biblique - Louis Segond 1910';
  let seoDescription =
    'Quiz biblique en français sur la Louis Segond 1910. Choisissez un livre, un niveau et testez vos connaissances.';
  let seoPath = '/';

  if (selectedBook && !isGeneralSelected) {
    seoTitle = `Quiz ${selectedBook.name} - ${toTitleCase(difficulty)} | Louis Segond 1910`;
    seoDescription = `Questions bibliques sur ${selectedBook.name} en niveau ${difficulty}. Entraînez-vous chapitre après chapitre avec la Louis Segond 1910.`;
    seoPath = `/livre/${toDatasetSlug(selectedBook.id || selectedBook.name)}/${difficulty}`;
  } else if (selectedBook && isGeneralSelected) {
    seoTitle = 'Généralités de la Bible - Quiz | Louis Segond 1910';
    seoDescription =
      'Questions de généralités bibliques en français, niveau normal ou difficile, basées sur la Louis Segond 1910.';
    seoPath = `/generalites/${difficulty}`;
  }

  const showLoginView = requireLogin && authGate !== 'open';
  const showLogoutButton = requireLogin && (authGate === 'open' || identityUser !== null);

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-100 px-4 py-6 text-slate-900 dark:text-slate-100 sm:px-6 sm:py-8">
      <SEO title={seoTitle} description={seoDescription} path={seoPath} />

      <div className="mx-auto mb-8 flex w-full max-w-5xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Bible Louis Segond 1910
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Application Quiz</p>
          {isOffline ? (
            <p className="mt-2 inline-flex rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
              Hors ligne
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGoHome}
            className="rounded-2xl border border-slate-300 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Retour à l'accueil
          </button>
          <button
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            className="rounded-2xl border border-slate-300 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </button>
          {showLogoutButton ? (
            <button
              onClick={handleLogout}
              className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-900/50"
            >
              Se déconnecter
            </button>
          ) : null}
        </div>
      </div>

      {showLoginView ? (
        <LoginView
          isChecking={authGate === 'checking'}
          isSimpleAuth={useSimpleAuth}
          isSubmitting={isSimpleAuthSubmitting}
          errorMessage={simpleAuthError}
          onLogin={handleLogin}
          onSimpleLogin={handleSimpleLogin}
        />
      ) : null}

      {!showLoginView && screen === 'books' ? (
        <BookList
          books={books}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          onSelect={handleSelectBook}
        />
      ) : null}

      {!showLoginView && screen === 'session-size' && selectedBook ? (
        <SessionSizeView
          book={selectedBook}
          options={getSessionOptions(selectedBook)}
          selected={selectedSessionSize}
          isLoadingPool={isLoadingPool}
          isPreparing={isPreparing}
          poolError={poolError}
          loadingLabel={loadingLabel}
          loadingProgress={loadingProgress}
          onSelect={handleSessionSizeSelect}
          onStart={handleStartSession}
          onBack={handleBackToBooks}
          onCancelLoading={isGeneralBook(selectedBook) && selectedSessionSize === 'all' ? handleCancelLoading : undefined}
        />
      ) : null}

      {!showLoginView && screen === 'quiz' && isPreparing ? (
        <section className="mx-auto max-w-3xl rounded-3xl border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/65 sm:p-8">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Préparation de la session en cours...</p>
        </section>
      ) : null}

      {!showLoginView && screen === 'quiz' && !isPreparing && currentQuestion ? (
        <QuizView
          question={currentQuestion}
          index={currentIndex}
          total={questions.length}
          difficulty={difficulty}
          timeLeft={difficulty === 'difficile' && selectedIndex === null ? timeLeft : null}
          selectedIndex={selectedIndex}
          playedCount={playedCount}
          correctCount={correctCount}
          incorrectCount={liveIncorrectCount}
          onSelectChoice={handleChoice}
          onNext={handleNext}
        />
      ) : null}

      {!showLoginView && screen === 'result' ? (
        <ResultView
          total={questions.length}
          correct={correctCount}
          incorrect={incorrectCount}
          bestScore={currentBestScore}
          onRestart={handleRestart}
          onBackToBooks={handleBackToBooks}
        />
      ) : null}
    </main>
  );
}
