# Plan

Jede Phase endet mit ihrem Gate. Erst wenn es grün ist: abhaken, committen, stoppen.
Standard-Gate ist `bun run check` (oxlint + oxfmt, tsc, Vitest). Vor jedem Push zusätzlich
`bun run build` und `bunx github:daniel-rck/web-base#v0.6.0 check --strict` (läuft auch in CI).

## [x] Phase 0 – Gerüst auf web-base
- `web-base init --name tiere` (Stempel 0.6.0, wie Malbuch), dazu `sharp` für die Skripte.
- Seams: Manifest (Fullscreen, beide Ausrichtungen), Viewport ohne Seiten-Zoom, Router mit einer
  Route, `App.tsx` ohne Shell, `main.tsx` ohne `UpdatePrompt`, Platzhalter „Tiere“.
- Skripte für Inhalte und Medien in `package.json`, `bun run check` als Sammel-Gate, CI über die
  web-base-Workflows (`strict`), Dependabot.
- **Gate:** `bun run check`, `bun run build` und `web-base check --strict` grün.

## [x] Phase 1 – Inhaltsmodell und Validierung
- Typen aus Spec 4.1 in `src/content/types.ts`.
- `src/engine/validate.ts` (rein): Schema, eindeutige IDs, Welt-Referenzen, 2 Fakten, Artikel,
  Lizenz-Allowlist, `--strict`-Regeln aus Akzeptanzkriterium 11. Mit Tests.
- `scripts/validate-content.ts` als CLI darum.
- **Gate:** `bun run check`, `bun run content:check` grün (nicht strict).

## [x] Phase 2 – Medienquellen und Kontaktabzug
- `scripts/commons.ts`, `src/engine/licenses.ts` (mit Tests für die Lizenz-Normalisierung; dafür das
  Vitest-`include` in `vitest.config.ts` um `scripts/**/*.test.ts` erweitern),
  `scripts/photos-candidates.ts` nach Spec 5.1–5.3; Zusatzquellen in `scripts/sources/`
  (Openverse, iNaturalist) mit `--add`.
- Kontaktabzug: einfache statische HTML-Seite, Checkbox pro Kandidat, vormarkierte Vorschläge,
  Ausschlussgründe, Button „Auswahl kopieren“.
- Für **alle 50 Tiere** Kandidaten erzeugen und nach `/fotos`-Vorgehen sichten und vormarkieren.
- **Gate:** `bun run check` grün. **Mensch-Gate:** Daniel wählt die Fotos aus und trägt sie in
  `content/animals.json` ein. Erst danach abhaken.

## [x] Phase 3 – Foto-Build
- `scripts/photos-build.ts` nach Spec 5.4, idempotent, mit Fortschrittsausgabe.
  Alle drei Quellen (`File:…`, `openverse:…`, `inaturalist:…`): Original und Credit je Quelle holen.
- Erzeugt `public/photos/…` und `src/content/catalog.generated.json`.
- `src/engine/sizes.ts` (rein): passende Größe für Viewport × devicePixelRatio, `srcset`-String. Tests.
- **Gate:** `bun run check`, `bun run content:check --strict` grün.

## [x] Phase 4 – Start und Welten
- App-Tokens (Hell/Dunkel, Weltfarben) im Seam `src/lib/ui/theme.css`, Start-Bildschirm, Welt-Bildschirm, Kacheln mit Farb-Platzhalter.
- `platform/history.ts`: Ebenen-Stack mit Zurück-Taste, auf der History der einen Route von
  react-router (nicht an ihr vorbei).
- `platform/storage.ts`: Modus lesen/schreiben mit try/catch.
- **Gate:** `bun run check`; manuell Akzeptanzkriterium 1 (bis Welt) und 8 prüfen.

## [x] Phase 5 – Vollbild
- Viewer nach Spec 3.3 ohne Entdecker-Panel: contain + Blur, Pfeile, Wischen (Tier und Foto),
  Vorladen, Sprechblase, Boing.
- `engine/gestures.ts` (rein) mit Tests: Tap, Doppeltipp, Wisch-Richtung, Schwellen.
- `platform/speech.ts` nach Spec 5.6 (vorerst nur Name + Lautwort sprechen).
- **Gate:** `bun run check`; manuell Kriterien 2, 3, 4.

## [x] Phase 6 – Entdecker-Modus und Eltern-Bereich
- Eltern-Sperre (langes Drücken + Aufgabe), `engine/gate.ts` (rein) mit Tests.
- Einstellungen, Credits-Seite.
- Entdecker-Panel, `engine/zoom.ts` (rein, Pinch + Pan + Grenzen) mit Tests, Doppeltipp-Zoom.
- **Gate:** `bun run check`; manuell Kriterien 5, 6, 7, 12.

## [ ] Phase 7 – Tierlaute
- `sounds-candidates.ts`, `sounds-build.ts` nach Spec 5.5, Sichtung wie bei Fotos.
- `platform/audio.ts`: Abspielen nach dem Namen, Abbrechen bei erneutem Tippen.
- **Gate:** `bun run check`. **Mensch-Gate:** Daniel hört die Auswahl an und gibt sie frei.

## [x] Phase 8 – PWA, Offline, Feinschliff
- Service Worker `src/sw/index.ts` (`injectManifest`) nach Spec 7, Manifest, Icon
  (`public/icon-192.png`, `icon-512.png`, `icon-maskable.png`), Update-Hinweis ohne Text
  (`useAppUpdate`, wie Malbuch).
- Budgets aus Spec 8 messen und einhalten, Reduced Motion, Fokus, Kontextmenü, Overscroll.
- Alle Akzeptanzkriterien durchgehen und Ergebnis in `docs/specs/tiere.md` notieren.
- **Gate:** `bun run check`, `bun run build`, Kriterien 9 und 10 manuell geprüft.
