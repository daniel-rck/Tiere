import { describe, expect, it } from "vitest";
import { containSize, coverWidth, pickSize, type Size, srcSet } from "./sizes.ts";

const sizes: Size[] = [
  { w: 640, src: "/p/1-640.webp" },
  { w: 1280, src: "/p/1-1280.webp" },
  { w: 1920, src: "/p/1-1920.webp" },
];

describe("containSize", () => {
  it("fits a landscape photo into a portrait screen by width", () => {
    expect(containSize(4000, 3000, 400, 800)).toEqual({ width: 400, height: 300 });
  });

  it("fits a portrait photo into a landscape screen by height", () => {
    expect(containSize(3000, 4000, 1000, 600)).toEqual({ width: 450, height: 600 });
  });

  it("is empty for a broken photo", () => {
    expect(containSize(0, 0, 400, 800)).toEqual({ width: 0, height: 0 });
  });
});

describe("coverWidth", () => {
  it("covers a 4:5 tile with a landscape photo by height", () => {
    expect(coverWidth(4000, 3000, 200, 250)).toBeCloseTo(333.33, 1);
  });

  it("falls back to the box width", () => {
    expect(coverWidth(0, 0, 200, 250)).toBe(200);
  });
});

describe("pickSize", () => {
  it.each([
    [180, 2, 640],
    [400, 3, 1280],
    [430, 3, 1280],
    [1024, 2, 1920],
    [3000, 2, 1920],
    [300, 0, 640],
  ])("%s css px at dpr %s → %s", (css, dpr, w) => {
    expect(pickSize(sizes, css, dpr)?.w).toBe(w);
  });

  it("handles a photo with fewer sizes", () => {
    expect(pickSize(sizes.slice(0, 1), 1000, 2)?.w).toBe(640);
    expect(pickSize([], 1000, 2)).toBeUndefined();
  });
});

describe("srcSet", () => {
  it("lists every size with its width", () => {
    expect(srcSet(sizes)).toBe("/p/1-640.webp 640w, /p/1-1280.webp 1280w, /p/1-1920.webp 1920w");
  });
});
