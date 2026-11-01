// Validates content/animals.json (spec 4.1, acceptance criterion 11).
// Usage: bun run content:check [--strict]
//   --strict  release rules: 3–6 photos per animal, and a complete credit with
//             an allowlisted license for every photo and sound in the catalog.
import { existsSync, readFileSync } from "node:fs";
import { validateContent } from "../src/engine/validate.ts";

const CONTENT = "content/animals.json";
const CATALOG = "src/content/catalog.generated.json";
const CREDITS = "src/content/credits.generated.json";

const strict = process.argv.includes("--strict");
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

const content = readJson(CONTENT);
const optional = (path: string) => (strict && existsSync(path) ? readJson(path) : undefined);
const issues = validateContent(content, {
  strict,
  catalog: optional(CATALOG),
  credits: optional(CREDITS),
});

if (issues.length > 0) {
  for (const issue of issues) console.error(`✗ ${issue.path}: ${issue.message}`);
  console.error(`\n${issues.length} Problem(e) in ${CONTENT}${strict ? " (strict)" : ""}.`);
  process.exit(1);
}

const { worlds, animals } = content as { worlds: unknown[]; animals: { photos: unknown[] }[] };
const photos = animals.reduce((sum, animal) => sum + animal.photos.length, 0);
console.log(
  `✓ ${CONTENT}: ${worlds.length} Welten, ${animals.length} Tiere, ${photos} Fotos${strict ? " (strict)" : ""}.`,
);
