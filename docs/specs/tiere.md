# Spec: Tiere

Status: lebend. Änderungen an Features und Akzeptanzkriterien nur nach Rückfrage bei Daniel.

## 1. Ziel

Kinder schauen sich große, echte Tierfotos an, sortiert nach Welten. Tippen auf das Foto sagt den
Namen und spielt den Tierlaut. Für Kleinkinder ab 2 funktioniert alles ohne Lesen. Ältere Kinder
(ab ca. 5) bekommen im Entdecker-Modus Namen zum Lesen, Fakten und Zoom.

**Nicht-Ziele:** Accounts, Cloud-Sync, Tracking, Werbung, In-App-Käufe, Spielmechanik mit Druck
(Punkte, Timer, Belohnungen). Kein Inhalt, der zur Laufzeit aus dem Netz kommt.

## 2. Zielgruppen und Modi

| Modus | Alter | Verhalten |
|---|---|---|
| Kleinkind (Standard) | ab 2 | Nur Fotos, keine Texte nötig. Tippen = Name + Laut. Wischen = nächstes Tier. Kein Zoom. |
| Entdecker | ab 5 | Name mit Artikel lesbar, 2 Fakten pro Tier, „Vorlesen“, Pinch- und Doppeltipp-Zoom. |

Der Modus wird in `localStorage` gespeichert und nur im Eltern-Bereich gewechselt.

## 3. Bildschirme

### 3.1 Start
- 4 Welt-Kacheln im 2×2-Raster, im Querformat ab 16:10 als 1×4. Kachel = Weltfarbe, großes Emoji,
  Weltname. Kleinkind-Modus: Tippen sagt den Weltnamen.
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
- Beim Öffnen und bei jedem Tierwechsel: Name sprechen, dann Tierlaut abspielen, Sprechblase mit
  dem Lautwort zeigen (stille Tiere: 🤫 und der „quiet“-Text wird gesprochen).
- Tippen: kleine „Boing“-Animation, Name + Laut erneut.
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
- Einstellungen: Modus (Kleinkind ab 2 / Entdecker ab 5), Stimme an/aus, Tierlaute an/aus.
- Credits: alle Fotos und Laute mit Autor, Lizenz und Quelle. Nur hier sind Links nach außen erlaubt.

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
  photos: { file: string }[];   // Commons-Dateititel, z. B. "File:Cow in meadow.jpg"; Reihenfolge = Anzeige
  soundFile: string | null;     // Commons-Dateititel der Tonaufnahme
};

// src/content/catalog.generated.json
type CatalogPhoto = {
  sizes: { w: number; src: string }[];  // aufsteigend, z. B. 640/1280/1920
  width: number; height: number;        // Original-Seitenverhältnis
  color: string;                        // Durchschnittsfarbe für Platzhalter
  credit: Credit;
};
type Credit = { author: string; license: string; licenseUrl: string; sourceUrl: string };
```

### 4.2 Startumfang
4 Welten, 20 Tiere (siehe `content/animals.json`), je 3–6 Fotos, Tierlaut wo vorhanden.

## 5. Medien-Pipeline (nur Build-Zeit)

### 5.1 Quelle und Lizenzen
Einzige Quelle ist **Wikimedia Commons** über die MediaWiki-API (`commons.wikimedia.org/w/api.php`)
mit eigenem `User-Agent` (`tiere-app/<version> (github.com/daniel-rck)`), Requests seriell mit
kleiner Pause.

Lizenz-Allowlist (aus `extmetadata.LicenseShortName` bzw. `License`): CC0, Public Domain (PD-*),
CC BY 2.0–4.0, CC BY-SA 2.0–4.0. Alles andere (NC, ND, GFDL-only, unklar) wird verworfen.

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
   Lizenz-Allowlist, Bitmap, Mindestgröße.
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
Systemstimme, Rate 0.9, Pitch 1.1). Kein deutsches Voice verfügbar → Name wird übersprungen, Laut
spielt trotzdem. Ablauf beim Tippen: laufende Ausgabe abbrechen → Name sprechen → nach `onend`
(Fallback-Timeout 2 s) Laut abspielen. Erste Ausgabe immer aus einer Nutzergeste (iOS).

## 6. Architektur

```
content/animals.json            Quelle der Inhalte
scripts/
  commons.ts                    API-Client (Suche, imageinfo, extmetadata, Download)
  licenses.ts                   Allowlist + Normalisierung
  photos-candidates.ts          Kandidaten + Kontaktabzug
  photos-build.ts               Download, sharp, Credits, Katalog
  sounds-candidates.ts / sounds-build.ts
  validate-content.ts           Schema- und Regelprüfung (--strict)
src/
  main.tsx, App.tsx             Ebenen-Stack (Start/Welt/Vollbild/Eltern) statt Router
  content/                      Typen, catalog.generated.json, Zugriffsfunktionen
  lib/                          DOM-frei, getestet: gestures.ts, zoom.ts, gate.ts, sizes.ts,
                                validate.ts
  platform/                     speech.ts, audio.ts, storage.ts, history.ts
  screens/                      Home, World, Viewer, ParentGate, Settings, Credits
  styles/                       tokens.css (Hell/Dunkel), app.css
public/photos/, public/sounds/  generierte Medien (committet)
```

- React 19 + Vite, `vite-plugin-pwa`. Kein State-Management-Framework, kein Router.
- Navigation: eigener Ebenen-Stack mit `history.pushState`, damit die Zurück-Taste funktioniert.
- Gesten über Pointer Events; die Klassifizierung (Tap, Doppeltipp, Wisch, Pinch) ist eine reine
  Funktion in `lib/gestures.ts`.

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
3. Tippen auf das Foto spricht den Namen und spielt den Laut; schnelles Mehrfachtippen überlagert
   keine Ausgaben.
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

## 10. Entscheidungslog
- Medien nur von Wikimedia Commons: Lizenz und Autor sind maschinenlesbar, kein API-Key nötig.
- Medien werden zur Build-Zeit geladen und committet, nicht zur Laufzeit: offline, deterministisch,
  kindersicher kuratiert.
- Nur WebP statt AVIF + Fallback: überall unterstützt, eine Pipeline weniger.
- Vollbild immer `contain` mit Blur-Hintergrund statt `cover`: kein abgeschnittener Kopf oder
  Schwanz.
- Namen in v1 per Web Speech API, aufgenommene Namen sind ein offener Punkt.
- Biome statt Oxlint/Oxfmt: privates Projekt, gleiche Konventionen wie das Malbuch.
- Kein Router: Ebenen-Stack reicht und macht die Zurück-Taste vorhersagbar.

## 11. Offene Punkte
- Namen selbst aufnehmen statt Systemstimme.
- Quiz im Entdecker-Modus („Wo ist der Elefant?“).
- Weitere Welten (Wald, Haustiere, Arktis).
- Eigene Fotos (z. B. vom Zoobesuch) im Eltern-Bereich hinzufügen.
