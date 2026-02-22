export function minQuestions(chaptersCount: number): number {
  const base = chaptersCount * 3;
  let threshold = 0;

  if (chaptersCount >= 41 && chaptersCount <= 50) {
    threshold = 80;
  }

  return Math.max(base, threshold);
}
