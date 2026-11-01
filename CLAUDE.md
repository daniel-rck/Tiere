# Tiere

Tierfoto-App für Kinder als installierbare PWA. Große Fotos nach Welten (Bauernhof, Zoo, Dschungel,
Meer), Tiername und Tierlaut auf Tippen. Kleinkind-Modus ab 2 als Standard, Entdecker-Modus ab 5
hinter einer Eltern-Sperre. Aufgesetzt auf [web-base](https://github.com/daniel-rck/web-base)
(Stempel `webBase.version` in `package.json`), Vorbild ist das Malbuch.

## Quellen der Wahrheit

1. `docs/specs/tiere.md` – lebende Spec: Was und Warum. Bei Widerspruch gewinnt die Spec.
2. `PLAN.md` – Phasen mit Gates: Wie und in welcher Reihenfolge.
3. `content/animals.json` – alle Inhalte (Welten, Tiere, Fakten, ausgewählte Fotos und Laute).
   Inhalte kommen nie hart codiert in Komponenten.
4. `docs/reference/prototype.html` – funktionierender Single-File-Prototyp. Referenz für Look,
   Bedienung, Gesten und Eltern-Sperre. **Nicht** die Code-Struktur übernehmen und **nicht** das
   Laden der Fotos von Wikipedia zur Laufzeit – das war nur eine Abkürzung.
5. web-base-Konventionen: `web-base/docs/specs/07-conventions.md`, Stack und Bausteine im Skill
   `web-base/skill/`. Bei Widerspruch zur Spec gewinnt die Spec, die Abweichung steht im
   Entscheidungslog.

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
bun run check                   # lint (oxlint + oxfmt) + typecheck + test (Vitest)  ← das Gate
bun run format                  # oxfmt schreibt die Formatierung
bun run build                   # Production-Build inkl. PWA
bunx github:daniel-rck/web-base#v0.6.0 check --strict   # web-base-Dateien unverändert?
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
- **web-base-Dateien nicht anfassen**, die `check` als *owned* führt (`src/lib/ui/*` außer
  `theme.css`/`index.ts`, `src/lib/db/{open,mutations,useLiveQuery}.ts`, `src/lib/routing/*`,
  `src/lib/pwa/*`, `src/sw/base.ts`, `worker/base.ts`, `src/test/setup.ts`, `oxlint.base.json`,
  `.oxfmtrc.json`, …). Änderungen dort gehören nach web-base. Die Shell der Basis (`AppShell`,
  `UpdatePrompt`, …) ist nur für `check --strict` installiert und wird nicht importiert.

## Konventionen

- Bun als Runtime und Package Manager, oxlint + oxfmt aus web-base (2 Spaces, 100 Zeichen, doppelte
  Anführungszeichen, Semikolons, Trailing Commas). Eigene Lint-Regeln nur in `.oxlintrc.json`,
  eigene Formatter-Ausnahmen nur in `.prettierignore`.
- TypeScript strict mit `noUncheckedIndexedAccess` und `verbatimModuleSyntax`, explizite
  `.ts`/`.tsx`-Endungen in Imports.
- Code, Bezeichner und Kommentare auf Englisch, UI-Texte auf Deutsch.
- Reine Logik (Gesten, Zoom, Eltern-Sperre, Bildgrößen, Content-Validierung) liegt DOM-frei in
  `src/engine/` und ist mit Vitest abgedeckt (`*.test.ts` neben der Datei).
