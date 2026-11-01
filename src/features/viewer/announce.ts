// What happens when an animal shows up or is tapped (spec 3.3, 5.6): stop the
// running output, say the name, then play the sound. Called straight from the
// tap or click handler, so the first output comes from a user gesture (iOS).
import { withArticle } from "../../content/catalog.ts";
import type { CatalogAnimal } from "../../content/types.ts";
import { playSound, primeSound, stopSound } from "../../platform/audio.ts";
import { cancelSpeech, say } from "../../platform/speech.ts";
import type { Settings } from "../../platform/storage.ts";

export function announce(animal: CatalogAnimal, settings: Settings): void {
  silence();
  const sound = settings.sounds ? animal.sound?.src : undefined;
  const play = sound ? () => playSound(sound) : undefined;
  if (!settings.voice) {
    play?.();
    return;
  }
  // The sound starts after the name, outside this gesture: unlock it now.
  if (sound) primeSound(sound);
  const name = withArticle(animal);
  // With a recording: name, then the sound. Without one the sound word is
  // spoken; quiet animals get their "Psst" text.
  say(sound ? name : `${name}. ${animal.voice.text}`, play);
}

export function silence(): void {
  cancelSpeech();
  stopSound();
}

/** "Vorlesen" in the explorer panel: an explicit wish, so it speaks even with the voice off. */
export function readAloud(text: string): void {
  silence();
  say(text);
}
