// `bun run photos:candidates <id> [<id> …] | --all [--render]`
// Searches Wikimedia Commons for photo candidates of an animal (spec 5.3):
// featured, quality and valued images first, then a general search by the
// Latin and the German name. Keeps up to 30 that pass the license allowlist,
// are bitmaps and big enough, downloads their thumbnails and writes
// `.cache/candidates/<id>.json`, a contact sheet `<id>.html` and a numbered
// overview `<id>.grid.jpg` for the eye check.
// `--render` only re-renders sheet and grid from the existing JSON (after the
// proposals and exclusion reasons were filled in).
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import content from "../content/animals.json" with { type: "json" };
import {
  type Candidate,
  type CandidateFile,
  MAX_CANDIDATES,
  renderContactSheet,
  sizeReason,
  type Tier,
  titleReason,
} from "./candidates.ts";
import { type CommonsFile, download, searchFiles } from "./commons.ts";
import { checkLicense, stripHtml } from "./licenses.ts";

const ROOT = ".cache/candidates";
const THUMB_WIDTH = 330;

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
  const ids = args.includes("--all")
    ? content.animals.map((a) => a.id)
    : args.filter((a) => !a.startsWith("--"));
  if (ids.length === 0) {
    console.error("Aufruf: bun run photos:candidates <tier-id> … | --all [--render]");
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
