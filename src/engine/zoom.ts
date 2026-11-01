// Zoom and pan for the explorer mode (spec 3.3): pinch 1–4×, drag to move,
// double tap toggles 1× ↔ 2.5× at the tapped spot. DOM-free.
//
// The photo is drawn with `transform: translate(x, y) scale(scale)` around the
// centre of the stage. Points are given relative to that centre.

export type Zoom = { scale: number; x: number; y: number };
export type Box = { width: number; height: number };
export type Vec = { x: number; y: number };

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const DOUBLE_TAP_SCALE = 2.5;
export const IDENTITY: Zoom = { scale: 1, x: 0, y: 0 };

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Keeps the scale in 1…4 and the photo on the stage: no gap opens on a side
 * the photo could still fill. `content` is the photo's size at scale 1.
 */
export function clamp(zoom: Zoom, content: Box, stage: Box): Zoom {
  const scale = clampNumber(zoom.scale, MIN_SCALE, MAX_SCALE);
  if (scale === 1) return IDENTITY;
  const maxX = Math.max(0, (content.width * scale - stage.width) / 2);
  const maxY = Math.max(0, (content.height * scale - stage.height) / 2);
  return {
    scale,
    x: clampNumber(zoom.x, -maxX, maxX) || 0,
    y: clampNumber(zoom.y, -maxY, maxY) || 0,
  };
}

/** Scales to `scale` while the stage point `focus` stays where it is. */
export function zoomAt(zoom: Zoom, scale: number, focus: Vec): Zoom {
  const ratio = scale / zoom.scale;
  return {
    scale,
    x: focus.x - (focus.x - zoom.x) * ratio,
    y: focus.y - (focus.y - zoom.y) * ratio,
  };
}

/** Two-finger gesture from (a0, b0) to (a1, b1), starting at `from`. */
export function pinch(from: Zoom, a0: Vec, b0: Vec, a1: Vec, b1: Vec): Zoom {
  const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y);
  const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
  if (d0 === 0) return from;
  const scale = from.scale * (d1 / d0);
  const mid0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
  const mid1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
  const zoomed = zoomAt(from, scale, mid0);
  return { scale, x: zoomed.x + mid1.x - mid0.x, y: zoomed.y + mid1.y - mid0.y };
}

/** Moves a zoomed photo by a drag. */
export function pan(zoom: Zoom, dx: number, dy: number): Zoom {
  return zoom.scale > 1 ? { ...zoom, x: zoom.x + dx, y: zoom.y + dy } : zoom;
}

/** Double tap: zoom in at the spot, or back out. */
export function toggle(zoom: Zoom, focus: Vec): Zoom {
  return zoom.scale > 1 ? IDENTITY : zoomAt(IDENTITY, DOUBLE_TAP_SCALE, focus);
}

export const isZoomed = (zoom: Zoom) => zoom.scale > 1.01;
