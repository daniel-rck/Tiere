// Texts for the built speech clips (spec 5.6) and the check of a generated
// take against what speech recognition heard in it.

export type SpeechAnimal = { article: string; name: string; facts: readonly string[] };

/** Fills `{Artikel}` (capitalised), `{artikel}`, `{name}` and `{fakten}`. */
export function fillTemplate(template: string, animal: SpeechAnimal): string {
  const article = animal.article;
  return template
    .replaceAll("{Artikel}", `${article.charAt(0).toUpperCase()}${article.slice(1)}`)
    .replaceAll("{artikel}", article)
    .replaceAll("{name}", animal.name)
    .replaceAll("{fakten}", animal.facts.join(" "));
}

/** Lower case, letters and digits only; units and spellings that sound alike are made equal. */
export function normalizeHeard(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[-‐–]/g, " ")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\b(kilogramm|kg)\b/g, "kilo")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/** 1 when the heard text matches the expected one, towards 0 the more it differs. */
export function matchScore(expected: string, heard: string): number {
  const a = normalizeHeard(expected);
  const b = normalizeHeard(heard);
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - levenshtein(a, b) / longest;
}

/** A take is good enough: names must be (almost) exact, longer facts may differ a little. */
export const SCORE_NEEDED = { name: 0.9, facts: 0.85 } as const;
