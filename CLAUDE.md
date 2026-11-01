# Tiere

Tierfoto-App für Kinder als installierbare PWA. Große Fotos nach Welten (Bauernhof, Zoo, Dschungel,
Meer), Tiername und Tierlaut auf Tippen. Kleinkind-Modus ab 2 als Standard, Entdecker-Modus ab 5
hinter einer Eltern-Sperre.

## Quellen der Wahrheit

1. `docs/specs/tiere.md` – lebende Spec: Was und Warum. Bei Widerspruch gewinnt die Spec.
2. `PLAN.md` – Phasen mit Gates: Wie und in welcher Reihenfolge.
3. `content/animals.json` – alle Inhalte (Welten, Tiere, Fakten, ausgewählte Fotos und Laute).
   Inhalte kommen nie hart codiert in Komponenten.
4. `docs/reference/prototype.html` – funktionierender Single-File-Prototyp. Referenz für Look,
   Bedienung, Gesten und Eltern-Sperre. **Nicht** die Code-Struktur übernehmen und **nicht** das
   Laden der Fotos von Wikipedia zur Laufzeit – das war nur eine Abkürzung.

## Arbeitsweise

- Arbeite genau eine Phase aus `PLAN.md` ab, dann stoppen und das Gate laufen lassen.
- Gate nicht grün → fixen, nicht weitermachen. Gate grün → Phase in `PLAN.md` abhaken und mit
  Conventional Commit committen (`feat(viewer): …`, `chore: …`, `test(content): …`).
- Phasen mit **Mensch-Gate** (Foto-Auswahl) enden mit einer Übergabe an Daniel. Nicht selbst
  freigeben.
- Entscheidungen, die die Spec nicht abdeckt: kurz in `docs/specs/tiere.md` unter
  „Entscheidungslog“ ergänzen, nicht still im Code treffen.
- Spec-Inhalte (Features, Akzeptanzkriterien) nur nach Rückfrage ändern.

## Befehle

```bash
bun install
bun run dev                     # Vite Dev-Server
bun run check                   # biome check + tsc --noEmit + bun test  ← das Gate
bun run build                   # Production-Build inkl. PWA
bun run content:check           # Inhalte validieren (--strict verlangt Fotos für jedes Tier)
bun run photos:candidates <id>  # Commons-Kandidaten suchen → Kontaktabzug in .cache/
bun run photos:build            # ausgewählte Fotos laden, skalieren, Credits erzeugen
bun run sounds:candidates <id>  # Commons-Tierlaute suchen
bun run sounds:build            # ausgewählte Laute laden, schneiden, nach .m4a wandeln
```

## Harte Regeln

- Keine Accounts, kein Tracking, keine Analytics, keine Werbung, keine Links nach außen
  (Ausnahme: Credits-Seite hinter der Eltern-Sperre).
- **Keine Netzwerk-Requests zur Laufzeit.** Alles, was die App zeigt oder abspielt, liegt im Build.
  Wikimedia Commons wird ausschließlich von `scripts/` zur Build-Zeit angesprochen.
- Nur Medien mit Lizenz aus der Allowlist der Spec, jedes mit vollständigem Credit.
- Jedes Foto erfüllt die Kinderschutz-Kriterien der Spec. Im Zweifel raus.
- Fotos im Vollbild werden nie beschnitten (`object-fit: contain` + unscharfer Hintergrund).
- Touch-Ziele ≥ 64 px, im Kleinkind-Modus keine Funktion, die Lesen voraussetzt.
- Keine bekannten Figuren, Marken oder Maskottchen.

## Konventionen

- Bun als Runtime und Package Manager, Biome (2 Spaces, 100 Zeichen, doppelte Anführungszeichen,
  Semikolons, Trailing Commas).
- TypeScript strict mit `noUncheckedIndexedAccess` und `verbatimModuleSyntax`, explizite
  `.ts`/`.tsx`-Endungen in Imports.
- Code, Bezeichner und Kommentare auf Englisch, UI-Texte auf Deutsch.
- Reine Logik (Gesten, Eltern-Sperre, Bildgrößen, Content-Validierung) liegt DOM-frei in `src/lib/`
  und ist mit `bun test` abgedeckt.
