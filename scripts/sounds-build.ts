// `bun run sounds:build` (spec 5.5): fetches every selected recording
// (`soundFile` in content/animals.json) once into `.cache/sound-originals/`,
// processes it (scripts/sounds.ts) to `public/sounds/<animalId>.m4a` and
// writes `sound: { src, credit }` into src/content/catalog.generated.json.
// Run after photos:build; it only touches the sounds.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import data from "../content/animals.json" with { type: "json" };
import type { Catalog, CatalogSound, ContentFile } from "../src/content/types.ts";
import { checkLicense, licenseUrl, stripHtml } from "../src/engine/licenses.ts";
import { download, fileInfo } from "./commons.ts";
import { processSound } from "./sounds.ts";

const content = data as unknown as ContentFile;
const ORIGINALS = ".cache/sound-originals";
const OUT = "public/sounds";
const CATALOG = "src/content/catalog.generated.json";
/** Which original each built file came from, so a new selection is rebuilt. */
const BUILT = ".cache/sounds-build.json";

async function main(): Promise<void> {
  if (!existsSync(CATALOG)) throw new Error(`${CATALOG} fehlt: erst bun run photos:build`);
  const catalog = JSON.parse(await readFile(CATALOG, "utf8")) as Catalog;
  const selected = content.animals.filter(
    (animal): animal is typeof animal & { soundFile: string } =>
      typeof animal.soundFile === "string",
  );
  const infos = await fileInfo(selected.map((animal) => animal.soundFile));
  const built: Record<string, string> = existsSync(BUILT)
    ? (JSON.parse(await readFile(BUILT, "utf8")) as Record<string, string>)
    : {};
  const problems: string[] = [];
  const sounds = new Map<string, CatalogSound>();
  await mkdir(OUT, { recursive: true });
  await mkdir(ORIGINALS, { recursive: true });

  for (const [i, animal] of selected.entries()) {
    const file = animal.soundFile;
    const info = infos.get(file);
    if (!info) {
      problems.push(`${animal.id}: ${file} nicht auf Commons gefunden`);
      continue;
    }
    const meta = info.extmetadata;
    const license = checkLicense(meta.LicenseShortName?.value, meta.License?.value);
    const author = stripHtml(meta.Artist?.value ?? "");
    if (!license.ok) {
      problems.push(`${file}: Lizenz „${license.name}“ ${license.reason}`);
      continue;
    }
    if (!author) {
      problems.push(`${file}: Autor fehlt`);
      continue;
    }
    const deed =
      meta.LicenseUrl?.value?.replace(/^http:\/\//, "https://") || licenseUrl(license.name);
    if (!deed) {
      problems.push(`${file}: Lizenz-URL fehlt`);
      continue;
    }
    const ext = info.url.split(".").pop() ?? "ogg";
    const hash = createHash("sha1").update(info.url).digest("hex").slice(0, 16);
    const original = join(ORIGINALS, `${hash}.${ext}`);
    const label = `[${i + 1}/${selected.length}] ${animal.id}`;
    if (!existsSync(original)) {
      console.log(`${label}: lade ${file}`);
      await download(info.url, original);
    }
    const out = join(OUT, `${animal.id}.m4a`);
    if (!existsSync(out) || built[animal.id] !== info.url) {
      console.log(`${label}: wandle`);
      processSound(original, out);
      built[animal.id] = info.url;
    } else {
      console.log(`${label}: aktuell`);
    }
    sounds.set(animal.id, {
      src: `/sounds/${animal.id}.m4a`,
      credit: { author, license: license.name, licenseUrl: deed, sourceUrl: info.pageUrl },
    });
  }
  if (problems.length > 0) {
    for (const problem of problems) console.error(`✗ ${problem}`);
    throw new Error(`${problems.length} Problem(e), Katalog unverändert.`);
  }

  for (const name of await readdir(OUT)) {
    if (!sounds.has(name.replace(/\.m4a$/, ""))) await rm(join(OUT, name));
  }
  await writeFile(BUILT, `${JSON.stringify(built, null, 2)}\n`);
  for (const entry of catalog.animals) entry.sound = sounds.get(entry.id) ?? null;
  await writeFile(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`✓ ${sounds.size} Laute, Katalog in ${CATALOG}`);
}

await main();
