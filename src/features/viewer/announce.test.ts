import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogAnimal } from "../../content/types.ts";
import type { Settings } from "../../platform/storage.ts";
import { announce } from "./announce.ts";

const speech = vi.hoisted(() => ({
  say: vi.fn<(text: string, onEnd?: () => void) => void>(),
  cancelSpeech: vi.fn<() => void>(),
}));
const audio = vi.hoisted(() => ({
  playSound: vi.fn<(src: string) => void>(),
  primeSound: vi.fn<(src: string) => void>(),
  stopSound: vi.fn<() => void>(),
}));
vi.mock("../../platform/speech.ts", () => speech);
vi.mock("../../platform/audio.ts", () => audio);

const cow = {
  id: "kuh",
  world: "bauernhof",
  name: "Kuh",
  article: "die",
  voice: { kind: "sound", text: "Muuuh!" },
  facts: ["a", "b"],
  photos: [],
  sound: null,
} as CatalogAnimal;
const on: Settings = { mode: "kid", voice: true, sounds: true };

describe("announce", () => {
  beforeEach(() => vi.clearAllMocks());

  it("says only the name when there is no recording", () => {
    announce(cow, on);
    expect(speech.say).toHaveBeenCalledWith("Die Kuh", undefined);
  });

  it("never speaks the quiet text", () => {
    announce({ ...cow, voice: { kind: "quiet", text: "Psst." } }, on);
    expect(speech.say).toHaveBeenCalledWith("Die Kuh", undefined);
  });

  it("plays the recording after the name", () => {
    announce({ ...cow, sound: { src: "/sounds/kuh.m4a" } }, on);
    const [text, onEnd] = speech.say.mock.calls[0] ?? [];
    expect(text).toBe("Die Kuh");
    onEnd?.();
    expect(audio.playSound).toHaveBeenCalledWith("/sounds/kuh.m4a");
  });
});
