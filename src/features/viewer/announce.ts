// What happens when an animal shows up or is tapped (spec 3.3, 5.6): stop the
// running output and play the animal's recording. The name is only spoken on
// the speaker button (Daniel, 2026-11-01). Called straight from the tap or
// click handler, so the output comes from a user gesture (iOS).
import { withArticle } from "../../content/catalog.ts";
import type { CatalogAnimal } from "../../content/types.ts";
import { playSound, stopSound } from "../../platform/audio.ts";
import { cancelSpeech, say } from "../../platform/speech.ts";
import type { Settings } from "../../platform/storage.ts";

export function announce(animal: CatalogAnimal, settings: Settings): void {
  silence();
  const sound = settings.sounds ? animal.sound?.src : undefined;
  if (sound) playSound(sound);
}

/** The speaker button: the name with its article, nothing else. */
export function sayName(animal: CatalogAnimal): void {
  silence();
  say(withArticle(animal));
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
