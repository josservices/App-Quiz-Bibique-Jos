import { memo } from 'react';
import type { QuizBook } from '../lib/quizEngine';

type Difficulty = 'normal' | 'difficile';

interface BookListProps {
  books: QuizBook[];
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onSelect: (bookId: string) => void;
}

export const BookList = memo(function BookList({ books, difficulty, onDifficultyChange, onSelect }: BookListProps) {
  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/65 sm:p-8">
      <p className="inline-flex rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
        Plateforme Quiz LSG 1910
      </p>
      <h1 className="mt-4 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
        Quiz biblique professionnel
      </h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
        Questions bibliques directes, sans indice, avec mode normal et mode difficile.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/30">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Niveau de jeu
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            onClick={() => onDifficultyChange('normal')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              difficulty === 'normal'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => onDifficultyChange('difficile')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              difficulty === 'difficile'
                ? 'bg-rose-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Difficile (10s)
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
        {books.map((book, index) => {
          const isLastGeneralite = index === books.length - 1 && book.id === 'generalitebible';
          const details = isLastGeneralite
            ? 'Toute la Bible - 1189 chapitres disponibles'
            : `${book.chaptersCount} chapitres disponibles`;

          return (
            <button
              key={book.id}
              onClick={() => onSelect(book.id)}
              className={`group rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-3.5 text-left shadow-sm transition hover:-translate-y-1 hover:border-cyan-400 hover:shadow-lg dark:border-slate-700 dark:from-slate-900 dark:to-slate-800 ${
                isLastGeneralite ? 'sm:col-span-2 text-center' : ''
              }`}
            >
              <p className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">{book.name}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{details}</p>
              <p className="mt-3 text-xs font-semibold text-cyan-700 transition group-hover:text-cyan-600 dark:text-cyan-300">
                Démarrer le quiz
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
});
