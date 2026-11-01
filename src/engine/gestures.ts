// Gesture classification for the viewer (spec 3.3), DOM-free. The viewer
// feeds it pointer positions with timestamps; pinch lives in zoom.ts.

export type Point = { x: number; y: number; /** ms */ t: number };

export type Direction = "left" | "right" | "up" | "down";

export type Gesture =
  | { kind: "tap"; x: number; y: number }
  | { kind: "swipe"; direction: Direction }
  | { kind: "none" };

/** A tap moves less than this (px) … */
export const TAP_SLOP = 12;
/** … and is shorter than this (ms). */
export const TAP_MAX_MS = 500;
/** A swipe travels at least this far along its axis (px) … */
export const SWIPE_MIN = 60;
/** … or at least SWIPE_FLICK_MIN px at this speed (px/ms). */
export const SWIPE_FLICK_SPEED = 0.5;
export const SWIPE_FLICK_MIN = 30;
/** Second tap within this time (ms) and distance (px) makes a double tap. */
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_SLOP = 40;
/** Movement (px) before a drag commits to an axis. */
export const AXIS_LOCK = 10;

/** Classifies one finished single-pointer gesture. */
export function classify(start: Point, end: Point): Gesture {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const ms = Math.max(1, end.t - start.t);
  if (ax < TAP_SLOP && ay < TAP_SLOP) {
    return ms <= TAP_MAX_MS ? { kind: "tap", x: end.x, y: end.y } : { kind: "none" };
  }
  const horizontal = ax > ay;
  const distance = horizontal ? ax : ay;
  // Diagonal drags (axes within 1.2×) are ambiguous: neither animal nor photo changes.
  if (Math.max(ax, ay) < Math.min(ax, ay) * 1.2) return { kind: "none" };
  const flick = distance >= SWIPE_FLICK_MIN && distance / ms >= SWIPE_FLICK_SPEED;
  if (distance < SWIPE_MIN && !flick) return { kind: "none" };
  if (horizontal) return { kind: "swipe", direction: dx < 0 ? "left" : "right" };
  return { kind: "swipe", direction: dy < 0 ? "up" : "down" };
}

/** Whether `tap` completes a double tap after the `previous` one. */
export function isDoubleTap(previous: Point | undefined, tap: Point): boolean {
  if (!previous) return false;
  return (
    tap.t - previous.t <= DOUBLE_TAP_MS &&
    Math.hypot(tap.x - previous.x, tap.y - previous.y) <= DOUBLE_TAP_SLOP
  );
}

/** The axis a running drag follows, once it moved far enough. */
export function dragAxis(dx: number, dy: number): "x" | "y" | undefined {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK) return undefined;
  return Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
}

/** Next index in a cyclic list (animals of a world, photos of an animal). */
export function cycle(index: number, step: number, length: number): number {
  if (length <= 0) return 0;
  return (((index + step) % length) + length) % length;
}
