import { describe, expect, it } from "vitest";
import { classify, cycle, dragAxis, isDoubleTap, type Point } from "./gestures.ts";

const p = (x: number, y: number, t = 0): Point => ({ x, y, t });

describe("classify", () => {
  it("recognises a short, still touch as a tap", () => {
    expect(classify(p(100, 100), p(105, 96, 120))).toEqual({ kind: "tap", x: 105, y: 96 });
  });

  it("ignores a long press", () => {
    expect(classify(p(100, 100), p(101, 100, 900))).toEqual({ kind: "none" });
  });

  it.each([
    [p(120, 200, 300), "left"],
    [p(280, 200, 300), "right"],
    [p(200, 120, 300), "up"],
    [p(200, 280, 300), "down"],
  ] as const)("a swipe to %o goes %s", (end, direction) => {
    expect(classify(p(200, 200), end)).toEqual({ kind: "swipe", direction });
  });

  it("needs 60 px for a slow swipe", () => {
    expect(classify(p(200, 200), p(150, 205, 400))).toEqual({ kind: "none" });
    expect(classify(p(200, 200), p(130, 205, 400))).toEqual({ kind: "swipe", direction: "left" });
  });

  it("accepts a short fast flick", () => {
    expect(classify(p(200, 200), p(160, 202, 50))).toEqual({ kind: "swipe", direction: "left" });
  });

  it("ignores diagonal drags", () => {
    expect(classify(p(200, 200), p(120, 125, 300))).toEqual({ kind: "none" });
  });
});

describe("isDoubleTap", () => {
  it("needs a previous tap close in time and place", () => {
    expect(isDoubleTap(undefined, p(10, 10, 100))).toBe(false);
    expect(isDoubleTap(p(10, 10, 0), p(20, 15, 250))).toBe(true);
    expect(isDoubleTap(p(10, 10, 0), p(20, 15, 400))).toBe(false);
    expect(isDoubleTap(p(10, 10, 0), p(120, 15, 200))).toBe(false);
  });
});

describe("dragAxis", () => {
  it("waits until the drag moved enough", () => {
    expect(dragAxis(4, 3)).toBeUndefined();
    expect(dragAxis(-30, 8)).toBe("x");
    expect(dragAxis(5, 22)).toBe("y");
  });
});

describe("cycle", () => {
  it("wraps around in both directions", () => {
    expect(cycle(4, 1, 5)).toBe(0);
    expect(cycle(0, -1, 5)).toBe(4);
    expect(cycle(2, 1, 5)).toBe(3);
    expect(cycle(0, 1, 0)).toBe(0);
  });
});
