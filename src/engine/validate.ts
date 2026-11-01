// Content validation (spec 4.1, 4.2, 5.1, acceptance criterion 11). Pure:
// takes parsed JSON, returns a list of problems. The CLI around it is
// scripts/validate-content.ts.
import type { Animal, ContentFile } from "../content/types.ts";
import { checkLicense } from "./licenses.ts";

export type Issue = { path: string; message: string };

export type ValidateOptions = {
  /**
   * Release rules (criterion 11): every animal has 3–6 photos, and every photo
   * and sound has a complete credit with an allowlisted license in `credits`.
   */
  strict?: boolean;
  /** Parsed catalog.generated.json; required when `strict`. */
  catalog?: unknown;
  /** Parsed credits.generated.json; required when `strict`. */
  credits?: unknown;
};

export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 6;

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const COMMONS_FILE = /^File:[^|#[\]{}<>]+\.(?:jpe?g|png|tiff?|webp)$/i;
const COMMONS_AUDIO = /^File:[^|#[\]{}<>]+\.(?:ogg|oga|opus|wav|flac|mp3|webm)$/i;
const OPENVERSE = /^openverse:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const INATURALIST = /^inaturalist:\d+\/\d+$/;
const ARTICLES = new Set(["der", "die", "das"]);
const VOICE_KINDS = new Set(["sound", "quiet"]);

const WORLD_KEYS = new Set(["id", "name", "emoji", "color", "ink"]);
const ANIMAL_KEYS = new Set([
  "id",
  "world",
  "name",
  "article",
  "latin",
  "voice",
  "facts",
  "photos",
  "soundFile",
]);

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && value === value.trim();

/** Whether `file` names a photo source the build can fetch (spec 4.1). */
export function isPhotoRef(file: string): boolean {
  return COMMONS_FILE.test(file) || OPENVERSE.test(file) || INATURALIST.test(file);
}

export function validateContent(data: unknown, options: ValidateOptions = {}): Issue[] {
  const issues: Issue[] = [];
  const report = (path: string, message: string) => issues.push({ path, message });

  if (!isObject(data)) {
    report("", "erwartet ein Objekt mit worlds und animals");
    return issues;
  }
  for (const key of Object.keys(data)) {
    if (key !== "worlds" && key !== "animals") report(key, "unbekanntes Feld");
  }

  const worldIds = new Set<string>();
  if (!Array.isArray(data.worlds) || data.worlds.length === 0) {
    report("worlds", "erwartet eine nicht leere Liste");
  } else {
    data.worlds.forEach((world, i) => validateWorld(world, `worlds[${i}]`, worldIds, report));
  }

  const animalIds = new Set<string>();
  const photoOwners = new Map<string, string>();
  const animalsPerWorld = new Map<string, number>();
  if (!Array.isArray(data.animals) || data.animals.length === 0) {
    report("animals", "erwartet eine nicht leere Liste");
  } else {
    data.animals.forEach((animal, i) => {
      const path = isObject(animal) && isText(animal.id) ? `animals.${animal.id}` : `animals[${i}]`;
      validateAnimal(animal, path, { worldIds, animalIds, photoOwners, report, options });
      if (isObject(animal) && typeof animal.world === "string") {
        animalsPerWorld.set(animal.world, (animalsPerWorld.get(animal.world) ?? 0) + 1);
      }
    });
  }
  for (const id of worldIds) {
    if (!animalsPerWorld.has(id)) report(`worlds.${id}`, "Welt hat keine Tiere");
  }

  if (options.strict) {
    validateCatalog(data as ContentFile, options.catalog, options.credits, report);
  }
  return issues;
}

type Report = (path: string, message: string) => void;

function checkKeys(value: Json, allowed: Set<string>, path: string, report: Report): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) report(`${path}.${key}`, "unbekanntes Feld");
  }
}

function validateWorld(world: unknown, path: string, ids: Set<string>, report: Report): void {
  if (!isObject(world)) {
    report(path, "erwartet ein Objekt");
    return;
  }
  checkKeys(world, WORLD_KEYS, path, report);
  if (!isText(world.id) || !ID.test(world.id)) {
    report(`${path}.id`, "erwartet eine ID in kebab-case (a–z, 0–9, -)");
  } else if (ids.has(world.id)) {
    report(`${path}.id`, `doppelte Welt-ID „${world.id}“`);
  } else {
    ids.add(world.id);
  }
  if (!isText(world.name)) report(`${path}.name`, "erwartet einen Namen");
  if (!isText(world.emoji)) report(`${path}.emoji`, "erwartet ein Emoji");
  for (const key of ["color", "ink"] as const) {
    const value = world[key];
    if (typeof value !== "string" || !HEX_COLOR.test(value)) {
      report(`${path}.${key}`, "erwartet eine Farbe im Format #RRGGBB");
    }
  }
}

type AnimalContext = {
  worldIds: Set<string>;
  animalIds: Set<string>;
  photoOwners: Map<string, string>;
  report: Report;
  options: ValidateOptions;
};

function validateAnimal(animal: unknown, path: string, ctx: AnimalContext): void {
  const { report } = ctx;
  if (!isObject(animal)) {
    report(path, "erwartet ein Objekt");
    return;
  }
  checkKeys(animal, ANIMAL_KEYS, path, report);

  const id = animal.id;
  if (!isText(id) || !ID.test(id)) {
    report(`${path}.id`, "erwartet eine ID in kebab-case (a–z, 0–9, -)");
  } else if (ctx.animalIds.has(id)) {
    report(`${path}.id`, `doppelte Tier-ID „${id}“`);
  } else {
    ctx.animalIds.add(id);
  }

  if (!isText(animal.world)) {
    report(`${path}.world`, "erwartet eine Welt-ID");
  } else if (!ctx.worldIds.has(animal.world)) {
    report(`${path}.world`, `unbekannte Welt „${animal.world}“`);
  }
  if (!isText(animal.name)) report(`${path}.name`, "erwartet einen Namen");
  if (typeof animal.article !== "string" || !ARTICLES.has(animal.article)) {
    report(`${path}.article`, "erwartet der, die oder das");
  }
  if (!isText(animal.latin)) report(`${path}.latin`, "erwartet den wissenschaftlichen Namen");

  const voice = animal.voice;
  if (!isObject(voice)) {
    report(`${path}.voice`, "erwartet { kind, text }");
  } else {
    checkKeys(voice, new Set(["kind", "text"]), `${path}.voice`, report);
    if (typeof voice.kind !== "string" || !VOICE_KINDS.has(voice.kind)) {
      report(`${path}.voice.kind`, "erwartet sound oder quiet");
    }
    if (!isText(voice.text)) report(`${path}.voice.text`, "erwartet einen Text");
  }

  const facts = animal.facts;
  if (!Array.isArray(facts) || facts.length !== 2) {
    report(`${path}.facts`, "erwartet genau 2 Fakten");
  } else {
    facts.forEach((fact, i) => {
      if (!isText(fact)) report(`${path}.facts[${i}]`, "erwartet einen Text");
    });
  }

  validatePhotos(animal.photos, path, isText(id) ? id : path, ctx);

  const sound = animal.soundFile;
  if (sound !== null && (typeof sound !== "string" || !COMMONS_AUDIO.test(sound))) {
    report(`${path}.soundFile`, "erwartet null oder einen Commons-Audiotitel („File:….ogg“)");
  }
  if (sound !== null && isObject(voice) && voice.kind === "quiet") {
    report(`${path}.soundFile`, "stille Tiere bekommen keinen Laut (spec 5.5)");
  }
}

function validatePhotos(photos: unknown, path: string, owner: string, ctx: AnimalContext): void {
  const { report } = ctx;
  if (!Array.isArray(photos)) {
    report(`${path}.photos`, "erwartet eine Liste");
    return;
  }
  if (photos.length > MAX_PHOTOS) {
    report(`${path}.photos`, `höchstens ${MAX_PHOTOS} Fotos, gefunden ${photos.length}`);
  }
  if (ctx.options.strict && photos.length < MIN_PHOTOS) {
    report(`${path}.photos`, `mindestens ${MIN_PHOTOS} Fotos, gefunden ${photos.length}`);
  }
  photos.forEach((photo, i) => {
    const photoPath = `${path}.photos[${i}]`;
    if (!isObject(photo)) {
      report(photoPath, "erwartet { file }");
      return;
    }
    checkKeys(photo, new Set(["file"]), photoPath, report);
    const file = photo.file;
    if (typeof file !== "string" || !isPhotoRef(file)) {
      report(
        `${photoPath}.file`,
        "erwartet „File:….jpg“, „openverse:<uuid>“ oder „inaturalist:<beobachtung>/<foto>“",
      );
      return;
    }
    const previous = ctx.photoOwners.get(file);
    if (previous !== undefined) {
      report(`${photoPath}.file`, `Foto ist schon bei „${previous}“ eingetragen`);
    } else {
      ctx.photoOwners.set(file, owner);
    }
  });
}

function byId(list: unknown): Map<string, Json> {
  const entries = new Map<string, Json>();
  if (!Array.isArray(list)) return entries;
  for (const entry of list) {
    if (isObject(entry) && typeof entry.id === "string") entries.set(entry.id, entry);
  }
  return entries;
}

/**
 * Strict mode: catalog and credits match the content, every photo and sound
 * has a complete credit with an allowlisted license.
 */
function validateCatalog(
  content: ContentFile,
  catalog: unknown,
  credits: unknown,
  report: Report,
): void {
  const missing = "fehlt oder ist ungültig, erst `bun run photos:build` laufen lassen";
  if (!isObject(catalog) || !Array.isArray(catalog.animals)) {
    report("catalog", `Katalog ${missing}`);
    return;
  }
  if (!isObject(credits) || !Array.isArray(credits.animals)) {
    report("credits", `Bildnachweise ${missing}`);
    return;
  }
  const entries = byId(catalog.animals);
  const creditEntries = byId(credits.animals);
  if (!Array.isArray(content.animals)) return;
  for (const animal of content.animals as unknown[]) {
    if (!isObject(animal) || typeof animal.id !== "string") continue;
    const { id } = animal as Animal;
    const entry = entries.get(id);
    const creditEntry = creditEntries.get(id);
    if (!entry) report(`catalog.${id}`, "Tier fehlt im Katalog");
    if (!creditEntry) report(`credits.${id}`, "Tier fehlt in den Bildnachweisen");
    if (!entry || !creditEntry) continue;
    const want = Array.isArray(animal.photos) ? animal.photos.length : 0;
    const photos = Array.isArray(entry.photos) ? entry.photos : [];
    if (photos.length !== want) {
      report(`catalog.${id}.photos`, `Katalog hat ${photos.length} Fotos, Inhalt ${want}`);
    }
    const photoCredits = Array.isArray(creditEntry.photos) ? creditEntry.photos : [];
    for (let i = 0; i < want; i++) {
      validateCredit(photoCredits[i], `credits.${id}.photos[${i}]`, report);
    }
    if (typeof animal.soundFile === "string") {
      if (!isObject(entry.sound)) report(`catalog.${id}.sound`, "Laut fehlt im Katalog");
      validateCredit(creditEntry.sound, `credits.${id}.sound`, report);
    }
  }
}

function validateCredit(credit: unknown, path: string, report: Report): void {
  if (!isObject(credit)) {
    report(path, "Credit fehlt");
    return;
  }
  if (!isText(credit.author)) report(`${path}.author`, "Autor fehlt");
  for (const key of ["licenseUrl", "sourceUrl"] as const) {
    const value = credit[key];
    if (typeof value !== "string" || !value.startsWith("https://")) {
      report(`${path}.${key}`, "erwartet eine https-URL");
    }
  }
  if (!isText(credit.license)) {
    report(`${path}.license`, "Lizenz fehlt");
    return;
  }
  const license = checkLicense(credit.license);
  if (!license.ok) {
    report(`${path}.license`, `„${credit.license}“: ${license.reason}`);
  }
}
