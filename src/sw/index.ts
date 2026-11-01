/// <reference lib="webworker" />
import { matchPrecache } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { registerAppShell } from "./base.ts";

declare const self: ServiceWorkerGlobalScope;

// Precache, offline navigation and prompt-based updates (owned: base.ts).
// What is precached is set in vite.config.ts (spec 7): the app, every 640 px
// photo, the 1280 px file of each animal's first photo and all sounds.
registerAppShell();

const PHOTO_CACHE = "tiere-photos";
const MAX_PHOTOS = 600;

/**
 * Larger photo sizes (spec 7): cache first, kept after the first view. Offline
 * and not cached yet, the precached 640 px file of the same photo stands in,
 * so the app works fully in flight mode (criterion 10), just less sharp.
 */
registerRoute(
  ({ url, request }) =>
    request.destination === "image" &&
    url.origin === self.location.origin &&
    url.pathname.startsWith("/photos/"),
  async ({ request, url }) => {
    const cache = await caches.open(PHOTO_CACHE);
    const hit = await cache.match(request);
    if (hit) return hit;
    try {
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
        void trim(cache);
      }
      return response;
    } catch (error) {
      const fallback = await matchPrecache(url.pathname.replace(/-\d+\.webp$/, "-640.webp"));
      if (fallback) return fallback;
      throw error;
    }
  },
);

async function trim(cache: Cache): Promise<void> {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_PHOTOS))) await cache.delete(key);
}
