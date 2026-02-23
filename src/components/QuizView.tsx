import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuizQuestion } from '../lib/quizEngine';
import { ProgressBar } from './ProgressBar';

interface QuizViewProps {
  question: QuizQuestion;
  index: number;
  total: number;
  difficulty: 'normal' | 'difficile';
  timeLimitSeconds: number;
  timerSeed: number;
  selectedIndex: number | null;
  playedCount: number;
  correctCount: number;
  incorrectCount: number;
  onSelectChoice: (index: number) => void;
  onNext: () => void;
  onTimeExpired: () => void;
}

export const QuizView = memo(function QuizView({
  question,
  index,
  total,
  difficulty,
  timeLimitSeconds,
  timerSeed,
  selectedIndex,
  playedCount,
  correctCount,
  incorrectCount,
  onSelectChoice,
  onNext,
  onTimeExpired
}: QuizViewProps) {
  const locked = selectedIndex !== null;
  const [showCount, setShowCount] = useState(false);
  const [timeLeft, setTimeLeft] = useState(difficulty === 'difficile' && !locked ? timeLimitSeconds : null);
  const timerDoneRef = useRef(false);
  const isTimed = difficulty === 'difficile';

  useEffect(() => {
    timerDoneRef.current = false;
    setTimeLeft(isTimed && !locked ? timeLimitSeconds : null);
  }, [isTimed, locked, question.id, timeLimitSeconds, timerSeed]);

  useEffect(() => {
    if (!isTimed || locked || timeLeft === null) {
      return;
    }

    if (timeLeft <= 0) {
      if (!timerDoneRef.current) {
        timerDoneRef.current = true;
        onTimeExpired();
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev === null) {
          return null;
        }
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isTimed, locked, onTimeExpired, timeLeft]);

  const getButtonClass = useCallback(
    (choiceIndex: number): string => {
      if (!locked) {
        return 'border-slate-200/70 bg-white/80 hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-50/80 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800';
      }

      if (choiceIndex === question.correctIndex) {
        return 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-100';
      }

      if (choiceIndex === selectedIndex) {
        return 'border-rose-500 bg-rose-100 text-rose-900 dark:border-rose-500 dark:bg-rose-900/30 dark:text-rose-100';
      }

      return 'border-slate-200 bg-white/70 opacity-75 dark:border-slate-700 dark:bg-slate-900';
    },
    [locked, question.correctIndex, selectedIndex]
  );

  const timeBadgeClass = useMemo(() => {
    if (timeLeft === null) {
      return '';
    }
    return timeLeft <= 3
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
  }, [timeLeft]);

  return (
    <section className="mx-auto max-w-4xl rounded-3xl border border-white/40 bg-white/70 p-5 shadow-2xl backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/65 sm:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white dark:bg-cyan-500 dark:text-slate-950">
          Question {index + 1} / {total}
        </p>
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Niveau: {difficulty === 'difficile' ? 'Difficile' : 'Normal'}
          </p>
          {timeLeft !== null ? <p className={`rounded-full px-3 py-1 text-xs font-bold ${timeBadgeClass}`}>{timeLeft}s</p> : null}
        </div>
      </header>

      <ProgressBar current={index + 1} total={total} />

      <p className="mt-7 text-xl font-bold leading-relaxed text-slate-900 dark:text-white sm:text-2xl">{question.question}</p>

      <div className="mt-7 grid gap-3">
        {question.choices.map((choice, choiceIndex) => (
          <button
            key={`${question.id}-${choiceIndex}`}
            disabled={locked}
            onClick={() => onSelectChoice(choiceIndex)}
            className={`rounded-2xl border px-4 py-4 text-left font-semibold transition ${getButtonClass(choiceIndex)}`}
          >
            {choice}
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setShowCount((prev) => !prev)}
          className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100 dark:border-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-100 dark:hover:bg-cyan-900/60"
        >
          Décompte
        </button>
      </div>

      {showCount ? (
        <article className="mt-3 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 text-sm dark:border-cyan-800 dark:bg-cyan-950/30">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">Décompte actuel</p>
          <p className="mt-2 text-slate-700 dark:text-slate-200">Nombre de questions jouées: {playedCount}</p>
          <p className="mt-1 text-slate-700 dark:text-slate-200">Nombre de bonnes réponses: {correctCount}</p>
          <p className="mt-1 text-slate-700 dark:text-slate-200">Nombre de mauvaises réponses: {incorrectCount}</p>
        </article>
      ) : null}

      {!locked ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          La référence et le texte du verset s’affichent après validation de votre réponse.
        </p>
      ) : null}

      {locked ? (
        <article className="mt-6 rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/40">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Référence du verset</p>
          <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{question.verseRef}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{question.verseText}</p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{question.explanation}</p>
        </article>
      ) : null}

      {locked ? (
        <button
          onClick={onNext}
          className="mt-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110"
        >
          Passer à la question suivante
        </button>
      ) : null}
    </section>
  );
});
