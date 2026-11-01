// `bun run photos:build` (spec 5.4): fetches every selected photo once into
// `.cache/originals/` (idempotent; from Commons the largest standard thumbnail
// up to 1920 px, since upload.wikimedia.org rejects scripts asking for originals), writes WebP at 640/1280/1920 px width
// (quality 80, never upscaled, no metadata) to `public/photos/<animal>/<n>-<w>.webp`
// and the catalog `src/content/catalog.generated.json` with sizes and average
// colour, plus `src/content/credits.generated.json`. Aborts with a list of
// problems when a credit is incomplete or a license is not on the allowlist.
// Credits are cached in .cache/ between runs (`--refresh` fetches them again).
// A photo whose download fails is left out and reported; after the first
// failure the run stops downloading (Wikimedia blocks for a while) and only
// renders what is cached. `--offline` never downloads. The next run picks
// the missing photos up again.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import content from "../content/animals.json" with { type: "json" };
import type {
  AnimalCredits,
  Catalog,
  CatalogAnimal,
  CatalogPhoto,
  Credit,
  CreditsFile,
} from "../src/content/types.ts";
import { checkLicense, licenseUrl, stripHtml } from "../src/engine/licenses.ts";
import { commonsThumb, download, fileInfo } from "./commons.ts";
import { fetchInaturalistPhoto } from "./sources/inaturalist.ts";
import { fetchOpenversePhoto } from "./sources/openverse.ts";

const ORIGINALS = ".cache/originals";
const SIDECARS = ".cache/photos-build";
const OUT = "public/photos";
const CATALOG = "src/content/catalog.generated.json";
const CREDITS = "src/content/credits.generated.json";
export const WIDTHS = [640, 1280, 1920] as const;
const QUALITY = 80;

type Source = { url: string; credit: Credit };
type Sidecar = CatalogPhoto & { file: string; url: string };

const problems: string[] = [];

function credit(
  file: string,
  author: string,
  license: ReturnType<typeof checkLicense>,
  url: string | undefined,
  sourceUrl: string,
): Credit | undefined {
  if (!license.ok) {
    problems.push(`${file}: Lizenz „${license.name}“ ${license.reason}`);
    return undefined;
  }
  if (!author) {
    problems.push(`${file}: Autor fehlt`);
    return undefined;
  }
  const deed = url?.replace(/^http:\/\//, "https://") || licenseUrl(license.name);
  if (!deed) {
    problems.push(`${file}: Lizenz-URL fehlt`);
    return undefined;
  }
  return { author, license: license.name, licenseUrl: deed, sourceUrl };
}

async function resolveSources(files: string[]): Promise<Map<string, Source>> {
  const sources = new Map<string, Source>();
  const commons = files.filter((file) => file.startsWith("File:"));
  console.log(`Metadaten: ${commons.length} Commons-Dateien …`);
  const infos = await fileInfo(commons);
  for (const file of commons) {
    const info = infos.get(file);
    if (!info) {
      problems.push(`${file}: auf Commons nicht gefunden`);
      continue;
    }
    const meta = info.extmetadata;
    const result = credit(
      file,
      stripHtml(meta.Artist?.value ?? ""),
      checkLicense(meta.LicenseShortName?.value, meta.License?.value),
      meta.LicenseUrl?.value,
      info.pageUrl,
    );
    if (result) sources.set(file, { url: commonsThumb(info.url, info.width), credit: result });
  }
  for (const file of files.filter((f) => !f.startsWith("File:"))) {
    console.log(`Metadaten: ${file}`);
    try {
      let photo;
      if (file.startsWith("inaturalist:")) {
        const [observation, id] = file.slice("inaturalist:".length).split("/").map(Number);
        photo = await fetchInaturalistPhoto(observation ?? 0, id ?? 0);
      } else {
        photo = await fetchOpenversePhoto(file.slice("openverse:".length));
      }
      const license = checkLicense(undefined, photo.license);
      const result = credit(file, photo.author, license, undefined, photo.pageUrl);
      if (result) sources.set(file, { url: photo.url, credit: result });
    } catch (error) {
      problems.push(`${file}: ${(error as Error).message}`);
    }
  }
  return sources;
}

const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

async function render(original: string, animal: string, n: number): Promise<Sidecar> {
  const { width = 0, height = 0, orientation = 1 } = await sharp(original).metadata();
  const [w, h] = orientation >= 5 ? [height, width] : [width, height];
  const { channels } = await sharp(original).rotate().stats();
  const color = `#${channels
    .slice(0, 3)
    .map((c) => hex(c.mean))
    .join("")}`;
  const targets = [...new Set(WIDTHS.map((target) => Math.min(target, w)))];
  const sizes: CatalogPhoto["sizes"] = [];
  for (const target of targets) {
    const name = `${n}-${target}.webp`;
    await sharp(original)
      .rotate()
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(join(OUT, animal, name));
    sizes.push({ w: target, src: `/photos/${animal}/${name}` });
  }
  return { file: "", url: "", sizes, width: w, height: h, color };
}

async function readJson<T>(path: string): Promise<T | undefined> {
  return existsSync(path) ? (JSON.parse(await readFile(path, "utf8")) as T) : undefined;
}

/** Credits and download URLs from earlier runs; `--refresh` asks the sources again. */
// v2: Commons sources point at standard thumbnails instead of originals.
const SOURCES = ".cache/photo-sources-v2.json";

async function cachedSources(files: string[]): Promise<Map<string, Source>> {
  const refresh = process.argv.includes("--refresh");
  const cached = refresh ? undefined : await readJson<Record<string, Source>>(SOURCES);
  const known = new Map(Object.entries(cached ?? {}).filter(([file]) => files.includes(file)));
  const missing = files.filter((file) => !known.has(file));
  if (missing.length > 0) {
    for (const [file, source] of await resolveSources(missing)) known.set(file, source);
    await mkdir(".cache", { recursive: true });
    await writeFile(SOURCES, `${JSON.stringify(Object.fromEntries(known), null, 2)}\n`);
  }
  return known;
}

async function main(): Promise<void> {
  const files = content.animals.flatMap((animal) => animal.photos.map((photo) => photo.file));
  const sources = await cachedSources(files);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`✗ ${problem}`);
    throw new Error(`${problems.length} Problem(e), nichts gebaut.`);
  }

  await mkdir(ORIGINALS, { recursive: true });
  await mkdir(SIDECARS, { recursive: true });
  const previous = await readJson<Catalog>(CATALOG);
  const previousCredits = await readJson<CreditsFile>(CREDITS);
  const animals: CatalogAnimal[] = [];
  const credits: AnimalCredits[] = [];
  const failed: string[] = [];
  let offline = process.argv.includes("--offline");
  let done = 0;
  for (const animal of content.animals) {
    await mkdir(join(OUT, animal.id), { recursive: true });
    const photos: CatalogPhoto[] = [];
    const photoCredits: Credit[] = [];
    const keep = new Set<string>();
    for (const [i, { file }] of animal.photos.entries()) {
      const n = i + 1;
      const source = sources.get(file);
      if (!source) throw new Error(`${file}: keine Quelle`);
      const sidecarPath = join(SIDECARS, `${animal.id}-${n}.json`);
      let sidecar = await readJson<Sidecar>(sidecarPath);
      const fresh =
        sidecar?.file === file &&
        sidecar.sizes.every((size) => existsSync(join("public", size.src)));
      const label = `[${++done}/${files.length}] ${animal.id} ${n}`;
      if (!fresh || !sidecar) {
        const ext = /\.(jpe?g|png|tiff?|webp)$/i.exec(new URL(source.url).pathname)?.[1] ?? "jpg";
        const hash = createHash("sha1").update(source.url).digest("hex").slice(0, 16);
        const original = join(ORIGINALS, `${hash}.${ext.toLowerCase()}`);
        if (!existsSync(original)) {
          if (offline) {
            failed.push(file);
            continue;
          }
          console.log(`${label}: lade ${file}`);
          try {
            await download(source.url, original);
          } catch (error) {
            console.error(`${label}: ✗ ${(error as Error).message}, keine weiteren Downloads`);
            failed.push(file);
            offline = true;
            continue;
          }
        }
        console.log(`${label}: rechne`);
        sidecar = { ...(await render(original, animal.id, n)), file, url: source.url };
        await writeFile(sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`);
      } else {
        console.log(`${label}: aktuell`);
      }
      const { file: _file, url: _url, ...photo } = sidecar;
      for (const size of photo.sizes) keep.add(size.src.split("/").pop() ?? "");
      photos.push(photo);
      photoCredits.push(source.credit);
    }
    for (const name of await readdir(join(OUT, animal.id))) {
      if (!keep.has(name)) await rm(join(OUT, animal.id, name));
    }
    const { latin: _latin, photos: _photos, soundFile: _soundFile, ...rest } = animal;
    // Sounds belong to sounds:build; keep what it wrote.
    const sound = previous?.animals.find((entry) => entry.id === animal.id)?.sound ?? null;
    const soundCredit =
      previousCredits?.animals.find((entry) => entry.id === animal.id)?.sound ?? null;
    animals.push({ ...(rest as Omit<CatalogAnimal, "photos" | "sound">), photos, sound });
    credits.push({ id: animal.id, photos: photoCredits, sound: sound ? soundCredit : null });
  }
  const ids = new Set(content.animals.map((animal) => animal.id));
  for (const dir of await readdir(OUT)) {
    if (!ids.has(dir)) await rm(join(OUT, dir), { recursive: true });
  }

  const catalog: Catalog = { worlds: content.worlds, animals };
  await writeFile(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);
  const creditsFile: CreditsFile = { animals: credits };
  await writeFile(CREDITS, `${JSON.stringify(creditsFile, null, 2)}\n`);
  if (failed.length > 0) {
    throw new Error(
      `${files.length - failed.length} von ${files.length} Fotos gebaut, ${failed.length} fehlen ` +
        "(Download fehlgeschlagen). Später noch einmal bun run photos:build.",
    );
  }
  console.log(`✓ ${files.length} Fotos, Katalog in ${CATALOG}, Nachweise in ${CREDITS}`);
}

await main();
