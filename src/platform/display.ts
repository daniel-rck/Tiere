// Whether the app runs installed (home screen) or in a browser tab (spec 3.5).

const INSTALLED_MODES = ["(display-mode: standalone)", "(display-mode: fullscreen)"];

/**
 * True when the app runs as an installed PWA. The manifest asks for
 * `fullscreen` (falling back to `standalone`); iOS reports `navigator.standalone`.
 */
export function isInstalled(): boolean {
  try {
    if (INSTALLED_MODES.some((query) => window.matchMedia?.(query).matches)) return true;
    return (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}
