import { describe, expect, it } from "vitest";
import { HOLD_MS, holdProgress, isCorrect, makeQuestion } from "./gate.ts";

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

describe("holdProgress", () => {
  it("fills over 1.5 s and stops at 1", () => {
    expect(HOLD_MS).toBe(1500);
    expect(holdProgress(1000, 1000)).toBe(0);
    expect(holdProgress(1000, 1750)).toBe(0.5);
    expect(holdProgress(1000, 9000)).toBe(1);
    expect(holdProgress(1000, 500)).toBe(0);
  });
});

describe("makeQuestion", () => {
  it("asks two-digit plus two-digit with four distinct two-digit options", () => {
    for (let seed = 1; seed < 500; seed++) {
      const q = makeQuestion(seeded(seed));
      expect(q.a).toBeGreaterThanOrEqual(10);
      expect(q.a).toBeLessThanOrEqual(99);
      expect(q.b).toBeGreaterThanOrEqual(10);
      expect(q.b).toBeLessThanOrEqual(99);
      expect(q.answer).toBe(q.a + q.b);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.answer);
      for (const option of q.options) {
        expect(option).toBeGreaterThanOrEqual(10);
        expect(option).toBeLessThanOrEqual(99);
      }
    }
  });

  it("does not always put the answer first", () => {
    const positions = new Set<number>();
    for (let seed = 1; seed < 50; seed++) {
      const q = makeQuestion(seeded(seed));
      positions.add(q.options.indexOf(q.answer));
    }
    expect(positions.size).toBeGreaterThan(1);
  });
});

describe("isCorrect", () => {
  it("accepts only the sum", () => {
    const q = { a: 23, b: 45, answer: 68, options: [68, 69, 58, 78] };
    expect(isCorrect(q, 68)).toBe(true);
    expect(isCorrect(q, 69)).toBe(false);
  });
});
