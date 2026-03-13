# pi-holz.de — Anleitung für Matthias

Diese Anleitung erklärt, wie du Inhalte auf der Website ändern, Fotos hinzufügen und neue Blogbeiträge schreiben kannst. Du brauchst dafür Git und einen Texteditor (z. B. VS Code).

---

## Wie funktioniert das?

Die Website ist ein **statisches Hugo-Projekt**. Das bedeutet:

1. Du bearbeitest Textdateien auf deinem Computer
2. Du lädst die Änderungen mit Git auf GitHub hoch (`git push`)
3. Cloudflare bemerkt das automatisch und baut die Website neu auf — in etwa einer Minute ist die Änderung live

Du brauchst keinen FTP-Zugang, kein WordPress, kein Admin-Panel.

---

## Einmalige Einrichtung

Du brauchst: **Git** und **Node.js** (einmalig installieren von [nodejs.org](https://nodejs.org), LTS-Version).

```bash
# Repository auf deinen Computer laden
git clone https://github.com/ohlrogge/pi-holz.git
cd pi-holz

# Abhängigkeiten installieren (lädt Hugo automatisch herunter)
npm install

# Website lokal starten und im Browser ansehen
npm run dev
# Öffne http://localhost:1313 im Browser
```

Mit `npm run dev` siehst du sofort, wie die Seite nach deinen Änderungen aussieht — ohne etwas hochzuladen.

---

## Struktur der Inhalte

Alle Inhalte liegen im Ordner `content/`:

```
content/
  _index.md          ← Startseite (Text unter dem Hero-Bild)
  angebot/
    index.md         ← Angebotsseite
  galerie/
    stifte/
      index.md       ← Albumtitel und Beschreibung
      foto1.jpg      ← Fotos einfach hier ablegen
      foto2.jpg
    kuechenhelfer/
      index.md
      *.jpg
  blog/
    mein-beitrag/    ← Ein Ordner pro Beitrag
      index.md
      foto.jpg
  impressum/
    index.md
  datenschutz/
    index.md
```

---

## Texte bearbeiten

Öffne die gewünschte `.md`-Datei in deinem Texteditor. Jede Datei hat einen **Kopfbereich** (zwischen den `---`) und darunter den eigentlichen **Text**.

**Beispiel** (`content/_index.md`):
```markdown
---
title: "pi Holz"
description: "Handgedrehte Holzobjekte aus Hamburg"
---

Das ist der Text, der auf der Startseite erscheint.
Hier kannst du schreiben, was du möchtest.
```

### Wichtigste Markdown-Formatierungen

| Was du schreibst | Was erscheint |
|---|---|
| `**fett**` | **fett** |
| `*kursiv*` | *kursiv* |
| `## Überschrift` | Große Überschrift |
| `### Unterüberschrift` | Kleinere Überschrift |
| Leerzeile zwischen Absätzen | Neuer Absatz |
| `[Linktext](https://example.com)` | Klickbarer Link |

---

## Fotos zur Galerie hinzufügen

1. Fotos auf eine vernünftige Größe verkleinern (max. 2000px breit, JPEG)
2. Datei in den gewünschten Album-Ordner kopieren, z. B.:
   ```
   content/galerie/stifte/mein-stift.jpg
   ```
3. Das Foto erscheint automatisch in der Galerie — keine weitere Konfiguration nötig

**Titelbild eines Albums festlegen:** Im `index.md` des Albums das Feld `cover` setzen:
```markdown
---
title: "Stifte & Drehobjekte"
cover: mein-stift.jpg
---
```

**Neues Album anlegen:**
1. Neuen Ordner in `content/galerie/` erstellen, z. B. `content/galerie/schalen/`
2. Eine `index.md` mit Titel anlegen:
   ```markdown
   ---
   title: "Schalen"
   date: 2026-01-01
   description: "Gedrechselte Schalen aus heimischem Holz."
   cover: mein-foto.jpg
   ---
   ```
3. Fotos in den Ordner legen

---

## Neuen Blogbeitrag schreiben

1. Neuen Ordner in `content/blog/` anlegen — der Ordnername wird Teil der URL:
   ```
   content/blog/neue-drechselbank/
   ```
2. Darin eine Datei `index.md` erstellen:
   ```markdown
   ---
   title: "Neue Drechselbank in der Werkstatt"
   date: 2026-04-01
   draft: true
   description: "Endlich mehr Platz und eine bessere Maschine."
   cover: drechselbank.jpg
   ---

   Hier steht der Text des Beitrags.

   Du kannst so viel schreiben, wie du möchtest.
   ```
3. Fotos für den Beitrag einfach in denselben Ordner legen
4. Solange `draft: true` gesetzt ist, erscheint der Beitrag nicht auf der Live-Seite
5. Wenn der Beitrag fertig ist: `draft: true` auf `draft: false` ändern (oder die Zeile ganz löschen)

---

## Änderungen hochladen (veröffentlichen)

```bash
# Aktuellen Stand vom Server holen (immer zuerst machen!)
git pull

# Alle geänderten Dateien vormerken
git add .

# Änderung beschreiben und speichern
git commit -m "Neues Foto in Galerie Stifte"

# Auf GitHub hochladen → Website wird automatisch aktualisiert
git push
```

Nach dem `git push` baut Cloudflare die Seite automatisch neu. Das dauert etwa 1–2 Minuten. Danach ist alles live auf pi-holz.de.

---

## Häufige Situationen

**Ich habe etwas geändert und will es rückgängig machen (noch nicht gepusht):**
```bash
# Einzelne Datei zurücksetzen
git checkout -- content/blog/mein-beitrag/index.md
```

**Ich will sehen, was ich geändert habe:**
```bash
git status        # Welche Dateien sind verändert?
git diff          # Was genau hat sich geändert?
```

**Ich habe aus Versehen etwas gelöscht:**
```bash
git checkout -- .   # Alle Änderungen seit dem letzten Commit rückgängig machen
```

---

## Hinweise zu Fotos

- **Format:** JPEG ist ideal für Fotos
- **Größe:** Vor dem Hochladen auf max. 2000px Breite verkleinern (spart Ladezeit)
  - Tipp: [squoosh.app](https://squoosh.app) funktioniert direkt im Browser, kostenlos
- **Dateinamen:** Keine Leerzeichen, keine Umlaute — stattdessen Bindestriche benutzen
  - ✅ `mein-stift-eiche.jpg`
  - ❌ `Mein Stift (Eiche).jpg`

---

## Technische Details (für den Entwickler)

- **Framework:** Hugo Extended v0.157.0 via [`hugo-extended`](https://www.npmjs.com/package/hugo-extended) npm-Paket
- **Theme:** [hugo-theme-gallery](https://github.com/nicokaiser/hugo-theme-gallery) (Git-Submodul)
- **Hosting:** Cloudflare Pages — Deploy-Befehl: `bash build.sh` (`npm install && npm run build`), Output: `public/` (via `wrangler.toml`)
- **Schriften:** Adobe Fonts via Typekit (`rks3jql`) — EB Garamond + FF Dagny Web Pro
- **Farben:** `--dark: #2a1a0e`, `--gold: #a0732a`, `--cream: #f5f0e8`
- **Layouts überschrieben:** `layouts/index.html`, `layouts/partials/hero.html`, `layouts/partials/site-nav.html`, `layouts/partials/footer.html`
- **Custom CSS:** `assets/css/custom.css`
