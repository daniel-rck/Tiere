// Content model (spec 4.1). `content/animals.json` is the hand-maintained
// source; the build scripts turn it into `catalog.generated.json`.

export type Article = "der" | "die" | "das";

export type Voice = { kind: "sound"; text: string } | { kind: "quiet"; text: string };

export type World = {
  id: string;
  name: string;
  emoji: string;
  /** Tile colour, "#RRGGBB"; the same in light and dark mode. */
  color: string;
  /** Text colour on `color`. */
  ink: string;
};

/**
 * A selected photo: a Commons file title ("File:Cow in meadow.jpg"),
 * "openverse:<uuid>" or "inaturalist:<observation id>/<photo id>" (spec 5.1).
 */
export type PhotoRef = { file: string };

export type Animal = {
  /** kebab-case, ASCII */
  id: string;
  /** World.id */
  world: string;
  name: string;
  article: Article;
  /** Scientific name, used for the media search. */
  latin: string;
  voice: Voice;
  /** Short, child-friendly and factually correct. */
  facts: [string, string];
  /** Order = display order. */
  photos: PhotoRef[];
  /** Commons file title of the sound recording. */
  soundFile: string | null;
};

export type ContentFile = { worlds: World[]; animals: Animal[] };

// Generated catalog (src/content/catalog.generated.json) and credits
// (src/content/credits.generated.json). The credits live apart so they load
// with the parents' area, not with the start screen (JS budget, spec 8).

export type Credit = { author: string; license: string; licenseUrl: string; sourceUrl: string };

export type CatalogPhoto = {
  /** Ascending, e.g. 640/1280/1920. */
  sizes: { w: number; src: string }[];
  /** Original aspect ratio. */
  width: number;
  height: number;
  /** Average colour for the placeholder. */
  color: string;
};

export type CatalogSound = { src: string };

/** Built speech clips (spec 5.6): the name ("Die Kuh!") and the facts read aloud. */
export type CatalogSpeech = { name: string; facts: string };

/** An animal as the app sees it: photos in the order of `Animal.photos`. */
export type CatalogAnimal = Omit<Animal, "latin" | "photos" | "soundFile"> & {
  photos: CatalogPhoto[];
  sound: CatalogSound | null;
  speech: CatalogSpeech | null;
};

export type Catalog = { worlds: World[]; animals: CatalogAnimal[] };

/** Credits per animal, photos in the same order as in the catalog. */
export type AnimalCredits = { id: string; photos: Credit[]; sound: Credit | null };

/** `voice`: the synthetic voice of the speech clips (spec 5.6), one for all animals. */
export type CreditsFile = { animals: AnimalCredits[]; voice?: Credit };
