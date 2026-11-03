import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { nextSlide, SLIDE_MS } from "../../engine/slideshow.ts";

type Options = {
  /** Holds the current photo (zoomed in, dragging). */
  paused: boolean;
  /** A new key (another animal) starts again at the first photo. */
  resetKey: string;
  /** Called when the slideshow moves on by itself. */
  onAdvance?: () => void;
};

type State = { key: string; current: number; previous: number | undefined };

function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/**
 * Spec 3.3: steps through `count` photos every SLIDE_MS. `previous` is the
 * photo fading out until `fadeDone` is called.
 */
export function useSlideshow(count: number, { paused, resetKey, onAdvance }: Options) {
  const [state, setState] = useState<State>({ key: resetKey, current: 0, previous: undefined });
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "hidden",
    () => false,
  );
  const advanced = useRef(onAdvance);
  useEffect(() => {
    advanced.current = onAdvance;
  });

  // Another animal: back to its first photo, nothing fading out.
  let shown = state;
  if (state.key !== resetKey) {
    shown = { key: resetKey, current: 0, previous: undefined };
    setState(shown);
  }

  const current = Math.min(shown.current, Math.max(count - 1, 0));
  useEffect(() => {
    if (count < 2 || paused || hidden) return;
    const timer = setTimeout(() => {
      setState((s) =>
        // A step queued for the last animal must not move the new one.
        s.key === resetKey ? { ...s, current: nextSlide(current, count), previous: current } : s,
      );
      advanced.current?.();
    }, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [count, paused, hidden, current, resetKey]);

  const fadeDone = useCallback(() => {
    setState((s) => (s.previous === undefined ? s : { ...s, previous: undefined }));
  }, []);

  return { current, previous: shown.previous, fadeDone };
}
