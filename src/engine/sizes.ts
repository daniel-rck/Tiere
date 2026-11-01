// Picking an image size (spec 3.2, 3.3): the smallest generated width that
// still covers the rendered pixels, so phones don't load 1920 px for a tile.

export type Size = { w: number; src: string };

/** Rendered size of a `width` × `height` photo with object-fit: contain in a box. */
export function containSize(
  width: number,
  height: number,
  boxWidth: number,
  boxHeight: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(boxWidth / width, boxHeight / height);
  return { width: width * scale, height: height * scale };
}

/** Rendered width of the image with object-fit: cover in a box. */
export function coverWidth(
  width: number,
  height: number,
  boxWidth: number,
  boxHeight: number,
): number {
  if (width <= 0 || height <= 0) return boxWidth;
  const scale = Math.max(boxWidth / width, boxHeight / height);
  return width * scale;
}

/**
 * The smallest size whose width is at least `cssWidth × dpr` (a small
 * tolerance keeps 1290 px screens on the 1280 file), otherwise the largest.
 * `sizes` must be sorted ascending.
 */
export function pickSize(sizes: readonly Size[], cssWidth: number, dpr = 1): Size | undefined {
  const needed = cssWidth * Math.max(1, dpr) * 0.95;
  return sizes.find((size) => size.w >= needed) ?? sizes.at(-1);
}

/** `srcset` attribute value: "a.webp 640w, b.webp 1280w". */
export function srcSet(sizes: readonly Size[]): string {
  return sizes.map((size) => `${size.src} ${size.w}w`).join(", ");
}
