import { afterEach, describe, expect, it, vi } from "vitest";
import { playSound, primeSound, stopSound } from "./audio.ts";

afterEach(() => vi.restoreAllMocks());

describe("audio", () => {
  it("plays one sound at a time from the start", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    playSound("/sounds/kuh.m4a");
    playSound("/sounds/schaf.m4a");
    expect(play).toHaveBeenCalledTimes(2);
    // The second sound stops the first one before it starts (criterion 3).
    expect(pause).toHaveBeenCalledTimes(1);
    stopSound();
    expect(pause).toHaveBeenCalledTimes(2);
  });

  it("survives a refused or missing play()", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("NotAllowedError"));
    expect(() => playSound("/sounds/kuh.m4a")).not.toThrow();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => {
      throw new Error("not implemented");
    });
    expect(() => playSound("/sounds/kuh.m4a")).not.toThrow();
    expect(() => primeSound("/sounds/kuh.m4a")).not.toThrow();
  });
});
