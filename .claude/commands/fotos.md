---
description: Foto-Kandidaten für ein Tier suchen, vorsichten und als Kontaktabzug vorlegen
argument-hint: <tier-id>
---

Tier: `$ARGUMENTS` (ID aus `content/animals.json`).

1. `bun run photos:candidates $ARGUMENTS` ausführen.
2. Die Vorschaubilder in `.cache/candidates/$ARGUMENTS/` selbst ansehen und gegen die
   Kinderschutz- und Qualitätskriterien aus `docs/specs/tiere.md` prüfen.
3. Im Kontaktabzug `.cache/candidates/$ARGUMENTS.html` deine 4 besten Vorschläge vormarkieren
   (`data-proposed="true"`) und jeden Ausschluss kurz begründen (z. B. „Gitter im Vordergrund“).
4. Nicht in `content/animals.json` schreiben. Daniel öffnet den Kontaktabzug, wählt aus und
   übernimmt die Auswahl per „Auswahl kopieren“. Melde ihm den Pfad und stoppe.
