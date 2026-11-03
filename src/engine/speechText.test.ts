import { describe, expect, it } from "vitest";
import { fillTemplate, matchScore, normalizeHeard, SCORE_NEEDED } from "./speechText.ts";

const cow = {
  article: "die",
  name: "Kuh",
  facts: ["Sie frisst Gras.", "Ihr Magen hat vier Teile."],
};

describe("fillTemplate", () => {
  it("fills article, name and facts", () => {
    expect(fillTemplate("{Artikel} {name}!", cow)).toBe("Die Kuh!");
    expect(fillTemplate("Das ist {artikel} {name}.", cow)).toBe("Das ist die Kuh.");
    expect(fillTemplate("{Artikel} {name}. {fakten}", cow)).toBe(
      "Die Kuh. Sie frisst Gras. Ihr Magen hat vier Teile.",
    );
  });
});

describe("matchScore", () => {
  it("ignores case, punctuation and units that sound alike", () => {
    expect(normalizeHeard("Die Kuh!")).toBe("die kuh");
    expect(matchScore("Die Kuh!", "die Kuh.")).toBe(1);
    expect(matchScore("bis zu 70 Kilo Gras", "bis zu 70 kg Gras")).toBe(1);
    expect(matchScore("Der Orang-Utan!", "Der Orang Utan.")).toBe(1);
  });

  it("rejects a misspoken name", () => {
    expect(matchScore("Die Kuh!", "Die cool!")).toBeLessThan(SCORE_NEEDED.name);
    expect(matchScore("Das Erdmännchen!", "Das Erdmenschen.")).toBeLessThan(SCORE_NEEDED.name);
  });

  it("lets a long fact through with a small slip", () => {
    const fact = "Die Kuh. Eine Kuh frisst am Tag bis zu 70 Kilo Gras. Ihr Magen hat vier Teile.";
    const heard = "Die Kuh, eine Kuh frisst am Tag bis zu 70 kg. Ihr Magen hat vier Teile.";
    expect(matchScore(fact, heard)).toBeGreaterThanOrEqual(SCORE_NEEDED.facts);
  });
});
