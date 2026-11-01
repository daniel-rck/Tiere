// Openverse (openverse.org): CC-licensed images from Flickr, museums and more,
// searched anonymously at build time. Wikimedia results are skipped because
// Commons is searched directly.
import { throttledFetch } from "../commons.ts";
import type { ExtraPhoto } from "./types.ts";

const API = "https://api.openverse.org/v1/images/";

type OpenverseImage = {
  id: string;
  title?: string | null;
  foreign_landing_url?: string | null;
  url?: string | null;
  thumbnail?: string | null;
  creator?: string | null;
  license: string;
  license_version?: string | null;
  provider?: string | null;
  source?: string | null;
  width?: number | null;
  height?: number | null;
  mature?: boolean;
};

/** Maps Openverse's license fields to a code for checkLicense. */
export function openverseLicense(license: string, version?: string | null): string {
  const code = license.toLowerCase();
  if (code === "cc0") return "cc0";
  if (code === "pdm") return "pd";
  return version ? `cc-${code}-${version}` : `cc-${code}`;
}

export async function searchOpenverse(query: string, limit: number): Promise<ExtraPhoto[]> {
  const params = new URLSearchParams({
    q: query,
    license: "by,by-sa,cc0,pdm",
    size: "large",
    mature: "false",
    page_size: String(Math.min(limit, 20)),
  });
  // Openverse sometimes times out on filtered searches: a few attempts, then give up.
  const response = await throttledFetch(`${API}?${params}`, 4);
  if (!response.ok) throw new Error(`Openverse ${response.status}`);
  const body = (await response.json()) as { results?: OpenverseImage[] };
  const photos: ExtraPhoto[] = [];
  for (const image of body.results ?? []) {
    if (image.mature || (image.provider ?? "").includes("wikimedia")) continue;
    if (!image.url || !image.thumbnail || !image.foreign_landing_url) continue;
    photos.push({
      id: `openverse:${image.id}`,
      name: `${image.title || "Ohne Titel"} (${image.source ?? image.provider ?? "Openverse"})`,
      pageUrl: image.foreign_landing_url,
      url: image.url,
      thumbUrl: image.thumbnail,
      width: image.width ?? 0,
      height: image.height ?? 0,
      license: openverseLicense(image.license, image.license_version),
      author: image.creator || "unbekannt",
    });
  }
  return photos;
}
