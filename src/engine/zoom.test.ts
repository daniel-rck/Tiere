import { describe, expect, it } from "vitest";
import { clamp, IDENTITY, isZoomed, pan, pinch, toggle, zoomAt } from "./zoom.ts";

const stage = { width: 400, height: 800 };
// A 4:3 photo contained in the portrait stage: 400 × 300 at scale 1.
const content = { width: 400, height: 300 };

describe("clamp", () => {
  it("keeps the scale between 1 and 4", () => {
    expect(clamp({ scale: 0.5, x: 30, y: 10 }, content, stage)).toEqual(IDENTITY);
    expect(clamp({ scale: 9, x: 0, y: 0 }, content, stage).scale).toBe(4);
  });

  it("does not let the photo leave the stage", () => {
    // 2×: 800 × 600, may move 200 px sideways, not vertically (600 < 800).
    expect(clamp({ scale: 2, x: 500, y: 300 }, content, stage)).toEqual({ scale: 2, x: 200, y: 0 });
    expect(clamp({ scale: 2, x: -500, y: -300 }, content, stage)).toEqual({
      scale: 2,
      x: -200,
      y: 0,
    });
  });
});

describe("zoomAt", () => {
  it("keeps the focus point in place", () => {
    const zoomed = zoomAt(IDENTITY, 2, { x: 100, y: 50 });
    expect(zoomed).toEqual({ scale: 2, x: -100, y: -50 });
    // The photo point under the focus before: (100, 50); after: x + 2 * 100 = 100.
    expect(zoomed.x + 2 * 100).toBe(100);
  });
});

describe("pinch", () => {
  it("scales with the finger distance around their midpoint", () => {
    const result = pinch(
      IDENTITY,
      { x: -50, y: 0 },
      { x: 50, y: 0 },
      { x: -100, y: 0 },
      { x: 100, y: 0 },
    );
    expect(result).toEqual({ scale: 2, x: 0, y: 0 });
  });

  it("follows the fingers when they move together", () => {
    const result = pinch(
      IDENTITY,
      { x: -50, y: 0 },
      { x: 50, y: 0 },
      { x: -30, y: 20 },
      { x: 70, y: 20 },
    );
    expect(result).toEqual({ scale: 1, x: 20, y: 20 });
  });

  it("ignores fingers on the same spot", () => {
    expect(pinch(IDENTITY, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 9, y: 0 })).toEqual(
      IDENTITY,
    );
  });
});

describe("pan and toggle", () => {
  it("only pans a zoomed photo", () => {
    expect(pan(IDENTITY, 30, 0)).toEqual(IDENTITY);
    expect(pan({ scale: 2, x: 0, y: 0 }, 30, -10)).toEqual({ scale: 2, x: 30, y: -10 });
  });

  it("double tap zooms to 2.5× and back", () => {
    const zoomed = toggle(IDENTITY, { x: 40, y: 0 });
    expect(zoomed.scale).toBe(2.5);
    expect(isZoomed(zoomed)).toBe(true);
    expect(toggle(zoomed, { x: 0, y: 0 })).toEqual(IDENTITY);
    expect(isZoomed(IDENTITY)).toBe(false);
  });
});
