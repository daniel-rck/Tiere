# Spec: Tiere

Status: lebend. Änderungen an Features und Akzeptanzkriterien nur nach Rückfrage bei Daniel.

## 1. Ziel

Kinder schauen sich große, echte Tierfotos an, sortiert nach Welten. Ein Knopf spielt den Tierlaut,
ein zweiter sagt den Namen. Für Kleinkinder ab 2 funktioniert alles ohne Lesen. Ältere Kinder
(ab ca. 5) bekommen im Entdecker-Modus Namen zum Lesen, Fakten und Zoom.

**Nicht-Ziele:** Accounts, Cloud-Sync, Tracking, Werbung, In-App-Käufe, Spielmechanik mit Druck
(Punkte, Timer, Belohnungen). Kein Inhalt, der zur Laufzeit aus dem Netz kommt.

## 2. Zielgruppen und Modi

| Modus | Alter | Verhalten |
|---|---|---|
| Kleinkind (Standard) | ab 2 | Nur Fotos, keine Texte nötig. Laut-Knopf = Tierlaut, Lautsprecher-Knopf = Name. Wischen = nächstes Tier. Kein Zoom. |
| Entdecker | ab 5 | Name mit Artikel lesbar, 2 Fakten pro Tier, „Vorlesen“, Pinch- und Doppeltipp-Zoom. |

Der Modus wird in `localStorage` gespeichert und nur im Eltern-Bereich gewechselt.

## 3. Bildschirme

### 3.1 Start
- 4 Welt-Kacheln im 2×2-Raster, im Querformat ab 16:10 als 1×4. Kachel = Weltfarbe, großes Emoji,
  Weltname. Tippen öffnet die Welt, gesprochen wird nichts.
- Zahnrad oben rechts öffnet den Eltern-Bereich nur per **1,5 s langem Drücken** mit sichtbarem
  Fortschrittsring. Kurzes Tippen zeigt den Hinweis „Für die Eltern-Einstellungen das Zahnrad lange
  drücken“.

### 3.2 Welt
- Sticky Kopfzeile in Weltfarbe mit großem Zurück-Button (≥ 64 px) und Weltname.
- Raster aus Tier-Kacheln (Hochformat 4:5, `object-fit: cover` ist hier erlaubt): 2 Spalten auf dem
  Handy, 3 ab 700 px, 4 ab 1100 px. Platzhalter in der Durchschnittsfarbe des Fotos, bis es geladen
  ist. Namen auf den Kacheln nur im Entdecker-Modus.

### 3.3 Vollbild (Kern der App)
- Foto füllt den Bildschirm mit `object-fit: contain`, **nie beschnitten**. Dahinter dasselbe Foto in
  640 px, stark weichgezeichnet und abgedunkelt, damit keine Balken entstehen.
- Beim Öffnen und bei jedem Tierwechsel: Sprechblase mit dem Lautwort zeigen (stille Tiere: 🤫).
  Abgespielt oder gesprochen wird dabei nichts; ein laufender Laut oder Name verstummt.
- Tippen: kleine „Boing“-Animation und Sprechblase, kein Ton.
- Laut-Knopf unten in der Mitte (≥ 64 px, Noten-Symbol): spielt den Tierlaut, mit Boing und
  Sprechblase. Nur so spielt die App einen Tierlaut. Tiere ohne Aufnahme haben keinen Laut-Knopf.
- Lautsprecher-Knopf oben rechts (≥ 64 px): sagt den Namen mit Artikel, nie das Lautwort. Nur so
  spricht die App einen Namen.
- Wischen links/rechts oder große Pfeil-Buttons: nächstes/vorheriges Tier der Welt, zyklisch.
- Mehrere Fotos pro Tier: Wischen nach oben/unten wechselt das Foto desselben Tiers (Punkte-Indikator
  am rechten Rand). Links/rechts bleibt immer „anderes Tier“.
- Entdecker-Modus: Unter dem Foto (nicht darüber) ein Panel mit Name + Artikel, 2 Fakten und
  „Vorlesen“. Pinch-Zoom 1–4× mit Verschieben, Doppeltipp schaltet 1× ↔ 2,5× an der Tippstelle.
  Solange gezoomt ist, wechselt Wischen nicht das Tier.
- Gerät-Zurück-Taste und Escape schließen die oberste Ebene (Vollbild → Welt → Start).
- Nachbarbilder (links, rechts, nächstes Foto) werden vorgeladen.

### 3.4 Eltern-Bereich
- Sperre: Additionsaufgabe zweistellig + zweistellig, 4 Antwort-Buttons. Falsch → neue Aufgabe.
- Einstellungen: Modus (Kleinkind ab 2 / Entdecker ab 5), Namen-Knopf an/aus, Laut-Knopf an/aus.
- Credits: alle Fotos und Laute mit Autor, Lizenz und Quelle. Nur hier sind Links nach außen erlaubt.
- Installieren: Knopf in den Einstellungen, wenn der Browser die Installation anbietet; auf iOS
  klappt er eine kurze Anleitung auf. Läuft die App installiert, fehlt er.

### 3.5 Onboarding im Browser
- Läuft die App nicht installiert (Browser-Tab), sitzt ein Elternteil davor. Beim Start erscheint
  einmal pro Sitzung ein Willkommen: kurze Erklärung, Modus wählen, Installieren (wie 3.4), Hinweis
  auf das Zahnrad und die Eltern-Sperre. Nur „Los geht's“ schließt es; im selben Tab kommt es auch
  nach dem Neuladen nicht wieder.

## 4. Inhalte

### 4.1 Datenmodell

Quelle der Wahrheit ist `content/animals.json` (von Hand gepflegt). Die Build-Skripte erzeugen daraus
`src/content/catalog.generated.json`, das die App importiert.

```ts
// content/animals.json
type ContentFile = { worlds: World[]; animals: Animal[] };
type World = { id: string; name: string; emoji: string; color: string; ink: string };
type Animal = {
  id: string;               // kebab-case, ASCII
  world: string;            // World.id
  name: string;             // „Kuh“
  article: "der" | "die" | "das";
  latin: string;            // für die Commons-Suche
  voice: { kind: "sound"; text: string } | { kind: "quiet"; text: string };
  facts: [string, string];  // kurz, kindgerecht, sachlich richtig
  photos: { file: string }[];   // Reihenfolge = Anzeige. Commons-Dateititel ("File:Cow in meadow.jpg")
                                // oder "openverse:<uuid>" bzw. "inaturalist:<observation id>/<photo id>" (§5.1)
  soundFile: string | null;     // Commons-Dateititel der Tonaufnahme
};

// src/content/catalog.generated.json
type CatalogPhoto = {
  sizes: { w: number; src: string }[];  // aufsteigend, z. B. 640/1280/1920
  width: number; height: number;        // Original-Seitenverhältnis
  color: string;                        // Durchschnittsfarbe für Platzhalter
};

// src/content/credits.generated.json (eigene Datei, siehe Entscheidungslog)
type CreditsFile = { animals: { id: string; photos: Credit[]; sound: Credit | null }[] };
type Credit = { author: string; license: string; licenseUrl: string; sourceUrl: string };
```

### 4.2 Startumfang
4 Welten mit je 12–13 Tieren, zusammen 50 (siehe `content/animals.json`), je 3–6 Fotos, Tierlaut wo
vorhanden.

## 5. Medien-Pipeline (nur Build-Zeit)

### 5.1 Quellen und Lizenzen
Hauptquelle ist **Wikimedia Commons** über die MediaWiki-API (`commons.wikimedia.org/w/api.php`).
Für Tiere, bei denen Commons wenig Brauchbares liefert, kommen zwei Zusatzquellen dazu:
**Openverse** (`api.openverse.org`, CC-Bilder u. a. von Flickr; Commons-Treffer dort werden
übersprungen) und **iNaturalist** (`api.inaturalist.org`, nur bestätigte Beobachtungen der Art,
eine Aufnahme pro Beobachtung). Alle mit eigenem `User-Agent`
(`tiere-app/<version> (github.com/daniel-rck)`), Requests seriell mit kleiner Pause.

Lizenz-Allowlist (gilt für alle Quellen; bei Commons aus `extmetadata.LicenseShortName` bzw.
`License`): CC0, Public Domain (PD-*, PDM), CC BY 2.0–4.0, CC BY-SA 2.0–4.0. Alles andere (NC, ND,
GFDL-only, unklar) wird verworfen. iNaturalist-Lizenzen sind Version 4.0.

### 5.2 Foto-Kriterien
**Kinderschutz (hart, im Zweifel raus):** keine toten, verletzten oder kranken Tiere, kein Blut,
keine Jagd- oder Fressszenen mit Beute, keine Schlachtung, keine Paarung, keine Tiere in
Bedrängnis, keine Menschen im Vordergrund, keine Gesichter von Kindern, kein Text, Logo oder
Wasserzeichen im Bild.

**Qualität:** längste Kante ≥ 1600 px (Ziel ≥ 2000), scharf, gut belichtet, Tier gut erkennbar
und möglichst ganz im Bild, Tier nimmt einen großen Teil des Bildes ein. Bevorzugt natürliche
Umgebung; deutliche Gitter oder Scheiben im Vordergrund raus. Pro Tier verschiedene Perspektiven
(ganzes Tier, Kopf nah, ggf. Jungtier).

### 5.3 Kuratierung (Mensch-Gate)
1. `photos:candidates <id>` sucht in dieser Reihenfolge: Featured pictures, Quality images, Valued
   images, danach allgemeine Dateisuche nach `latin` und deutschem/englischem Namen. Filter:
   Lizenz-Allowlist, Bitmap, Mindestgröße. `photos:candidates <id> --add` hängt bis zu 10 Kandidaten
   je Zusatzquelle an (Nummerierung läuft weiter, Vorschläge bleiben).
2. Ergebnis: bis zu 30 Kandidaten als Vorschaubilder in `.cache/candidates/<id>/` und ein
   Kontaktabzug `.cache/candidates/<id>.html` (Bild, Titel, Lizenz, Autor, Größe, Checkbox).
3. Claude sichtet die Vorschaubilder gegen 5.2, markiert bis zu 4 Vorschläge vor und begründet
   Ausschlüsse im Kontaktabzug.
4. Daniel wählt im Kontaktabzug aus; „Auswahl kopieren“ legt das `photos`-Array als JSON in die
   Zwischenablage. Erst dann wird `content/animals.json` geändert.

### 5.4 Foto-Build
`photos:build` lädt jedes ausgewählte Original einmal nach `.cache/originals/` (idempotent),
erzeugt mit `sharp` WebP (Qualität 80) in 640, 1280 und 1920 px Breite (nie hochskaliert), entfernt
Metadaten, berechnet die Durchschnittsfarbe und schreibt nach `public/photos/<animalId>/<n>-<w>.webp`.
Credits kommen aus `extmetadata` (Artist ohne HTML, LicenseShortName, LicenseUrl, Dateiseite).
Fehlt ein Pflichtfeld, bricht der Build mit klarer Meldung ab.

### 5.5 Tierlaute
`sounds:candidates <id>` sucht Audio-Dateien auf Commons (gleiche Lizenz-Allowlist), Auswahl wie
bei Fotos. `sounds:build` lädt, schneidet auf ≤ 4 s mit kurzem Fade, normalisiert auf ca. −16 LUFS
und wandelt mit `ffmpeg` nach AAC (`.m4a`, 96 kbit/s) in `public/sounds/<animalId>.m4a`. Tiere ohne
passende Aufnahme oder mit `voice.kind = "quiet"` bekommen keinen Laut.

### 5.6 Sprache
Version 1 spricht Namen und Fakten mit der Web Speech API (`de-DE`, bevorzugt eine deutsche
Systemstimme, Rate 0.9, Pitch 1.1), aber nur auf Knopfdruck: Lautsprecher-Knopf im Vollbild
(Name) und „Vorlesen“ im Entdecker-Panel. Kein deutsches Voice verfügbar → der Knopf bleibt stumm.
Jeder Knopf bricht die laufende Ausgabe ab, bevor er seine startet. Jede Ausgabe startet aus
einer Nutzergeste (iOS).

## 6. Architektur

Tiere ist mit `web-base init` entstanden (Stempel `webBase.version` in `package.json`) und folgt
deren Konventionen (`web-base/docs/specs/07-conventions.md`), wie das Malbuch.

```
content/animals.json            Quelle der Inhalte
scripts/
  commons.ts                    API-Client (Suche, imageinfo, extmetadata, Download)
  photos-candidates.ts          Kandidaten + Kontaktabzug
  photos-build.ts               Download, sharp, Credits, Katalog
  sounds-candidates.ts / sounds-build.ts
  validate-content.ts           Schema- und Regelprüfung (--strict)
src/
  main.tsx, App.tsx             Einstieg; App ist ein nacktes <Outlet />, darin der Ebenen-Stack
                                (Start/Welt/Vollbild/Eltern)
  content/                      Typen, catalog.generated.json, Zugriffsfunktionen
  engine/                       DOM-frei, getestet: gestures.ts, zoom.ts, gate.ts, sizes.ts,
                                validate.ts, licenses.ts (Allowlist + Normalisierung, auch für
                                scripts/)
  platform/                     speech.ts, audio.ts, storage.ts, history.ts
  features/                     home/, world/, viewer/, parents/ (ParentGate, Settings, Credits)
  lib/                          web-base: ui/, db/, pwa/, routing/, router.tsx, routes.ts
  lib/ui/theme.css              Seam: App-Tokens (Hell/Dunkel, Weltfarben)
  sw/index.ts                   Service Worker (Seam): Precache-Regeln aus §7
worker/                         Cloudflare Worker (web-base), liefert nur die Assets aus
public/photos/, public/sounds/  generierte Medien (committet)
```

- React 19 + Vite 8 + TypeScript 7 + Tailwind 4, Bun; oxlint + oxfmt, Vitest (jsdom).
- `vite-plugin-pwa` mit `injectManifest` und `registerType: "prompt"` (`src/sw/`).
- Kein State-Management-Framework. react-router mit **einer** Route.
- Navigation: eigener Ebenen-Stack in der einen Route, auf der History von react-router, damit die
  Zurück-Taste funktioniert.
- Die web-base-Shell (`AppShell`, `AppNav`, `PageHeader`, `ThemeToggle`, `UpdatePrompt`, …) ist
  nur für `web-base check --strict` installiert und wird nicht importiert: sie zeigt Text.
  Dateien, die web-base als *owned* führt, werden nicht geändert; eigene Tokens nur im Seam
  `src/lib/ui/theme.css`.
- Gesten über Pointer Events; die Klassifizierung (Tap, Doppeltipp, Wisch, Pinch) ist eine reine
  Funktion in `engine/gestures.ts`.

## 7. PWA und Offline
- Precache: App-Shell, alle 640er und 1280er Fotos, alle Laute. 1920er per Runtime-Cache
  (CacheFirst). Precache-Budget ≤ 40 MB.
- Manifest: `display: "fullscreen"` mit Fallback `standalone`, Hoch- und Querformat, Icon ohne
  bekannte Figuren.
- Nach der Installation funktioniert die App vollständig im Flugmodus.

## 8. Nicht-funktionale Anforderungen
- JS ≤ 120 kB gzip. Start bis erste Welt-Kacheln sichtbar < 1,5 s auf einem Mittelklasse-Handy
  (gecacht).
- Wechsel zum Nachbartier: Foto sichtbar ≤ 150 ms, wenn vorgeladen.
- Touch-Ziele ≥ 64 px, sichtbarer Fokus, `prefers-reduced-motion` schaltet Animationen ab.
- Hell- und Dunkelmodus über Tokens; Weltfarben bleiben in beiden gleich.
- Kein Textmarkieren, kein Kontextmenü, kein Overscroll-Bounce, kein versehentliches Seiten-Zoom.

## 9. Akzeptanzkriterien
1. Ein 2-jähriges Kind kommt ohne Hilfe von Start → Welt → Vollbild → zurück, ohne Text zu lesen.
2. Im Vollbild ist kein Foto beschnitten, auf Hoch- und Querformat, Handy und Tablet.
3. Der Laut-Knopf spielt den Laut, der Lautsprecher-Knopf sagt den Namen; sonst gibt die App
   keinen Ton aus. Schnelles Mehrfachtippen überlagert keine Ausgaben.
4. Wischen links/rechts wechselt zyklisch das Tier, hoch/runter das Foto desselben Tiers.
5. Im Kleinkind-Modus gibt es keinen sichtbaren Text außer Weltnamen auf dem Start-Bildschirm.
6. Der Modus lässt sich nur über langes Drücken plus richtige Aufgabe wechseln und bleibt nach
   Neustart erhalten.
7. Entdecker-Modus: Panel verdeckt das Foto nicht; Pinch- und Doppeltipp-Zoom funktionieren,
   gezoomt wechselt Wischen kein Tier.
8. Die Gerät-Zurück-Taste schließt Ebenen der Reihe nach und verlässt die App nicht vorzeitig.
9. Im Netzwerk-Tab gibt es zur Laufzeit keine Requests außer zu eigenen Assets.
10. Nach Installation läuft die App vollständig offline.
11. `content:check --strict` ist grün: jedes Tier hat ≥ 3 Fotos, jedes Foto einen vollständigen
    Credit mit Lizenz aus der Allowlist.
12. Die Credits-Seite listet jedes Foto und jeden Laut.

### 9.1 Stand der Prüfung (2026-11-01, Phase 8, Laute ergänzt nach Phase 7)
Automatisch in Chromium (Playwright, Handy 390 × 844 und Tablet quer 1280 × 800, Produktions-Build
mit Service Worker) und mit Vitest. Auf echten Geräten (iOS-Stimme, Lautsprecher, Installation)
prüft Daniel.

| # | Ergebnis |
|---|---|
| 1 | ✓ Start → Welt → Vollbild → zurück nur über Kacheln, Pfeile und Zurück-Knopf. |
| 2 | ✓ `object-fit: contain` auf Hoch- und Querformat, Unschärfe-Hintergrund statt Balken. |
| 3 | ✓ Jede Ausgabe bricht die laufende ab (eine Sprachausgabe, ein `<audio>`), getestet; Hören am Gerät offen. |
| 4 | ✓ Wischen links/rechts zyklisch, hoch/runter wechselt das Foto. |
| 5 | ✓ Sichtbarer Text im Kleinkind-Modus nur Weltnamen; der Zahnrad-Hinweis (3.1) ist die gewollte Ausnahme. |
| 6 | ✓ Kurzer Tipp → Hinweis, 1,5 s → Aufgabe; falsche Antwort → neue Aufgabe; Modus übersteht Neuladen. |
| 7 | ✓ Panel unter dem Foto, Doppeltipp-Zoom und Verschieben; gezoomt wechselt Wischen kein Tier. Pinch nur per Unit-Test. |
| 8 | ✓ Zurück schließt Vollbild, dann Welt; Neuladen landet auf dem Start. |
| 9 | ✓ Keine Requests an fremde Hosts. |
| 10 | ✓ Nach dem ersten Laden offline: Start, Welt, Vollbild; nicht gecachte Größen fallen auf 640 px zurück. |
| 11 | ✓ 50 Tiere, 200 Fotos, alle mit vollständigem Credit (`content:check --strict`). |
| 12 | ✓ Credits listen alle 200 Fotos und 29 Laute mit Autor, Lizenz und Quelle. |

Budgets (§8): JS beim Start rund 115 kB gzip (React, Router, App, Katalog, `workbox-window`), mit
vollem Katalog geschätzt 118 kB. Precache geschätzt 27 MB bei 200 Fotos. Startzeit und
Wechselzeit auf einem Mittelklasse-Handy misst Daniel.

## 10. Entscheidungslog
- Medien von Wikimedia Commons: Lizenz und Autor sind maschinenlesbar, kein API-Key nötig.
- _2026-11-01_ — Openverse und iNaturalist als Zusatzquellen (Wunsch von Daniel), ohne API-Key,
  gleiche Allowlist. In `animals.json` als `openverse:<uuid>` bzw.
  `inaturalist:<observation id>/<photo id>`, damit das Datenmodell bei `{ file: string }` bleibt.
  Die iNaturalist-API kennt keine Abfrage nach Foto-ID, der Build holt Lizenz und Autor über die
  Beobachtung. Openverse liefert die Lizenz aus den Metadaten der Ursprungsseite; vor dem Build an
  der Quelle gegenprüfen.
- Medien werden zur Build-Zeit geladen und committet, nicht zur Laufzeit: offline, deterministisch,
  kindersicher kuratiert.
- Nur WebP statt AVIF + Fallback: überall unterstützt, eine Pipeline weniger.
- Vollbild immer `contain` mit Blur-Hintergrund statt `cover`: kein abgeschnittener Kopf oder
  Schwanz.
- Namen in v1 per Web Speech API, aufgenommene Namen sind ein offener Punkt.
- _2026-11-01_ — Auf web-base 0.6.0 aufgesetzt (`web-base init`, wie das Malbuch): oxlint + oxfmt
  statt Biome, Vitest statt `bun test`, `injectManifest` mit Prompt, Tailwind 4, Cloudflare Worker
  nur für die Assets. Ersetzt „Biome statt Oxlint/Oxfmt“.
- _2026-11-01_ — react-router mit einer Route (web-base verlangt den Router), die Ebenen bleiben
  ein eigener Stack darin: macht die Zurück-Taste vorhersagbar und ein Neuladen landet immer auf
  dem Start. Ersetzt „Kein Router“.
- _2026-11-01_ — Reine Logik in `src/engine/` statt `src/lib/`, weil `src/lib/` web-base gehört.
- _2026-11-01_ — Kein `UpdatePrompt` und keine Shell der Basis: beides zeigt Text (Kriterium 5).
  Der Update-Hinweis kommt in Phase 8 ohne Text (`useAppUpdate`).
- _2026-11-01_ — Gate `bun run check` = `lint` + `typecheck` + `test`; dazu `build` und
  `web-base check --strict` (beides auch in CI). JSON formatiert oxfmt (Prettier-Stil).
- _2026-11-01_ — 50 statt 20 Tiere (Wunsch von Daniel), weiter in 4 Welten: Bauernhof 12, Zoo 13,
  Dschungel 12, Meer 13.
- _2026-11-01_ — Foto-Sichtung im Chat: Kandidaten und Vorschläge zusätzlich als Auswahlseite
  (claude.ai-Artifact), Daniels Auswahl wird dort gespeichert und von Claude übernommen. Der
  Kontaktabzug in `.cache/` bleibt für lokale Arbeit.
- _2026-11-01_ — `licenses.ts` liegt in `src/engine/` statt `scripts/`: der Validator braucht die
  Allowlist für `--strict`, die Skripte importieren sie von dort.
- _2026-11-01_ — Katalog-Form festgelegt (`src/content/types.ts`): `{ worlds, animals }`, je Tier die
  Inhaltsfelder ohne `latin`, `photos: CatalogPhoto[]` in der Reihenfolge von `animals.json` und
  `sound: { src, credit } | null`. `content:check --strict` prüft daran: 3–6 Fotos, Katalog passt
  zum Inhalt, vollständiger Credit (Autor, Lizenz aus der Allowlist, https-URLs) für jedes Foto und
  jeden Laut. Ohne `--strict`: höchstens 6 Fotos, jedes Foto nur bei einem Tier, unbekannte Felder
  sind Fehler, stille Tiere haben keinen Laut.
- _2026-11-01_ — Leerer `[previews]`-Block in `wrangler.toml` (Seam): Workers Builds deployt
  PR-Branches mit `wrangler preview`, das ohne den Block abbricht.
- _2026-11-01_ — `photos:build` lädt seriell mit 4 s Pause und wartet bei 429 die
  `Retry-After`-Zeit bzw. exponentiell bis 10 min ab (Wikimedia-Robot-Policy). Credits und
  Download-URLs liegen zwischen zwei Läufen in `.cache/` (`--refresh` fragt neu).
- _2026-11-01_ — Abweichung von §5.4: Statt des Originals lädt `photos:build` von Commons das
  größte Standard-Thumbnail unter der Originalbreite, höchstens 1920 px; Laute kommen als
  MP3-Transcode von Commons. upload.wikimedia.org beantwortet Skript-Anfragen nach Originalen und
  Nicht-Standardbreiten mit 429 (mediawiki.org „Common thumbnail sizes“). Folge: 27 der 200 Fotos
  haben weniger als 1920 px als größte Stufe (25 × 1280, je einmal 1536 und 960 px).
- _2026-11-01_ — Ein Tier ohne gebautes Foto (nur solange `photos:build` unvollständig ist) wird in
  der Welt ausgelassen statt leer gezeigt; `content:check --strict` verhindert das im Release.
- _2026-11-01_ — Kleinkind-Modus ohne Text (Kriterium 5 vor 3.2): Auf dem Start ist der Titel
  „Tiere“ nur für Screenreader da, die Welt-Kopfzeile zeigt das Welt-Emoji statt des Namens. Im
  Entdecker-Modus erscheinen Titel und Weltname.
- _2026-11-01_ — Keine Web-Schrift (keine Requests zur Laufzeit): eine runde Systemschrift
  (`ui-rounded`, Nunito, …) ersetzt Baloo 2 aus dem Prototyp.
- _2026-11-01_ — Ebenen-Stack: Jede geöffnete Ebene ist ein History-Eintrag mit dem ganzen Stack im
  State; Tierwechsel im Vollbild ersetzt den obersten Eintrag. Beim Neuladen springt die App per
  `history.go(-n)` auf den Eintrag zurück, aus dem der Stack gewachsen ist (immer Start).
- _2026-11-01_ — Einstellungen als ein JSON unter `tiere.settings` (Modus, Stimme, Tierlaute).
- _2026-11-01_ — Gesten (`engine/gestures.ts`): Tipp < 12 px und < 500 ms; Wisch ab 60 px oder
  ab 30 px mit mindestens 0,5 px/ms; Diagonalen (Achsen innerhalb 1,2×) zählen nicht;
  Doppeltipp innerhalb 300 ms und 40 px.
- _2026-11-01_ — Sprach-Fallback (5.6) wartet mindestens 2 s, bei langen Texten 90 ms je Zeichen,
  damit der Laut nicht in den Namen fällt. Name und Laut starten direkt im Tipp-Handler, nicht in
  einem Effekt (iOS verlangt eine Nutzergeste).
- _2026-11-01_ — Eltern-Sperre: Summanden 12–59 und 11–…, Summe bleibt zweistellig; falsche
  Antworten sind ±1 und ±10 (typische Rechenfehler). Mit der Tastatur (Enter/Leertaste auf dem
  Zahnrad) geht es direkt zur Aufgabe, die Aufgabe bleibt die Sperre.
- _2026-11-01_ — „Vorlesen“ spricht auch bei ausgeschalteter Stimme: Es ist ein ausdrücklicher
  Wunsch. Die Credits stehen hinter „Bildnachweise“ in den Einstellungen.
- _2026-11-01_ — Zoom (`engine/zoom.ts`): Transformation um die Bühnenmitte, das Foto kann nur so
  weit verschoben werden, wie es die Bühne noch füllt. Im Entdecker-Modus wartet ein einzelner
  Tipp 300 ms auf einen möglichen Doppeltipp, im Kleinkind-Modus reagiert er sofort.
- _2026-11-01_ — Tierlaute: `sounds:candidates` sucht auf Commons nach englischem Namen (Liste im
  Skript, die meisten Aufnahmen sind englisch betitelt), `latin` und deutschem Namen, behält bis zu
  8 und legt je eine fertig bearbeitete 4-s-Hörprobe ab. Verarbeitung: erst Lautheit auf −16 LUFS
  (sonst gilt eine leise Aufnahme als Stille), dann Stille am Anfang weg, 4 s, Fades, mono.
- _2026-11-01_ — Ein `<audio>`-Element für alle Laute: Ein neuer Tipp stoppt den laufenden Laut
  (Kriterium 3). Bei Stimme an wird es im Tipp-Handler stumm entsperrt, weil der Laut erst nach dem
  Namen kommt (iOS). Die Stimme sagt nur den Namen.
- _2026-11-01_ — Auf Daniels Wunsch (§3.3 geändert): Die synthetische Stimme spricht nie das
  Lautwort („Muuuh!“) oder den „quiet“-Text, auch nicht bei Tieren ohne Aufnahme; das klang
  peinlich. Das Lautwort steht nur in der Sprechblase, den Laut liefert allein die Aufnahme.
- _2026-11-01_ — Auf Daniels Wunsch (§2, 3.1, 3.3, 3.4, 5.6, Kriterium 3 geändert): Die App
  spricht nichts mehr von selbst, weder Weltnamen noch Tiernamen. Den Namen sagt ein
  Lautsprecher-Knopf oben rechts im Vollbild; die Einstellung „Stimme“ heißt jetzt „Namen-Knopf“
  und blendet ihn aus. Öffnen, Wechseln und Tippen spielen nur den Laut.
- _2026-11-01_ — Auf Daniels Wunsch (§1, 2, 3.3, 3.4, 5.6, Kriterium 3 geändert): Auch der
  Tierlaut kommt nur noch auf Knopfdruck. Ein Laut-Knopf unten in der Mitte (84 px, Noten-Symbol)
  spielt ihn; Öffnen, Wechseln und Tippen aufs Foto bleiben stumm, Tippen zeigt nur Boing und
  Sprechblase. Tierwechsel bricht einen laufenden Laut ab. Ohne Aufnahme oder mit „Tierlaute aus“
  fehlt der Knopf, statt stumm zu bleiben.
- _2026-11-01_ — Laut-Auswahl (Mensch-Gate, Daniel): 29 Tiere mit Commons-Aufnahme, 6 ohne
  (Clownfisch, Eisbär, Gorilla, Nashorn, Nilpferd, Schlange: auf Commons nichts Brauchbares).
  Seehund klingt nach einem Neuseeland-Seebären (Daniels Wahl). Fehlt auf der Commons-Seite das
  Autorenfeld, trägt `sounds:build` den von Hand geprüften Urheber nach (`AUTHORS`), z. B. den
  U.S. National Park Service beim Orca-Ruf.
- _2026-11-01_ — Precache (§7, offener Punkt erledigt): Gemessen sind im Schnitt 62 KB je 640er
  und 227 KB je 1280er. Alle 640er und 1280er wären rund 58 MB, über dem Budget von 40 MB. Darum
  liegen alle 640er, das 1280er des ersten Fotos je Tier und alle Laute im Precache (rund 27 MB);
  die übrigen Größen kommen über den Runtime-Cache (CacheFirst). Offline und noch nicht im Cache
  liefert der Service Worker das 640er desselben Fotos, die App bleibt im Flugmodus vollständig.
- _2026-11-01_ — Bildnachweise in eigener Datei `credits.generated.json`, geladen erst mit den
  Credits (Lazy-Chunk): Im Katalog hätten sie das Start-Bundle über 120 kB gzip geschoben (§8).
  `CatalogPhoto` hat deshalb kein `credit`-Feld, `content:check --strict` prüft beide Dateien.
- _2026-11-01_ — Update-Hinweis ohne Text: Wartet eine neue Version, erscheint auf dem Start neben
  dem Zahnrad ein Neu-laden-Symbol (`useAppUpdate`); Tippen lädt die neue Version.
- _2026-11-01_ — App-Icon: Pfotenabdruck auf Meerblau (`bun run icons`), keine Figur.
- _2026-11-01_ — Spec bleibt Deutsch (web-base empfiehlt Englisch für `docs/specs/`), wie beim
  Malbuch.
- _2026-11-01_ — Medien-Build auch auf GitHub Actions: Wikimedia hat die Cloud-IP der
  Agent-Umgebung über Stunden mit 429 gesperrt. `.github/workflows/media.yml` läuft bei
  Änderungen an Auswahl oder Build-Skripten (nicht auf `main`) oder von Hand, baut Fotos und
  Laute und committet sie samt beiden `*.generated.json` auf den Branch.
  `sound-candidates.yml` sucht die Laut-Kandidaten und legt sie als Workflow-Artefakt ab. Die
  Vorschaubilder der Foto-Auswahlseite (330 px) taugen nicht als Ersatz für die Originale.
  Nach Phase 7 wieder entfernt (Daniel): Die Medien liegen im Repo; eine neue Auswahl baut
  `photos:build`/`sounds:build` lokal.
- _2026-11-02_ — Onboarding im Browser (Wunsch von Daniel): Ein Start im Browser-Tab gilt als
  „Elternteil vor dem Gerät“, deshalb zeigt das Onboarding Text, als Ausnahme zu Kriterium 5 (das
  für die Kinder-Oberfläche gilt). Es ist keine History-Ebene (Zurück und Escape schließen es nicht),
  der Merker liegt unter `tiere.onboarded` im `sessionStorage`. Installiert heißt
  `display-mode: standalone` oder `fullscreen` (das Manifest fordert `fullscreen`, der web-base-Hook
  prüft nur `standalone`) oder `navigator.standalone`.
- _2026-11-02_ — Installieren über `useInstallPrompt` aus web-base, nicht über dessen
  `InstallButton` (kleiner als 64 px, Tailwind, eigener Dialog im Dialog). `main.tsx` importiert das
  Modul vorab, weil die Route lazy lädt und ein verpasstes `beforeinstallprompt` nicht wiederkommt.

## 11. Offene Punkte
- Akzentfarbe: Das Farbrad der Flotte ist voll (web-base `04-layout-system.md`). Tiere nutzt
  vorerst den Template-Standard 355 (wie das Malbuch); sichtbar ist er nur auf den
  web-base-Fehlerseiten und als `theme_color`. Eigener Slot braucht eine Regeländerung in web-base.
- `[previews]` gehört ins `wrangler.toml`-Template von web-base, damit neue Apps Preview-Builds
  ohne Nacharbeit bekommen.
- Tiere in web-base `08-app-migrations.md` eintragen (Flotte, Abweichungen wie beim Malbuch).
- Namen selbst aufnehmen statt Systemstimme.
- Quiz im Entdecker-Modus („Wo ist der Elefant?“).
- Weitere Welten (Wald, Haustiere, Arktis).
- Eigene Fotos (z. B. vom Zoobesuch) im Eltern-Bereich hinzufügen.
