// Output in the viewer (spec 3.3, 5.6): nothing plays on its own. The sound
// button plays the recording, the speaker button the built name clip, "Vorlesen"
// the built facts clip. All share one <audio> element; each starts straight
// from its click handler (a user gesture, iOS) and stops whatever is running.
// Without a built clip the system voice stands in.
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

/** The speaker button: the name with its article ("Die Kuh!"), nothing else. */
export function sayName(animal: CatalogAnimal): void {
  silence();
  if (animal.speech) playSound(animal.speech.name);
  else say(withArticle(animal));
}

export function silence(): void {
  cancelSpeech();
  stopSound();
}

/** "Vorlesen" in the explorer panel: an explicit wish, so it speaks even with the voice off. */
export function readFacts(animal: CatalogAnimal): void {
  silence();
  if (animal.speech) playSound(animal.speech.facts);
  else say(`${withArticle(animal)}. ${animal.facts.join(" ")}`);
}
