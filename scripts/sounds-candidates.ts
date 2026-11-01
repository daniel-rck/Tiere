// `bun run sounds:candidates <id> [<id> …] | --all` (spec 5.5): searches
// Wikimedia Commons for recordings of an animal's call. Keeps up to 8 that
// pass the license allowlist and are audio, downloads them, cuts a 4 s preview
// (`.cache/sounds/<id>/NN.m4a`, same processing as sounds:build) and writes
// `.cache/sounds/<id>.json` plus a listening sheet `.cache/sounds/<id>.html`.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import content from "../content/animals.json" with { type: "json" };
import { checkLicense, stripHtml } from "../src/engine/licenses.ts";
import { apiGet, commonsAudio, download, extensionOf } from "./commons.ts";
import { processSound } from "./sounds.ts";

const ROOT = ".cache/sounds";
const MAX = 8;

/** English names: most recordings on Commons are titled in English or Latin. */
const ENGLISH: Record<string, string> = {
  kuh: "cow moo",
  schwein: "pig grunt",
  schaf: "sheep bleat",
  huhn: "chicken hen",
  pferd: "horse neigh",
  ziege: "goat bleat",
  ente: "duck quack",
  gans: "goose",
  esel: "donkey bray",
  hund: "dog bark",
  katze: "cat meow",
  elefant: "elephant trumpet",
  loewe: "lion roar",
  zebra: "zebra",
  nashorn: "rhinoceros",
  nilpferd: "hippopotamus",
  eisbaer: "polar bear",
  kamel: "camel",
  flamingo: "flamingo",
  erdmaennchen: "meerkat",
  pinguin: "penguin",
  tiger: "tiger roar",
  "orang-utan": "orangutan",
  tukan: "toucan",
  frosch: "tree frog",
  gorilla: "gorilla",
  schimpanse: "chimpanzee",
  ara: "macaw",
  jaguar: "jaguar",
  schlange: "snake hiss",
  clownfisch: "clownfish",
  delfin: "dolphin whistle",
  buckelwal: "humpback whale song",
  seehund: "harbor seal",
  orca: "orca call",
};

type AudioInfo = {
  title: string;
  imageinfo?: {
    url: string;
    descriptionurl: string;
    size: number;
    mime: string;
    duration?: number;
    extmetadata?: Record<string, { value?: string }>;
  }[];
};

export type SoundCandidate = {
  n: number;
  title: string;
  pageUrl: string;
  url: string;
  duration: number;
  license: string;
  author: string;
  description: string;
  preview: string;
  proposed: boolean;
  note?: string;
  excluded?: string;
};

async function search(query: string): Promise<AudioInfo[]> {
  const body = await apiGet<{ query?: { pages?: (AudioInfo & { index?: number })[] } }>({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "20",
    gsrsearch: `${query} filetype:audio`,
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiextmetadatafilter: "LicenseShortName|License|Artist|ImageDescription",
    iiextmetadatalanguage: "de",
  });
  return (body.query?.pages ?? []).toSorted((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

function durationOf(file: string): number {
  const out = execFileSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=nw=1:nk=1",
    file,
  ]);
  return Number(out.toString().trim()) || 0;
}

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

function renderSheet(id: string, candidates: SoundCandidate[]): string {
  const rows = candidates
    .map(
      (c) => `<tr${c.excluded ? ' class="out"' : ""}><td>${c.n}${c.proposed ? " ★" : ""}</td>
<td><audio controls preload="none" src="${id}/${String(c.n).padStart(2, "0")}.m4a"></audio></td>
<td><a href="${escape(c.pageUrl)}">${escape(c.title)}</a><br><small>${escape(c.description)}</small></td>
<td>${c.duration.toFixed(1)} s</td><td>${escape(c.license)}<br>${escape(c.author)}</td>
<td>${escape(c.excluded ?? c.note ?? "")}</td></tr>`,
    )
    .join("\n");
  return `<!doctype html><meta charset="utf-8"><title>Laute: ${id}</title>
<style>body{font:15px system-ui;margin:20px}td{border-bottom:1px solid #ddd;padding:6px;vertical-align:top}.out{opacity:.45}</style>
<h1>Laute: ${id}</h1><table>${rows}</table>`;
}

async function candidatesFor(animal: (typeof content.animals)[number]): Promise<void> {
  if (animal.voice.kind === "quiet") {
    console.log(`${animal.id}: stilles Tier, keine Suche`);
    return;
  }
  const seen = new Set<string>();
  const found: AudioInfo[] = [];
  for (const query of [ENGLISH[animal.id], animal.latin, animal.name].filter(Boolean)) {
    for (const page of await search(query as string)) {
      if (!seen.has(page.title)) {
        seen.add(page.title);
        found.push(page);
      }
    }
  }
  const dir = join(ROOT, animal.id);
  await mkdir(dir, { recursive: true });
  const candidates: SoundCandidate[] = [];
  for (const page of found) {
    if (candidates.length >= MAX) break;
    const info = page.imageinfo?.[0];
    if (!info || (!info.mime.startsWith("audio/") && info.mime !== "application/ogg")) continue;
    const meta = info.extmetadata ?? {};
    const license = checkLicense(meta.LicenseShortName?.value, meta.License?.value);
    if (!license.ok) continue;
    if (info.size > 40_000_000) continue;
    const n = candidates.length + 1;
    const source = commonsAudio(info.url, info.mime);
    const hash = createHash("sha1").update(source).digest("hex").slice(0, 16);
    const original = join(".cache/sound-originals", `${hash}.${extensionOf(source)}`);
    if (!existsSync(original)) {
      try {
        await download(source, original);
      } catch (error) {
        console.warn(`${animal.id}: ${page.title} nicht geladen (${(error as Error).message})`);
        continue;
      }
    }
    const preview = join(dir, `${String(n).padStart(2, "0")}.m4a`);
    try {
      processSound(original, preview);
    } catch (error) {
      console.warn(
        `${animal.id}: ${page.title} lässt sich nicht wandeln (${(error as Error).message})`,
      );
      continue;
    }
    candidates.push({
      n,
      title: page.title,
      pageUrl: info.descriptionurl,
      url: info.url,
      duration: durationOf(original),
      license: license.name,
      author: stripHtml(meta.Artist?.value ?? ""),
      description: stripHtml(meta.ImageDescription?.value ?? "").slice(0, 300),
      preview,
      proposed: false,
    });
    console.log(`${animal.id}: ${n} ${page.title}`);
  }
  await writeFile(
    join(ROOT, `${animal.id}.json`),
    `${JSON.stringify({ id: animal.id, candidates }, null, 2)}\n`,
  );
  await writeFile(join(ROOT, `${animal.id}.html`), renderSheet(animal.id, candidates));
  console.log(`${animal.id}: ${candidates.length} Kandidaten → ${ROOT}/${animal.id}.html`);
}

const args = process.argv.slice(2);
const ids = args.includes("--all") ? content.animals.map((a) => a.id) : args;
if (ids.length === 0) {
  console.error("Aufruf: bun run sounds:candidates <tier-id> … | --all");
  process.exit(1);
}
for (const id of ids) {
  const animal = content.animals.find((a) => a.id === id);
  if (!animal) {
    console.error(`Unbekanntes Tier: ${id}`);
    process.exit(1);
  }
  await candidatesFor(animal);
}
