// Output in the viewer (spec 3.3, 5.6): nothing plays on its own. The sound
// button plays the recording, the speaker button says the name (Daniel,
// 2026-11-01). Each starts straight from its click handler, so the output
// comes from a user gesture (iOS), and each stops whatever is running.
import { withArticle } from "../../content/catalog.ts";
import type { CatalogAnimal } from "../../content/types.ts";
import { playSound, stopSound } from "../../platform/audio.ts";
import { cancelSpeech, say } from "../../platform/speech.ts";

/** The sound button: the animal's recording, nothing else. */
export function playAnimalSound(animal: CatalogAnimal): void {
  silence();
  const sound = animal.sound?.src;
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
