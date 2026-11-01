// `bun run photos:candidates <id> [<id> …] | --all [--render]`
// Searches Wikimedia Commons for photo candidates of an animal (spec 5.3):
// featured, quality and valued images first, then a general search by the
// Latin and the German name. Keeps up to 30 that pass the license allowlist,
// are bitmaps and big enough, downloads their thumbnails and writes
// `.cache/candidates/<id>.json`, a contact sheet `<id>.html` and a numbered
// overview `<id>.grid.jpg` for the eye check.
// `--render` only re-renders sheet and grid from the existing JSON (after the
// proposals and exclusion reasons were filled in).
// `--add [openverse,inaturalist]` appends up to 10 candidates per extra source
// to an existing JSON (numbering continues, proposals stay), for animals where
// Commons yields little that is usable.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import content from "../content/animals.json" with { type: "json" };
import {
  type Candidate,
  type CandidateFile,
  MAX_CANDIDATES,
  MIN_LONG_EDGE,
  renderContactSheet,
  sizeReason,
  type Tier,
  titleReason,
} from "./candidates.ts";
import { type CommonsFile, download, searchFiles } from "./commons.ts";
import { checkLicense, stripHtml } from "./licenses.ts";
import { findTaxon, searchInaturalist } from "./sources/inaturalist.ts";
import { searchOpenverse } from "./sources/openverse.ts";
import type { ExtraPhoto, ExtraSource } from "./sources/types.ts";

const ROOT = ".cache/candidates";
const THUMB_WIDTH = 330;
const EXTRA_PER_SOURCE = 10;
const EXTRA_SOURCES: ExtraSource[] = ["openverse", "inaturalist"];

type Animal = (typeof content.animals)[number];

function queries(animal: Animal): [Tier, string][] {
  const latin = `"${animal.latin}"`;
  return [
    ["featured", `${latin} incategory:Featured_pictures_on_Wikimedia_Commons`],
    ["quality", `${latin} incategory:Quality_images`],
    ["valued", `${latin} incategory:Valued_images`],
    ["search", `${latin} filetype:bitmap`],
    ["search", `"${animal.name}" ${animal.latin.split(" ")[0]} filetype:bitmap`],
  ];
}

function toCandidate(file: CommonsFile, tier: Tier, n: number, id: string): Candidate | string {
  const size = sizeReason(file.width, file.height, file.mime);
  if (size) return size;
  const title = titleReason(file.title);
  if (title) return title;
  const meta = file.extmetadata;
  const license = checkLicense(meta.LicenseShortName?.value, meta.License?.value);
  if (!license.ok) return `Lizenz: ${license.name} (${license.reason})`;
  const ext = file.thumbUrl.match(/\.(jpe?g|png|webp)$/i)?.[1]?.toLowerCase() ?? "jpg";
  return {
    n,
    title: file.title,
    pageUrl: file.pageUrl,
    url: file.url,
    thumb: `${id}/${String(n).padStart(2, "0")}.${ext === "jpeg" ? "jpg" : ext}`,
    width: file.width,
    height: file.height,
    license: license.name,
    author: stripHtml(meta.Artist?.value ?? "") || "unbekannt",
    tier,
    proposed: false,
  };
}

async function collect(animal: Animal): Promise<CandidateFile> {
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  const thumbUrls = new Map<Candidate, string>();
  const skipped: CandidateFile["skipped"] = [];
  for (const [tier, search] of queries(animal)) {
    if (candidates.length >= MAX_CANDIDATES) break;
    const files = await searchFiles(search, 50, THUMB_WIDTH);
    console.log(`  ${tier.padEnd(8)} ${files.length.toString().padStart(2)} Treffer  ${search}`);
    for (const file of files) {
      if (seen.has(file.title) || candidates.length >= MAX_CANDIDATES) continue;
      seen.add(file.title);
      const result = toCandidate(file, tier, candidates.length + 1, animal.id);
      if (typeof result === "string") skipped.push({ title: file.title, reason: result });
      else {
        candidates.push(result);
        thumbUrls.set(result, file.thumbUrl);
      }
    }
  }
  for (const [i, c] of candidates.entries()) {
    const dest = join(ROOT, c.thumb);
    const url = thumbUrls.get(c);
    if (url && !existsSync(dest)) await download(url, dest);
    process.stdout.write(`\r  Vorschaubilder ${i + 1}/${candidates.length}`);
  }
  process.stdout.write("\n");
  const { id, name, article, latin, world } = animal;
  return {
    animal: { id, name, article, latin, world },
    generatedAt: new Date().toISOString(),
    candidates,
    skipped,
  };
}

function extraToCandidate(
  photo: ExtraPhoto,
  source: ExtraSource,
  n: number,
  id: string,
): Candidate | string {
  if (Math.max(photo.width, photo.height) < MIN_LONG_EDGE) {
    return `zu klein (${photo.width}×${photo.height})`;
  }
  const title = titleReason(photo.name);
  if (title) return title;
  const license = checkLicense(undefined, photo.license);
  if (!license.ok) return `Lizenz: ${license.name} (${license.reason})`;
  return {
    n,
    title: photo.id,
    source,
    name: photo.name,
    pageUrl: photo.pageUrl,
    url: photo.url,
    thumb: `${id}/${String(n).padStart(2, "0")}.jpg`,
    width: photo.width,
    height: photo.height,
    license: license.name,
    author: photo.author,
    tier: "search",
    proposed: false,
  };
}

async function fetchExtra(animal: Animal, source: ExtraSource): Promise<ExtraPhoto[]> {
  if (source === "openverse") return searchOpenverse(animal.latin, 20);
  const taxon = await findTaxon(animal.latin);
  if (!taxon) return [];
  console.log(`  iNaturalist-Taxon ${taxon.id} ${taxon.name}`);
  return searchInaturalist(taxon.id, EXTRA_PER_SOURCE);
}

/** Appends candidates from other sources to an existing candidate file. */
async function addExtra(data: CandidateFile, animal: Animal, sources: ExtraSource[]) {
  const seen = new Set(data.candidates.map((c) => c.title));
  for (const source of sources) {
    let photos: ExtraPhoto[];
    try {
      photos = await fetchExtra(animal, source);
    } catch (error) {
      console.warn(`  ${source}: übersprungen (${(error as Error).message})`);
      continue;
    }
    let added = 0;
    for (const photo of photos) {
      if (added >= EXTRA_PER_SOURCE || seen.has(photo.id)) continue;
      seen.add(photo.id);
      const n = Math.max(0, ...data.candidates.map((c) => c.n)) + 1;
      const result = extraToCandidate(photo, source, n, animal.id);
      if (typeof result === "string") {
        data.skipped.push({ title: `${photo.name} [${photo.id}]`, reason: result });
        continue;
      }
      const dest = join(ROOT, result.thumb);
      try {
        if (!existsSync(dest)) await download(photo.thumbUrl, dest);
      } catch (error) {
        data.skipped.push({
          title: photo.id,
          reason: `Vorschau fehlt (${(error as Error).message})`,
        });
        continue;
      }
      data.candidates.push(result);
      added++;
    }
    console.log(`  ${source.padEnd(11)} ${photos.length} Treffer, ${added} neu`);
  }
}

/** A numbered grid of all thumbnails, for looking at one animal at a glance. */
async function renderGrid(data: CandidateFile): Promise<void> {
  const tile = 300;
  const cols = 6;
  const rows = Math.max(1, Math.ceil(data.candidates.length / cols));
  const composites: OverlayOptions[] = [];
  for (const [i, c] of data.candidates.entries()) {
    const left = (i % cols) * tile;
    const top = Math.floor(i / cols) * tile;
    const image = await sharp(join(ROOT, c.thumb))
      .resize(tile - 8, tile - 8, { fit: "contain", background: "#222" })
      .toBuffer();
    composites.push({ input: image, left: left + 4, top: top + 4 });
    const label = Buffer.from(
      `<svg width="52" height="34"><rect width="52" height="34" rx="6" fill="#000" fill-opacity="0.75"/><text x="26" y="24" font-size="22" font-family="sans-serif" font-weight="bold" fill="#fff" text-anchor="middle">${c.n}</text></svg>`,
    );
    composites.push({ input: label, left: left + 6, top: top + 6 });
  }
  await sharp({
    create: { width: cols * tile, height: rows * tile, channels: 3, background: "#111" },
  })
    .composite(composites)
    .jpeg({ quality: 82 })
    .toFile(join(ROOT, `${data.animal.id}.grid.jpg`));
}

async function main() {
  const args = process.argv.slice(2);
  const renderOnly = args.includes("--render");
  const addIndex = args.indexOf("--add");
  const addValue = args[addIndex + 1];
  const addSources: ExtraSource[] =
    addIndex < 0
      ? []
      : addValue && !addValue.startsWith("--") && !content.animals.some((a) => a.id === addValue)
        ? (addValue.split(",") as ExtraSource[])
        : EXTRA_SOURCES;
  for (const source of addSources) {
    if (!EXTRA_SOURCES.includes(source)) throw new Error(`Unbekannte Quelle: ${source}`);
  }
  const ids = args.includes("--all")
    ? content.animals.map((a) => a.id)
    : args.filter((a) => content.animals.some((animal) => animal.id === a));
  if (ids.length === 0) {
    console.error(
      "Aufruf: bun run photos:candidates <tier-id> … | --all [--render | --add [openverse,inaturalist]]",
    );
    process.exit(2);
  }
  await mkdir(ROOT, { recursive: true });
  for (const id of ids) {
    const animal = content.animals.find((a) => a.id === id);
    if (!animal) throw new Error(`Unbekanntes Tier: ${id}`);
    const jsonPath = join(ROOT, `${id}.json`);
    let data: CandidateFile;
    if (renderOnly) {
      data = JSON.parse(await readFile(jsonPath, "utf8")) as CandidateFile;
    } else if (addSources.length) {
      console.log(`${animal.name} (${animal.latin}) + ${addSources.join(", ")}`);
      data = JSON.parse(await readFile(jsonPath, "utf8")) as CandidateFile;
      await addExtra(data, animal, addSources);
      await writeFile(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
    } else {
      console.log(`${animal.name} (${animal.latin})`);
      data = await collect(animal);
      await writeFile(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
    }
    await writeFile(join(ROOT, `${id}.html`), renderContactSheet(data));
    await renderGrid(data);
    console.log(
      `  → ${data.candidates.length} Kandidaten, ${data.skipped.length} verworfen: ${join(ROOT, `${id}.html`)}`,
    );
  }
}

await main();
