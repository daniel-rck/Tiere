// Access to the generated catalog (spec 4.1). The app never reads
// content/animals.json directly: the catalog carries the built photos.
import data from "./catalog.generated.json" with { type: "json" };
import type { Catalog, CatalogAnimal, World } from "./types.ts";

export const catalog = data as Catalog;

export function findWorld(id: string): World | undefined {
  return catalog.worlds.find((world) => world.id === id);
}

/**
 * The animals of a world in content order. An animal without a built photo
 * (only while photos:build is incomplete) is left out rather than shown empty.
 */
export function animalsOf(worldId: string): CatalogAnimal[] {
  return catalog.animals.filter((animal) => animal.world === worldId && animal.photos.length > 0);
}

/** "Die Kuh": article capitalised, for speech and the explorer panel. */
export function withArticle(animal: Pick<CatalogAnimal, "article" | "name">): string {
  return `${animal.article.charAt(0).toUpperCase()}${animal.article.slice(1)} ${animal.name}`;
}
