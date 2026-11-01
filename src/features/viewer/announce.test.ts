import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogAnimal } from "../../content/types.ts";
import type { Settings } from "../../platform/storage.ts";
import { announce, sayName } from "./announce.ts";

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
const withSound = { ...cow, sound: { src: "/sounds/kuh.m4a" } };
const on: Settings = { mode: "kid", voice: true, sounds: true };

describe("announce", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never speaks on its own", () => {
    announce(cow, on);
    announce(withSound, on);
    expect(speech.say).not.toHaveBeenCalled();
  });

  it("plays the recording right away", () => {
    announce(withSound, on);
    expect(audio.playSound).toHaveBeenCalledWith("/sounds/kuh.m4a");
  });

  it("stays silent with the sounds off", () => {
    announce(withSound, { ...on, sounds: false });
    expect(audio.playSound).not.toHaveBeenCalled();
  });
});

describe("sayName", () => {
  beforeEach(() => vi.clearAllMocks());

  it("says only the name, never the sound word", () => {
    sayName(withSound);
    expect(speech.say).toHaveBeenCalledWith("Die Kuh");
    expect(audio.stopSound).toHaveBeenCalled();
  });
});
