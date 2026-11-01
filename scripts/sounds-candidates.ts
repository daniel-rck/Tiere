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
import { soundJunk, soundScore } from "./sound-filter.ts";
import { processSound } from "./sounds.ts";

const ROOT = ".cache/sounds";
const MAX = 8;

/**
 * English search terms (most recordings on Commons are titled in English or by
 * the Latin name). The first is also matched against titles for ranking.
 */
const ENGLISH: Record<string, string[]> = {
  kuh: ["cow", "cow moo"],
  schwein: ["pig", "pig grunt", "pig oink"],
  schaf: ["sheep", "sheep bleat"],
  huhn: ["hen", "chicken clucking", "hen cackle"],
  pferd: ["horse", "horse neigh", "horse whinny"],
  ziege: ["goat", "goat bleat", "goat bleating"],
  ente: ["duck", "duck quack", "mallard call"],
  gans: ["goose", "goose honk", "greylag goose call"],
  esel: ["donkey", "donkey bray", "donkey braying"],
  hund: ["dog", "dog bark", "dog barking"],
  katze: ["cat", "cat meow"],
  elefant: ["elephant", "elephant trumpet", "elephant trumpeting"],
  loewe: ["lion", "lion roar", "lion roaring"],
  zebra: ["zebra", "zebra call", "zebra bray"],
  nashorn: ["rhinoceros", "rhino sound", "rhinoceros vocalization"],
  nilpferd: ["hippopotamus", "hippo grunt", "hippopotamus sound"],
  eisbaer: ["polar bear", "polar bear growl", "polar bear sound"],
  kamel: ["camel", "camel grunt", "camel sound", "dromedary sound"],
  flamingo: ["flamingo", "flamingo call"],
  erdmaennchen: ["meerkat", "meerkat call", "meerkat alarm"],
  pinguin: ["penguin", "penguin call", "penguin colony"],
  tiger: ["tiger", "tiger roar", "tiger growl"],
  "orang-utan": ["orangutan", "orangutan call", "orangutan long call"],
  tukan: ["toucan", "toucan call"],
  frosch: ["tree frog", "tree frog call", "frog croak"],
  gorilla: ["gorilla", "gorilla vocalization", "gorilla grunt", "gorilla chest beat"],
  schimpanse: ["chimpanzee", "chimpanzee pant hoot", "chimpanzee call"],
  ara: ["macaw", "macaw call", "scarlet macaw"],
  jaguar: ["jaguar", "jaguar roar", "jaguar saw"],
  schlange: ["snake", "snake hiss", "rattlesnake rattle"],
  clownfisch: ["clownfish", "clownfish sound", "anemonefish sound"],
  delfin: ["dolphin", "dolphin whistle", "dolphin clicks", "bottlenose dolphin sound"],
  buckelwal: ["humpback whale", "humpback whale song"],
  seehund: ["harbor seal", "harbour seal vocalization", "seal sound", "grey seal call"],
  orca: ["killer whale", "orca call", "killer whale call"],
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
    gsrlimit: "30",
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
  const english = ENGLISH[animal.id] ?? [];
  const terms = [animal.latin, english[0] ?? animal.name, animal.name];
  const seen = new Set<string>();
  const ranked: { page: AudioInfo; score: number; order: number }[] = [];
  for (const query of [`"${animal.latin}"`, ...english, animal.name]) {
    for (const page of await search(query)) {
      if (seen.has(page.title)) continue;
      seen.add(page.title);
      const description = stripHtml(
        page.imageinfo?.[0]?.extmetadata?.ImageDescription?.value ?? "",
      );
      const junk = soundJunk(page.title, description);
      if (junk) continue;
      ranked.push({
        page,
        score: soundScore(page.title, description, terms),
        order: ranked.length,
      });
    }
  }
  // Best match first; equal scores keep the search order.
  const found = ranked
    .filter((entry) => entry.score > 0)
    .toSorted((a, b) => b.score - a.score || a.order - b.order)
    .map((entry) => entry.page);
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
    if (info.size > 15_000_000) continue;
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
