import { describe, expect, it } from "vitest";
import { FADE_MS, nextSlide, SLIDE_MS } from "./slideshow.ts";

describe("nextSlide", () => {
  it("cycles through the photos", () => {
    expect(nextSlide(0, 4)).toBe(1);
    expect(nextSlide(3, 4)).toBe(0);
  });

  it("stays on a single photo", () => {
    expect(nextSlide(0, 1)).toBe(0);
    expect(nextSlide(0, 0)).toBe(0);
  });

  it("fades well within the time a photo stays", () => {
    expect(FADE_MS * 2).toBeLessThan(SLIDE_MS);
  });
});
