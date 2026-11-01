// What happens when an animal shows up or is tapped (spec 3.3, 5.6): stop the
// running output, say the name, then the sound word. Called straight from the
// tap or click handler, so the first output comes from a user gesture (iOS).
import { withArticle } from "../../content/catalog.ts";
import type { CatalogAnimal } from "../../content/types.ts";
import { cancelSpeech, say } from "../../platform/speech.ts";
import type { Settings } from "../../platform/storage.ts";

export function announce(animal: CatalogAnimal, settings: Settings): void {
  if (!settings.voice) {
    cancelSpeech();
    return;
  }
  const name = withArticle(animal);
  // The quiet animals' text is spoken; sound words are spoken until the
  // recorded sounds arrive (phase 7).
  say(`${name}. ${animal.voice.text}`);
}

export function silence(): void {
  cancelSpeech();
}
