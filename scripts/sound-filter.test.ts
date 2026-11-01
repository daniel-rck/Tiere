import { describe, expect, it } from "vitest";
import { soundJunk, soundScore } from "./sound-filter.ts";

describe("soundJunk", () => {
  it.each([
    ["File:LL-Q1860 (eng)-Vealhurl-hippo.wav", "", "Aussprache"],
    ["File:De-Nashorn.ogg", "Aussprache des deutschen Wortes", "Aussprache"],
    ["File:En-us-gorilla in the room.oga", "", "Aussprache"],
    ["File:Ms-MY-orang utan.ogg", "", "Aussprache"],
    [
      "File:Bactrian Camel (intro).ogg",
      "Das ist die gesprochene Version des Wikipedia-Artikels",
      "gesprochener Artikel",
    ],
    ["File:Tiger Rag ODJB.ogg", "Tiger Rag by the Original Dixieland Jass Band", "Musik"],
    ["File:Rhinoceros (ISRC USUAN1500040).mp3", "synth pop", "Musik"],
    [
      "File:Jaguar XKR (2009).ogg",
      "pulling away from the start on the Friday of the Goodwood Festival of Speed",
      "Fahrzeug",
    ],
    ["File:Man grunts like pig.ogg", "Title Man grunts like Pig", "Mensch imitiert"],
  ])("drops %s", (title, description, reason) => {
    expect(soundJunk(title, description)).toBe(reason);
  });

  it.each([
    ["File:Single Cow Moo.ogg", "A cow mooing at the farm in Pitlochry, United Kingdom."],
    ["File:Phoenicopterus roseus - Greater Flamingo XC432217.mp3", "Type: flight call"],
    ["File:Erdmaennchen.ogg", "Warnrufe eines Erdmännchens"],
    ["File:Jaguar saw.flac", "The saw sound made by a jaguar."],
  ])("keeps %s", (title, description) => {
    expect(soundJunk(title, description)).toBeUndefined();
  });
});

describe("soundScore", () => {
  it("prefers the species in the title and a call word", () => {
    const terms = ["Panthera onca", "jaguar"];
    expect(
      soundScore("File:Jaguar saw.flac", "The saw sound made by a jaguar.", terms),
    ).toBeGreaterThan(soundScore("File:Big cats.ogg", "various cats, one jaguar", terms));
  });
});
