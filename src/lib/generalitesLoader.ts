import { sanitizeQuestions, type QuizQuestion } from './quizEngine.ts';

export type SessionLimit = number | 'all';

export interface GeneralitesProgress {
  loadedChunks: number;
  totalChunks: number;
  loadedQuestions: number;
}

export interface GeneralitesChunkModule {
  default: unknown;
}

export type GeneralitesChunkImporter = () => Promise<GeneralitesChunkModule>;
export type YieldControl = () => Promise<void>;

export interface LoadGeneralitesOptions {
  difficulty: 'normal' | 'difficile';
  limit: SessionLimit;
  importers: Record<string, GeneralitesChunkImporter>;
  chunkCache: Map<string, QuizQuestion[]>;
  onProgress?: (progress: GeneralitesProgress) => void;
  signal?: AbortSignal;
  yieldControl?: YieldControl;
}

const DIFFICULTY_FOLDER: Record<'normal' | 'difficile', string> = {
  normal: '/normal/',
  difficile: '/difficile/'
};

function abortError(): Error {
  const error = new Error('Chargement annulé par l’utilisateur.');
  error.name = 'AbortError';
  return error;
}

function ensureNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw abortError();
  }
}

async function defaultYieldControl(): Promise<void> {
  await new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idle = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback;
      idle(() => resolve());
      return;
    }
    globalThis.setTimeout(() => resolve(), 0);
  });
}

function sortedChunkPaths(importers: Record<string, GeneralitesChunkImporter>, difficulty: 'normal' | 'difficile'): string[] {
  const folder = DIFFICULTY_FOLDER[difficulty];
  return Object.keys(importers)
    .filter((path) => path.includes(folder))
    .sort((a, b) => a.localeCompare(b, 'fr'));
}

export async function loadGeneralitesQuestions(options: LoadGeneralitesOptions): Promise<QuizQuestion[]> {
  const {
    difficulty,
    limit,
    importers,
    chunkCache,
    onProgress,
    signal,
    yieldControl = defaultYieldControl
  } = options;

  const paths = sortedChunkPaths(importers, difficulty);
  if (paths.length === 0) {
    throw new Error(`Aucun chunk Généralités trouvé pour le niveau "${difficulty}".`);
  }

  const loadedQuestions: QuizQuestion[] = [];

  for (let index = 0; index < paths.length; index += 1) {
    ensureNotAborted(signal);

    const path = paths[index];
    const cachedChunk = chunkCache.get(path);
    let chunkQuestions = cachedChunk;

    if (!chunkQuestions) {
      const loader = importers[path];
      if (!loader) {
        throw new Error(`Chunk introuvable: ${path}`);
      }

      const mod = await loader();
      if (!Array.isArray(mod.default)) {
        throw new Error(`Chunk invalide (tableau attendu): ${path}`);
      }

      chunkQuestions = sanitizeQuestions(mod.default);
      chunkCache.set(path, chunkQuestions);
    }

    loadedQuestions.push(...chunkQuestions);
    onProgress?.({
      loadedChunks: index + 1,
      totalChunks: paths.length,
      loadedQuestions: loadedQuestions.length
    });

    if (limit !== 'all' && loadedQuestions.length >= limit) {
      break;
    }

    await yieldControl();
  }

  ensureNotAborted(signal);
  return loadedQuestions;
}
