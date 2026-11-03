// The viewer's photo slideshow (spec 3.3): the photos of one animal cross-fade
// on their own, the child only swipes between animals.
import { cycle } from "./gestures.ts";

/** How long each photo stays before the next one fades in. */
export const SLIDE_MS = 6000;
/** How long the cross-fade takes (matches viewer.css). */
export const FADE_MS = 1500;

/** The photo after `current`; a single photo stays. */
export function nextSlide(current: number, count: number): number {
  return count < 2 ? 0 : cycle(current, 1, count);
}
