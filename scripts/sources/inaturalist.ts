// iNaturalist (inaturalist.org): research-grade observations with community-
// verified species, annotated as alive. Only photos under CC0, CC BY or CC BY-SA; iNaturalist's CC
// licenses are version 4.0. One photo per observation for variety.
import { throttledFetch } from "../commons.ts";
import type { ExtraPhoto } from "./types.ts";

const API = "https://api.inaturalist.org/v1";

type Taxon = { id: number; name: string; rank: string };
type Photo = {
  id: number;
  license_code?: string | null;
  url: string;
  original_dimensions?: { width: number; height: number } | null;
};
type Observation = {
  id: number;
  uri: string;
  user: { login: string; name?: string | null };
  photos: Photo[];
};

/** Maps an iNaturalist license code ("cc-by-sa", "cc0") to a code for checkLicense. */
export function inaturalistLicense(code: string): string {
  return code === "cc0" ? "cc0" : `${code}-4.0`;
}

async function getJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const response = await throttledFetch(`${API}${path}?${new URLSearchParams(params)}`, 8);
  if (!response.ok) throw new Error(`iNaturalist ${response.status}`);
  return (await response.json()) as T;
}

export async function findTaxon(latin: string): Promise<Taxon | undefined> {
  const body = await getJson<{ results: Taxon[] }>("/taxa", { q: latin, per_page: "5" });
  const exact = body.results.find((t) => t.name.toLowerCase() === latin.toLowerCase());
  return exact ?? body.results[0];
}

export async function searchInaturalist(taxonId: number, limit: number): Promise<ExtraPhoto[]> {
  const body = await getJson<{ results: Observation[] }>("/observations", {
    taxon_id: String(taxonId),
    photo_license: "cc0,cc-by,cc-by-sa",
    quality_grade: "research",
    photos: "true",
    order_by: "votes",
    // Annotation "Alive or Dead" = Alive. iNaturalist also records bones and
    // carcasses as evidence; unannotated observations are left out on purpose.
    term_id: "17",
    term_value_id: "18",
    per_page: String(Math.min(limit * 3, 100)),
  });
  const photos: ExtraPhoto[] = [];
  for (const observation of body.results) {
    const photo = observation.photos.find(
      (p) => p.license_code && ["cc0", "cc-by", "cc-by-sa"].includes(p.license_code),
    );
    if (!photo?.license_code || !photo.original_dimensions) continue;
    photos.push({
      id: `inaturalist:${photo.id}`,
      name: `Beobachtung ${observation.id} (iNaturalist)`,
      pageUrl: `https://www.inaturalist.org/photos/${photo.id}`,
      url: photo.url.replace("/square.", "/original."),
      thumbUrl: photo.url.replace("/square.", "/medium."),
      width: photo.original_dimensions.width,
      height: photo.original_dimensions.height,
      license: inaturalistLicense(photo.license_code),
      author: observation.user.name || observation.user.login,
    });
  }
  return photos;
}
