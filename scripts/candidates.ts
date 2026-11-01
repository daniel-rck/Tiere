// Data model and pure helpers for photo candidates (spec 5.3). The CLI in
// photos-candidates.ts fetches; this file decides and renders.
import type { ExtraSource } from "./sources/types.ts";

export type Tier = "featured" | "quality" | "valued" | "search";

export type Candidate = {
  n: number;
  /** The identifier that goes into animals.json: a Commons file title, or "<source>:<id>". */
  title: string;
  /** Where the photo comes from; absent means Wikimedia Commons. */
  source?: ExtraSource;
  /** Display title for photos outside Commons. */
  name?: string;
  pageUrl: string;
  url: string;
  /** Thumbnail path relative to `.cache/candidates/`. */
  thumb: string;
  width: number;
  height: number;
  license: string;
  author: string;
  tier: Tier;
  /** Claude's pre-selection (at most 4 per animal). */
  proposed: boolean;
  /** Position of a proposal in the suggested display order (1 = first photo). */
  rank?: number;
  /** Why a candidate is out (child safety or quality), or a short note on a proposal. */
  note?: string;
  excluded?: boolean;
};

export type CandidateFile = {
  animal: { id: string; name: string; article: string; latin: string; world: string };
  generatedAt: string;
  candidates: Candidate[];
  /** Files dropped before download, with the reason (license, size, title). */
  skipped: { title: string; reason: string }[];
};

export const SOURCE_LABEL: Record<ExtraSource | "commons", string> = {
  commons: "Commons",
  openverse: "Openverse",
  inaturalist: "iNaturalist",
};

/** "Commons · Qualitätsbild", "iNaturalist" … */
export function originLabel(c: Pick<Candidate, "source" | "tier">): string {
  return c.source ? SOURCE_LABEL[c.source] : `${SOURCE_LABEL.commons} · ${TIER_LABEL[c.tier]}`;
}

export const TIER_LABEL: Record<Tier, string> = {
  featured: "Exzellent",
  quality: "Qualitätsbild",
  valued: "Wertvoll",
  search: "Suche",
};

export const MIN_LONG_EDGE = 1600;
export const MAX_CANDIDATES = 30;
const BITMAP_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/tiff"]);

// Titles that point to content the spec excludes (5.2) or to non-photos. A hit
// drops the file before download; the eye check on the thumbnails stays.
const TITLE_RULES: [RegExp, string][] = [
  [
    /\b(dead|death|carcass|corpse|kadaver|tot(e|er|es)?|killed|kill|slaughter|schlacht|butcher|skull|skeleton|sch[äa]del|skelett|taxiderm|stuffed|präparat|specimen|museum)\b/i,
    "Titel: tot, Präparat oder Schlachtung",
  ],
  [
    /\b(prey|hunt\w*|jagd|beute|devour\w*|deborando|feeding on|eating (a|an|the)|caught|kill\w*)\b/i,
    "Titel: Jagd oder Beute",
  ],
  [/\b(mating|copulat\w*|paarung|sex)\b/i, "Titel: Paarung"],
  [/\b(blood|blut|injur\w*|wound\w*|verletz\w*|sick|krank)\b/i, "Titel: verletzt oder krank"],
  [
    /\b(stamp|briefmarke|coin|münze|drawing|zeichnung|illustration|painting|gemälde|lithograph\w*|engraving|plate|tafel|map|karte|diagram|sculpture|statue|figurine|toy|spielzeug|logo)\b/i,
    "Titel: kein Foto",
  ],
];

export function titleReason(title: string): string | undefined {
  const name = title.replace(/^File:/, "").replace(/[_.-]/g, " ");
  for (const [pattern, reason] of TITLE_RULES) if (pattern.test(name)) return reason;
  return undefined;
}

export function sizeReason(width: number, height: number, mime: string): string | undefined {
  if (!BITMAP_MIMES.has(mime)) return `kein Bitmap (${mime})`;
  if (Math.max(width, height) < MIN_LONG_EDGE) return `zu klein (${width}×${height})`;
  return undefined;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The static contact sheet: one card per candidate, checkbox, proposals pre-checked. */
export function renderContactSheet(data: CandidateFile): string {
  const { animal } = data;
  const cards = data.candidates
    .map((c) => {
      const classes = ["card", c.proposed ? "proposed" : "", c.excluded ? "excluded" : ""].join(
        " ",
      );
      return `<label class="${classes.trim()}" data-proposed="${c.proposed}" data-rank="${c.rank ?? 99}" data-file="${escapeHtml(c.title)}">
  <img src="${escapeHtml(c.thumb)}" alt="" loading="lazy" />
  <span class="row"><input type="checkbox"${c.proposed ? " checked" : ""} /> <b>#${c.n}</b> ${originLabel(c)}</span>
  <span class="meta"><a href="${escapeHtml(c.pageUrl)}" target="_blank" rel="noreferrer">${escapeHtml(c.name ?? c.title.replace(/^File:/, ""))}</a></span>
  <span class="meta">${escapeHtml(c.license)} · ${escapeHtml(c.author)} · ${c.width}×${c.height}</span>
  ${c.note ? `<span class="note">${escapeHtml(c.note)}</span>` : ""}
</label>`;
    })
    .join("\n");
  const skipped = data.skipped
    .map((s) => `<li>${escapeHtml(s.title)} — ${escapeHtml(s.reason)}</li>`)
    .join("\n");
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Kontaktabzug: ${escapeHtml(animal.name)}</title>
<style>
  body { font: 14px/1.4 system-ui, sans-serif; margin: 16px; background: #f4f4f4; color: #222; }
  header { position: sticky; top: 0; background: #f4f4f4; padding: 8px 0; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; z-index: 1; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .card { display: flex; flex-direction: column; gap: 4px; background: #fff; border: 3px solid transparent; border-radius: 8px; padding: 8px; cursor: pointer; }
  .card img { width: 100%; height: 220px; object-fit: contain; background: #222; border-radius: 4px; }
  .card.proposed { border-color: #2e8b57; }
  .card.excluded { opacity: 0.55; }
  .card:has(input:checked) { border-color: #1e6fb8; box-shadow: 0 0 0 2px #1e6fb8; }
  .meta { font-size: 12px; color: #555; overflow-wrap: anywhere; }
  .note { font-size: 12px; color: #a33; }
  .proposed .note { color: #2e6b47; }
  button { font: inherit; padding: 8px 14px; border-radius: 6px; border: 0; background: #1e6fb8; color: #fff; cursor: pointer; }
  pre { background: #fff; padding: 8px; overflow: auto; }
</style>
</head>
<body>
<header>
  <h1 style="margin:0">${escapeHtml(animal.article)} ${escapeHtml(animal.name)} <small>(${escapeHtml(animal.latin)})</small></h1>
  <button id="copy">Auswahl kopieren</button> <span id="count"></span>
</header>
<p>Grün umrandet: Vorschläge. Blasse Karten: ausgeschlossen (Grund in Rot). Reihenfolge der Auswahl = Anzeigereihenfolge in der App.</p>
<div class="grid">
${cards}
</div>
<h2>Vorab verworfen (${data.skipped.length})</h2>
<ul>${skipped}</ul>
<pre id="out"></pre>
<script>
  const order = [];
  const boxes = [...document.querySelectorAll(".card input")];
  const ranked = boxes.filter((box) => box.checked).map((box) => box.closest(".card"));
  ranked.sort((a, b) => Number(a.dataset.rank) - Number(b.dataset.rank));
  for (const card of ranked) order.push(card.dataset.file);
  const update = () => { document.getElementById("count").textContent = order.length + " ausgewählt"; };
  for (const box of boxes) box.addEventListener("change", () => {
    const file = box.closest(".card").dataset.file;
    const i = order.indexOf(file);
    if (box.checked && i < 0) order.push(file);
    if (!box.checked && i >= 0) order.splice(i, 1);
    update();
  });
  document.getElementById("copy").addEventListener("click", async () => {
    const json = JSON.stringify(order.map((file) => ({ file })), null, 2);
    document.getElementById("out").textContent = json;
    try { await navigator.clipboard.writeText(json); } catch {}
  });
  update();
</script>
</body>
</html>
`;
}
