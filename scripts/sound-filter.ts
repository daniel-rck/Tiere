// Pre-filter and ranking for sound candidates (spec 5.5): Commons search for an
// animal's name finds mostly pronunciations, spoken articles and music. Those
// never make a usable call, so they are dropped before anything is downloaded.

const strip = (s: string) => s.replace(/^File:/, "");

/** Words that mark a recording of an animal's voice in a title or description. */
const CALL_WORDS =
  /\b(call|calls|calling|song|sound|sounds|voice|roar|roaring|growl|bark|barking|bleat|bleating|moo|mooing|neigh|whinny|bray|braying|trumpet|trumpeting|grunt|grunting|hiss|hissing|whistle|click|clicks|meow|quack|honk|honking|cackl|crow|crowing|chatter|scream|rumble|vocali[sz]ation|ruf|rufe|stimme|wiehern|bellen|brüllen|blöken|meckern|grunzen|gackern|schnattern|miau)/i;

/**
 * Why a Commons file cannot be an animal's call, or undefined if it might be.
 * Looks at the file title and description only, so it runs before download.
 */
export function soundJunk(title: string, description: string): string | undefined {
  const name = strip(title);
  const text = `${name} ${description}`;
  if (/^LL-Q\d+/.test(name)) return "Aussprache";
  if (/^[A-Z][a-z]{1,2}(-[a-zA-Z]{2,3})?-/.test(name)) return "Aussprache";
  if (/pronunc|aussprache|hörbeispiel|prononci|wikiwoordenbo|audio kosakata/i.test(text)) {
    return "Aussprache";
  }
  if (/wikipedia|gesprochene version|article|artikel|podpedia|audio reading/i.test(text)) {
    return "gesprochener Artikel";
  }
  if (
    /\bISRC\b|\bsong by\b|\brag\b|orchestra|\bband\b|anthem|hymne|\.mid$|piano|album/i.test(text)
  ) {
    return "Musik";
  }
  if (/engine|exhaust|festival of speed|motor/i.test(text)) return "Fahrzeug";
  if (/\bman (bleats|grunts|imitat)|imitation|nachgemacht/i.test(text)) return "Mensch imitiert";
  return undefined;
}

/** Higher is more likely a clean recording of this animal. */
export function soundScore(title: string, description: string, terms: string[]): number {
  const name = strip(title).toLowerCase();
  const text = `${name} ${description.toLowerCase()}`;
  let score = 0;
  for (const term of terms) {
    const t = term.toLowerCase();
    if (name.includes(t)) score += 3;
    else if (text.includes(t)) score += 1;
  }
  if (CALL_WORDS.test(text)) score += 2;
  // xeno-canto recordings: field recordings of one species, well documented.
  if (/\bXC\d+/.test(name)) score += 1;
  return score;
}
