# Plan

Jede Phase endet mit ihrem Gate. Erst wenn es grün ist: abhaken, committen, stoppen.
Standard-Gate ist `bun run check` (Biome + tsc + bun test).

## [ ] Phase 0 – Gerüst
- `bun add react react-dom` und `bun add -d vite @vitejs/plugin-react vite-plugin-pwa typescript
  @types/react @types/react-dom @types/bun @biomejs/biome sharp`, jeweils aktuelle stabile Versionen.
- Vite + React 19 einrichten, `index.html`, leeres `App.tsx` mit Platzhalter „Tiere“.
- `biome.json` und `tsconfig.json` aus dem Repo übernehmen, `biome.json` bei Bedarf mit
  `bunx biome migrate` auf die installierte Version bringen.
- Ein trivialer Test, damit `bun test` läuft.
- **Gate:** `bun run check` und `bun run build` grün.

## [ ] Phase 1 – Inhaltsmodell und Validierung
- Typen aus Spec 4.1 in `src/content/types.ts`.
- `src/lib/validate.ts` (rein): Schema, eindeutige IDs, Welt-Referenzen, 2 Fakten, Artikel,
  Lizenz-Allowlist, `--strict`-Regeln aus Akzeptanzkriterium 11. Mit Tests.
- `scripts/validate-content.ts` als CLI darum.
- **Gate:** `bun run check`, `bun run content:check` grün (nicht strict).

## [ ] Phase 2 – Commons-Client und Kontaktabzug
- `scripts/commons.ts`, `scripts/licenses.ts` (mit Tests für die Lizenz-Normalisierung),
  `scripts/photos-candidates.ts` nach Spec 5.1–5.3.
- Kontaktabzug: einfache statische HTML-Seite, Checkbox pro Kandidat, vormarkierte Vorschläge,
  Ausschlussgründe, Button „Auswahl kopieren“.
- Für **alle 20 Tiere** Kandidaten erzeugen und nach `/fotos`-Vorgehen sichten und vormarkieren.
- **Gate:** `bun run check` grün. **Mensch-Gate:** Daniel wählt die Fotos aus und trägt sie in
  `content/animals.json` ein. Erst danach abhaken.

## [ ] Phase 3 – Foto-Build
- `scripts/photos-build.ts` nach Spec 5.4, idempotent, mit Fortschrittsausgabe.
- Erzeugt `public/photos/…` und `src/content/catalog.generated.json`.
- `src/lib/sizes.ts` (rein): passende Größe für Viewport × devicePixelRatio, `srcset`-String. Tests.
- **Gate:** `bun run check`, `bun run content:check --strict` grün.

## [ ] Phase 4 – Start und Welten
- Tokens (Hell/Dunkel), Start-Bildschirm, Welt-Bildschirm, Kacheln mit Farb-Platzhalter.
- `platform/history.ts`: Ebenen-Stack mit Zurück-Taste.
- `platform/storage.ts`: Modus lesen/schreiben mit try/catch.
- **Gate:** `bun run check`; manuell Akzeptanzkriterium 1 (bis Welt) und 8 prüfen.

## [ ] Phase 5 – Vollbild
- Viewer nach Spec 3.3 ohne Entdecker-Panel: contain + Blur, Pfeile, Wischen (Tier und Foto),
  Vorladen, Sprechblase, Boing.
- `lib/gestures.ts` (rein) mit Tests: Tap, Doppeltipp, Wisch-Richtung, Schwellen.
- `platform/speech.ts` nach Spec 5.6 (vorerst nur Name + Lautwort sprechen).
- **Gate:** `bun run check`; manuell Kriterien 2, 3, 4.

## [ ] Phase 6 – Entdecker-Modus und Eltern-Bereich
- Eltern-Sperre (langes Drücken + Aufgabe), `lib/gate.ts` (rein) mit Tests.
- Einstellungen, Credits-Seite.
- Entdecker-Panel, `lib/zoom.ts` (rein, Pinch + Pan + Grenzen) mit Tests, Doppeltipp-Zoom.
- **Gate:** `bun run check`; manuell Kriterien 5, 6, 7, 12.

## [ ] Phase 7 – Tierlaute
- `sounds-candidates.ts`, `sounds-build.ts` nach Spec 5.5, Sichtung wie bei Fotos.
- `platform/audio.ts`: Abspielen nach dem Namen, Abbrechen bei erneutem Tippen.
- **Gate:** `bun run check`. **Mensch-Gate:** Daniel hört die Auswahl an und gibt sie frei.

## [ ] Phase 8 – PWA, Offline, Feinschliff
- `vite-plugin-pwa` nach Spec 7, Manifest, Icon.
- Budgets aus Spec 8 messen und einhalten, Reduced Motion, Fokus, Kontextmenü, Overscroll.
- Alle Akzeptanzkriterien durchgehen und Ergebnis in `docs/specs/tiere.md` notieren.
- **Gate:** `bun run check`, `bun run build`, Kriterien 9 und 10 manuell geprüft.
