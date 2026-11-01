// Parents' gate (spec 3.1, 3.4): hold the gear for 1.5 s, then solve a
// two-digit + two-digit sum with four answer buttons. DOM-free.

export const HOLD_MS = 1500;

/** Progress 0…1 of the long press that opens the gate. */
export function holdProgress(startedAt: number, now: number, holdMs = HOLD_MS): number {
  if (now <= startedAt) return 0;
  return Math.min(1, (now - startedAt) / holdMs);
}

export type Question = { a: number; b: number; answer: number; options: number[] };

/** `random` returns [0, 1) like Math.random; injectable for tests. */
export function makeQuestion(random: () => number = Math.random): Question {
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  // Both addends two-digit, the sum stays below 100 so every answer is two-digit too.
  const a = int(12, 59);
  const b = int(11, Math.min(79, 99 - a - 11));
  const answer = a + b;
  // Wrong answers that a guess or a carry mistake would give.
  const wrong = [answer + 1, answer - 1, answer + 10, answer - 10].filter(
    (n) => n >= 10 && n <= 99 && n !== answer,
  );
  const picked: number[] = [];
  while (picked.length < 3 && wrong.length > 0) {
    const [n] = wrong.splice(int(0, wrong.length - 1), 1);
    if (n !== undefined) picked.push(n);
  }
  const options = [answer, ...picked];
  // Fisher–Yates, so the right answer is not always first.
  for (let i = options.length - 1; i > 0; i--) {
    const j = int(0, i);
    [options[i], options[j]] = [options[j] as number, options[i] as number];
  }
  return { a, b, answer, options };
}

export function isCorrect(question: Question, choice: number): boolean {
  return choice === question.answer;
}
