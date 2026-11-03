import { describe, expect, it } from "vitest";
import content from "../../content/animals.json" with { type: "json" };
import type { Animal, Catalog, ContentFile, Credit, CreditsFile } from "../content/types.ts";
import { isPhotoRef, validateContent } from "./validate.ts";

const photo = (n: number) => ({ file: `File:Cow ${n}.jpg` });

function animal(overrides: Partial<Animal> = {}): Animal {
  return {
    id: "kuh",
    world: "bauernhof",
    name: "Kuh",
    article: "die",
    latin: "Bos taurus",
    voice: { kind: "sound", text: "Muuuh!" },
    facts: ["Fakt eins.", "Fakt zwei."],
    photos: [photo(1), photo(2), photo(3)],
    soundFile: null,
    ...overrides,
  };
}

function file(animals: Animal[] = [animal()]): ContentFile {
  return {
    worlds: [{ id: "bauernhof", name: "Bauernhof", emoji: "🐄", color: "#F3C13A", ink: "#3E2900" }],
    animals,
  };
}

const credit = (overrides: Partial<Credit> = {}): Credit => ({
  author: "Jane Doe",
  license: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Cow_1.jpg",
  ...overrides,
});

function catalogFor(data: ContentFile): Catalog {
  return {
    worlds: data.worlds,
    animals: data.animals.map(({ latin: _latin, photos, soundFile: _sound, ...rest }) => ({
      ...rest,
      photos: photos.map(() => ({
        sizes: [{ w: 640, src: "/photos/x/1-640.webp" }],
        width: 4000,
        height: 3000,
        color: "#808080",
      })),
      sound: null,
      speech: { name: `/speech/${rest.id}-name.m4a`, facts: `/speech/${rest.id}-facts.m4a` },
    })),
  };
}

function creditsFor(data: ContentFile, photoCredit = credit()): CreditsFile {
  return {
    animals: data.animals.map((a) => ({
      id: a.id,
      photos: a.photos.map(() => photoCredit),
      sound: null,
    })),
    voice: credit({
      author: "Qwen3-TTS",
      license: "Apache 2.0",
      licenseUrl: "https://www.apache.org/licenses/LICENSE-2.0",
      sourceUrl: "https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base",
    }),
  };
}

/** Both generated files for `data`, as photos:build writes them. */
const built = (data: ContentFile, photoCredit?: Credit) => ({
  strict: true,
  catalog: catalogFor(data),
  credits: creditsFor(data, photoCredit),
});

const messages = (data: unknown, options?: Parameters<typeof validateContent>[1]) =>
  validateContent(data, options).map((issue) => `${issue.path}: ${issue.message}`);

describe("validateContent", () => {
  it("accepts the real content", () => {
    expect(messages(content)).toEqual([]);
  });

  it("accepts a minimal valid file", () => {
    expect(messages(file())).toEqual([]);
  });

  it("rejects something that is not a content file", () => {
    expect(messages(null)).toEqual([": erwartet ein Objekt mit worlds und animals"]);
    expect(messages({ worlds: [], animals: [] })).toEqual([
      "worlds: erwartet eine nicht leere Liste",
      "animals: erwartet eine nicht leere Liste",
    ]);
  });

  it("finds duplicate IDs and unknown worlds", () => {
    const data = file([animal(), animal({ world: "wald", photos: [] })]);
    expect(messages(data)).toEqual([
      "animals.kuh.id: doppelte Tier-ID „kuh“",
      "animals.kuh.world: unbekannte Welt „wald“",
    ]);
  });

  it("checks IDs, colours and empty worlds", () => {
    const data = file([animal({ id: "Kuh" })]);
    data.worlds.push({ id: "meer", name: "Meer", emoji: "🐠", color: "blau", ink: "#FFFFFF" });
    expect(messages(data)).toEqual([
      "worlds[1].color: erwartet eine Farbe im Format #RRGGBB",
      "animals.Kuh.id: erwartet eine ID in kebab-case (a–z, 0–9, -)",
      "worlds.meer: Welt hat keine Tiere",
    ]);
  });

  it("requires exactly two facts and a valid article", () => {
    const bad = { ...animal(), facts: ["Nur einer."], article: "dem" };
    expect(messages(file([bad as unknown as Animal]))).toEqual([
      "animals.kuh.article: erwartet der, die oder das",
      "animals.kuh.facts: erwartet genau 2 Fakten",
    ]);
  });

  it("flags unknown fields and untrimmed texts", () => {
    const bad = { ...animal({ name: " Kuh" }), colour: "braun" };
    expect(messages(file([bad]))).toEqual([
      "animals.kuh.colour: unbekanntes Feld",
      "animals.kuh.name: erwartet einen Namen",
    ]);
  });

  it("checks photo references and duplicates across animals", () => {
    const data = file([
      animal({ photos: [photo(1), { file: "Cow.jpg" }, { file: "File:Cow.svg" }] }),
      animal({ id: "schwein", photos: [photo(1)] }),
    ]);
    expect(messages(data)).toEqual([
      "animals.kuh.photos[1].file: erwartet „File:….jpg“, „openverse:<uuid>“ oder „inaturalist:<beobachtung>/<foto>“",
      "animals.kuh.photos[2].file: erwartet „File:….jpg“, „openverse:<uuid>“ oder „inaturalist:<beobachtung>/<foto>“",
      "animals.schwein.photos[0].file: Foto ist schon bei „kuh“ eingetragen",
    ]);
  });

  it("allows at most six photos", () => {
    const data = file([animal({ photos: [1, 2, 3, 4, 5, 6, 7].map(photo) })]);
    expect(messages(data)).toEqual(["animals.kuh.photos: höchstens 6 Fotos, gefunden 7"]);
  });

  it("checks sound files", () => {
    const data = file([
      animal({ soundFile: "File:Cow.jpg" }),
      animal({
        id: "giraffe",
        photos: [],
        voice: { kind: "quiet", text: "Psst" },
        soundFile: "File:Giraffe.ogg",
      }),
    ]);
    expect(messages(data)).toEqual([
      "animals.kuh.soundFile: erwartet null oder einen Commons-Audiotitel („File:….ogg“)",
      "animals.giraffe.soundFile: stille Tiere bekommen keinen Laut (spec 5.5)",
    ]);
  });
});

describe("validateContent --strict", () => {
  it("passes with a matching catalog", () => {
    const data = file();
    expect(messages(data, built(data))).toEqual([]);
  });

  it("requires catalog and credits", () => {
    expect(messages(file(), { strict: true })).toEqual([
      "catalog: Katalog fehlt oder ist ungültig, erst `bun run photos:build` laufen lassen",
    ]);
    const data = file();
    expect(messages(data, { strict: true, catalog: catalogFor(data) })).toEqual([
      "credits: Bildnachweise fehlt oder ist ungültig, erst `bun run photos:build` laufen lassen",
    ]);
  });

  it("requires at least three photos", () => {
    const data = file([animal({ photos: [photo(1), photo(2)] })]);
    expect(messages(data, built(data))).toEqual([
      "animals.kuh.photos: mindestens 3 Fotos, gefunden 2",
    ]);
  });

  it("requires a complete, allowlisted credit for every photo", () => {
    const data = file();
    const options = built(data, credit({ author: "", license: "CC BY-NC 4.0" }));
    expect(messages(data, options).slice(0, 2)).toEqual([
      "credits.kuh.photos[0].author: Autor fehlt",
      "credits.kuh.photos[0].license: „CC BY-NC 4.0“: NC/ND",
    ]);
  });

  it("notices a catalog that is out of date", () => {
    const data = file();
    const old = built(file([animal({ photos: [photo(1)] })]));
    expect(messages(data, old)).toEqual([
      "catalog.kuh.photos: Katalog hat 1 Fotos, Inhalt 3",
      "credits.kuh.photos[1]: Credit fehlt",
      "credits.kuh.photos[2]: Credit fehlt",
    ]);
  });

  it("requires a sound credit when the animal has a sound", () => {
    const data = file([animal({ soundFile: "File:Cow.ogg" })]);
    expect(messages(data, built(data))).toEqual([
      "catalog.kuh.sound: Laut fehlt im Katalog",
      "credits.kuh.sound: Credit fehlt",
    ]);
  });

  it("requires the speech clips and the voice credit", () => {
    const data = file();
    const options = built(data);
    for (const entry of options.catalog.animals) entry.speech = null;
    delete options.credits.voice;
    expect(messages(data, options)).toEqual([
      "catalog.kuh.speech: Sprachclips fehlen, erst `bun run speech:build` laufen lassen",
      "credits.voice: Credit der Stimme fehlt, erst `bun run speech:build` laufen lassen",
    ]);
  });
});

describe("isPhotoRef", () => {
  it.each([
    ["File:Cow (Fleckvieh breed) Oeschinensee.jpg", true],
    ["File:Clownfisk.JPG", true],
    ["File:Red-eyed Tree Frog.png", true],
    ["openverse:0a1b2c3d-4e5f-6789-abcd-ef0123456789", true],
    ["inaturalist:12867185/18676210", true],
    ["inaturalist:18676210", false],
    ["File:Cow.svg", false],
    ["Cow.jpg", false],
    ["inaturalist:abc", false],
  ])("%s → %s", (ref, ok) => {
    expect(isPhotoRef(ref)).toBe(ok);
  });
});
