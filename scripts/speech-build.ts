// `bun run speech:build` (spec 5.6): speaks every animal's name ("Die Kuh!")
// and facts with Qwen3-TTS in the voice of content/speech.json, checks each
// take with speech recognition (up to `takes` tries), processes the best one to
// `public/speech/<id>-name.m4a` / `<id>-facts.m4a` and writes `speech` into
// src/content/catalog.generated.json and the voice credit into
// src/content/credits.generated.json. Run after photos:build.
//
// The Python side (scripts/tts/) is a local build dependency like ffmpeg:
// TIERE_TTS_PYTHON names its interpreter. What was built and how well it was
// understood is recorded in content/speech.lock.json (committed), so an
// unchanged text is never spoken again.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import data from "../content/animals.json" with { type: "json" };
import config from "../content/speech.json" with { type: "json" };
import type { Catalog, ContentFile, CreditsFile } from "../src/content/types.ts";
import { fillTemplate, matchScore, SCORE_NEEDED } from "../src/engine/speechText.ts";
import { processSpeech } from "./sounds.ts";

const content = data as unknown as ContentFile;
const TAKES = ".cache/speech";
const OUT = "public/speech";
const LOCK = "content/speech.lock.json";
const CATALOG = "src/content/catalog.generated.json";
const CREDITS = "src/content/credits.generated.json";

type Kind = "name" | "facts";
type Job = { key: string; id: string; kind: Kind; text: string; hash: string };
type LockEntry = {
  hash: string;
  text: string;
  heard: string;
  score: number;
  take: number;
  /** Daniel listened and approved the clip despite a low score; lost when the clip is spoken anew. */
  approved?: boolean;
};
type Reply = { ready?: boolean; out?: string; heard?: string };

const sha1 = (value: string | Buffer) => createHash("sha1").update(value).digest("hex");

/** The Python worker: one model load, then one take per request. */
function startWorker(python: string, settings: object) {
  const child = spawn(python, ["scripts/tts/qwen_tts_job.py", JSON.stringify(settings)], {
    stdio: ["pipe", "pipe", "inherit"],
  });
  const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
  const next = async (): Promise<Reply> => {
    for (;;) {
      const line = await lines.next();
      if (line.done) throw new Error("TTS-Prozess beendet sich unerwartet");
      if (line.value.startsWith("@@ ")) return JSON.parse(line.value.slice(3)) as Reply;
    }
  };
  return {
    next,
    async speak(text: string, out: string, seed: number): Promise<string> {
      child.stdin.write(`${JSON.stringify({ text, out, seed })}\n`);
      return (await next()).heard ?? "";
    },
    stop: () => child.stdin.end(),
  };
}

async function main(): Promise<void> {
  if (!existsSync(CATALOG)) throw new Error(`${CATALOG} fehlt: erst bun run photos:build`);
  const catalog = JSON.parse(await readFile(CATALOG, "utf8")) as Catalog;
  const credits = JSON.parse(await readFile(CREDITS, "utf8")) as CreditsFile;
  const lock: Record<string, LockEntry> = existsSync(LOCK)
    ? (JSON.parse(await readFile(LOCK, "utf8")) as Record<string, LockEntry>)
    : {};
  const voice = sha1(await readFile(config.reference.file));
  const templates: Record<Kind, string> = config.templates;

  const jobs: Job[] = content.animals.flatMap((animal) =>
    (["name", "facts"] as const).map((kind) => {
      const text = fillTemplate(templates[kind], animal);
      const hash = sha1(
        JSON.stringify([config.model, voice, config.reference.text, config.seed, text]),
      );
      return { key: `${animal.id}-${kind}`, id: animal.id, kind, text, hash };
    }),
  );
  const outOf = (job: Job) => join(OUT, `${job.key}.m4a`);
  const pending = jobs.filter((job) => lock[job.key]?.hash !== job.hash || !existsSync(outOf(job)));
  await mkdir(OUT, { recursive: true });
  await mkdir(TAKES, { recursive: true });

  if (pending.length > 0) {
    const python = process.env.TIERE_TTS_PYTHON;
    if (!python) {
      throw new Error(
        `${pending.length} Sprachclip(s) fehlen. TIERE_TTS_PYTHON auf den Python-Interpreter ` +
          "mit den Paketen aus scripts/tts/requirements.txt setzen.",
      );
    }
    // Animal names as context for the recognition, so it knows the words but no single answer.
    const vocabulary = `Tiere: ${content.animals.map((animal) => animal.name).join(", ")}.`;
    const worker = startWorker(python, {
      model: config.model,
      reference: resolve(config.reference.file),
      referenceText: config.reference.text,
      language: config.language,
      vocabulary,
    });
    console.log("Lade Stimme und Spracherkennung …");
    await worker.next();
    // Takes already spoken (an interrupted run continues where it stopped).
    const heardFile = join(TAKES, "heard.json");
    const heard: Record<string, string> = existsSync(heardFile)
      ? (JSON.parse(await readFile(heardFile, "utf8")) as Record<string, string>)
      : {};
    try {
      for (const [i, job] of pending.entries()) {
        let best: { take: number; file: string; heard: string; score: number } | undefined;
        for (let take = 0; take < config.takes; take++) {
          const file = join(TAKES, `${job.hash}-${take}.wav`);
          if (!existsSync(file) || heard[file] === undefined) {
            heard[file] = await worker.speak(job.text, resolve(file), config.seed + take);
            await writeFile(heardFile, `${JSON.stringify(heard, null, 2)}\n`);
          }
          const score = matchScore(job.text, heard[file] ?? "");
          if (!best || score > best.score) best = { take, file, heard: heard[file] ?? "", score };
          if (score >= SCORE_NEEDED[job.kind]) break;
        }
        if (!best) continue;
        processSpeech(best.file, outOf(job));
        lock[job.key] = {
          hash: job.hash,
          text: job.text,
          heard: best.heard,
          score: Math.round(best.score * 1000) / 1000,
          take: best.take,
        };
        await writeFile(LOCK, `${JSON.stringify(lock, null, 2)}\n`);
        const mark = best.score >= SCORE_NEEDED[job.kind] ? "✓" : "?";
        console.log(`[${i + 1}/${pending.length}] ${mark} ${job.key}: „${best.heard}“`);
      }
    } finally {
      worker.stop();
    }
  }

  const keys = new Set(jobs.map((job) => job.key));
  for (const name of await readdir(OUT)) {
    if (!keys.has(name.replace(/\.m4a$/, ""))) await rm(join(OUT, name));
  }
  for (const key of Object.keys(lock)) if (!keys.has(key)) delete lock[key];
  await writeFile(LOCK, `${JSON.stringify(lock, null, 2)}\n`);

  for (const entry of catalog.animals) {
    const name = `/speech/${entry.id}-name.m4a`;
    const facts = `/speech/${entry.id}-facts.m4a`;
    entry.speech =
      existsSync(join("public", name)) && existsSync(join("public", facts))
        ? { name, facts }
        : null;
  }
  credits.voice = {
    author: "Qwen3-TTS (Qwen-Team, Alibaba Cloud), entworfene Stimme",
    license: config.license,
    licenseUrl: config.licenseUrl,
    sourceUrl: config.modelUrl,
  };
  await writeFile(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);
  await writeFile(CREDITS, `${JSON.stringify(credits, null, 2)}\n`);

  const unsure = jobs.filter(
    (job) => !lock[job.key]?.approved && (lock[job.key]?.score ?? 0) < SCORE_NEEDED[job.kind],
  );
  console.log(
    `✓ ${jobs.length - unsure.length} von ${jobs.length} Sprachclips verstanden oder freigegeben`,
  );
  if (unsure.length > 0) {
    console.log("Bitte anhören (die Spracherkennung war unsicher):");
    for (const job of unsure) {
      console.log(`  ${outOf(job)}: „${job.text}“ gehört als „${lock[job.key]?.heard}“`);
    }
  }
}

await main();
