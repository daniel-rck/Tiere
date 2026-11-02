import { afterEach, describe, expect, it, vi } from "vitest";
import { isInstalled } from "./display.ts";

afterEach(() => vi.restoreAllMocks());

function matching(match: string) {
  const original = window.matchMedia;
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    ...original(query),
    matches: query === match,
  }));
}

describe("isInstalled", () => {
  it("is false in a browser tab", () => {
    expect(isInstalled()).toBe(false);
  });

  it("is true in the standalone and the fullscreen display mode", () => {
    matching("(display-mode: standalone)");
    expect(isInstalled()).toBe(true);
    vi.restoreAllMocks();
    matching("(display-mode: fullscreen)");
    expect(isInstalled()).toBe(true);
  });

  it("is true on the iOS home screen", () => {
    Object.defineProperty(navigator, "standalone", { value: true, configurable: true });
    try {
      expect(isInstalled()).toBe(true);
    } finally {
      Reflect.deleteProperty(navigator, "standalone");
    }
  });
});
