# pi-holz — Site Plan

## Context

Woodturning / woodcraft hobby site for **Matthias Pienitz**, Hamburg.
Domain: **pi-holz.de** — hosted on **Cloudflare Pages**, deployed from **GitHub**.
Built with **Hugo + hugo-theme-gallery**. Content managed by Matthias via a CMS (non-techie).

The draft `index.html` in the repo root is the visual reference. Keep that file around;
it is NOT served by Hugo — it's just the design spec.

---

## Design Reference (from index.html)

### Color palette
```css
--cream:  #f5f0e8
--warm:   #e8dcc8
--brown:  #5c3d2e
--dark:   #2a1a0e    /* hero background */
--gold:   #a0732a    /* accent */
--light:  #faf7f2    /* page background */
--text:   #3a2510
--muted:  #8a7060
```

### Typography
- use the fonts from adobe 
- **EB Garamond** (creative parts, highlights, logo (the pi symbol))
- **FF Dagny** (body, regular weight)

```html
<link rel="stylesheet" href="https://use.typekit.net/rks3jql.css">
```

### Hero
- Full-viewport, dark (`#2a1a0e`) background
- Two radial-gradient overlays (brown + gold glow)
- Concentric rings via CSS `box-shadow` on a centered `::after` pseudo-element
  (600×600px circle, 4 expanding rings at 40/80/120/160px — all gold, decreasing opacity)
- Content: `π` in gold (logo mark) → `h1` "Holz. / Gedreht. / Mit Herz." (Gedreht in gold italic)
- Tagline: "Unikate aus Hamburg" (muted, uppercase, spaced)
- Scroll hint with bounce animation
- Noise texture overlay on `body::before` (SVG fractal noise, fixed, z-index 1000)

### Nav (sticky, after hero)
- Dark translucent background + `backdrop-filter: blur(12px)`
- π SVG logo (concentric circles) + "pi-holz.de" in EB Garamond gold
- Links: Über mich · Angebot · Anfrage · Impressum

---

## 1. Hugo Config (hugo.toml)

Replace `config.toml` with `hugo.toml`:

```toml
baseURL       = "https://pi-holz.de/"
languageCode  = "de"
title         = "pi Holz"
theme         = "hugo-theme-gallery"
publishDir    = "public"

[params]
  description     = "Handgedrehte Holzobjekte aus Hamburg – mit Leidenschaft gefertigt."
  author          = "Matthias Pienitz"
  defaultTheme    = "light"
  # Hero tagline words (used in hero partial)
  heroLine1       = "Holz."
  heroLine2       = "Gedreht."
  heroLine3       = "Mit Herz."
  heroSubtitle    = "Unikate aus Hamburg"

[[menus.main]]
  name   = "Über mich"
  url    = "/#ueber"
  weight = 1
[[menus.main]]
  name   = "Angebot"
  url    = "/angebot/"
  weight = 2
[[menus.main]]
  name   = "Galerie"
  url    = "/galerie/"
  weight = 3
[[menus.main]]
  name   = "Blog"
  url    = "/blog/"
  weight = 4
[[menus.main]]
  name   = "Kontakt"
  url    = "/#anfrage"
  weight = 5

[[menus.footer]]
  name   = "Impressum"
  url    = "/impressum/"
[[menus.footer]]
  name   = "Datenschutz"
  url    = "/datenschutz/"

[markup.goldmark.renderer]
  unsafe = true   # allow raw HTML in Markdown (needed for Decap CMS content)
```

Delete `config.toml` and `netlify.toml` afterwards.

---

## 2. Cloudflare Pages Deployment

In the Cloudflare Pages dashboard:
- Connect GitHub repo `ohlrogge/pi-holz`
- Build command: `hugo`
- Build output directory: `public`
- Environment variable: `HUGO_VERSION = 0.157.0`

No `wrangler.toml` or `netlify.toml` needed for a static Hugo site on Cloudflare Pages.

---

## 3. CMS for Non-Techies

**Decap CMS** (formerly Netlify CMS) at `/admin`.

**Auth strategy on Cloudflare (no Netlify Identity):**
Use the `github` backend with an OAuth proxy. Two options:

- Deploy [`decap-proxy`](https://github.com/stereobooster/decap-proxy)
  or a similar lightweight OAuth worker as a Cloudflare Worker. One-time setup.

Either way, the non-techie:
1. Opens `https://pi-holz.de/admin`
2. Clicks "Login with GitHub" once
3. Uses a visual editor to write posts, upload photos, edit pages

**Clean up `static/admin/config.yml`** — see Section 6 for final config.

**Update `static/admin/index.html`** to use Decap CMS v3 (current):
```html
<script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
```
(Remove the old netlify-identity-widget script.)

---

## 4. Hero Header

Override the home page layout to inject the hero before the gallery section.

### Files to create

**`layouts/index.html`** — home page layout override:
```
{{ define "header" }}{{ partial "hero.html" . }}{{ end }}
{{ define "main" }}
  {{ partial "title.html" . }}
  {{ partial "categories.html" }}
  {{ partial "featured.html" . }}
  <section class="galleries">
    {{ range where .Pages "Params.private" "ne" true }}
      {{ partial "album-card.html" . }}
    {{ end }}
  </section>
{{ end }}
```
This replaces the standard header (site title button) with the full-screen hero on the home page.
All other pages still use the normal theme header.

**`layouts/partials/hero.html`** — the hero markup, mirroring the draft's `<header>` block.
Tagline lines read from `site.Params.heroLine1` etc. for easy editing.

**`assets/css/custom.css`** — all custom CSS:
- CSS custom properties (color palette)
- `@import` for Google Fonts (Playfair Display, Crimson Pro)
- Hero styles: dark background, radial gradients, concentric rings via box-shadow
- Nav override: dark sticky nav matching the draft
- Section styles, leistungen grid, anfrage form
- Noise texture on `body::before`
- Animations: `fadeUp`, `bounce`

The theme's `assets/css/custom.css` is already included in its build pipeline — just create the
file at the project root level (`assets/css/custom.css`) to override the empty theme placeholder.

---

## 5. Content Structure

```
content/
  _index.md              ← Home intro text (below hero, above gallery cards)
  angebot/
    index.md             ← Leistungen / offerings (prose, type: prose)
  galerie/               ← Hugo-theme-gallery albums
    stifte/
      index.md           ← Album: Stifte & Drehobjekte
      *.jpg              ← Photos live alongside index.md
    kuechenhelfer/
      index.md
      *.jpg
    sonderanfertigungen/
      index.md
      *.jpg
  blog/                  ← Werkstatt-Tagebuch
    erster-beitrag/
      index.md
      *.jpg
  impressum/
    index.md             ← Impressum (prose, type: prose)
  datenschutz/
    index.md             ← Datenschutzerklärung (prose, type: prose)
```

**hugo-theme-gallery conventions:**
- Album `index.md` front-matter: `title`, `date`, `cover` (image filename), `description`
- Images alongside `index.md` are auto-discovered and shown as gallery
- The `type: prose` front-matter uses the theme's prose layout (readable text column)

---

## 6. Decap CMS Config (`static/admin/config.yml`)

```yaml
backend:
  name: github
  repo: ohlrogge/pi-holz
  branch: main
  base_url: https://YOUR-OAUTH-PROXY.workers.dev  # or decapcms.app

media_folder: static/images
public_folder: /images

locale: de

collections:

  - name: blog
    label: Werkstatt-Tagebuch
    folder: content/blog
    create: true
    path: "{{slug}}/index"
    media_folder: ""
    public_folder: ""
    fields:
      - { label: Titel, name: title, widget: string }
      - { label: Datum, name: date, widget: datetime }
      - { label: Entwurf, name: draft, widget: boolean, default: true }
      - { label: Beschreibung, name: description, widget: string, required: false }
      - { label: Titelbild, name: cover, widget: image, required: false }
      - { label: Inhalt, name: body, widget: markdown }

  - name: seiten
    label: Seiten
    files:
      - name: startseite
        label: Startseite
        file: content/_index.md
        fields:
          - { label: Titel, name: title, widget: string }
          - { label: Beschreibung, name: description, widget: string }
          - { label: Inhalt, name: body, widget: markdown }
      - name: angebot
        label: Angebot
        file: content/angebot/index.md
        fields:
          - { label: Titel, name: title, widget: string }
          - { label: Inhalt, name: body, widget: markdown }
```

Gallery image uploads are done via the GitHub web UI or by a future gallery collection.

---

## 7. Implementation Order

1. [x] **`hugo.toml`** — rename config, fill in real values
2. [x] **Content scaffold** — placeholder `index.md` files for all sections
3. [x] **Hero partial** — `layouts/partials/hero.html` + `layouts/index.html`
4. [x] **Custom CSS** — `assets/css/custom.css` with full design, Adobe Fonts
5. [x] **Cloudflare Pages** — connected, build command `hugo -b $CF_PAGES_URL`, `HUGO_VERSION=0.157.0`
6. [x] **German README** — content editing guide for Matthias, npm setup
7. [ ] **Husky pre-commit hook** — block commits that break the Hugo build
   - `npm install --save-dev husky`
   - `.husky/pre-commit` runs `npm run build`
   - If Hugo errors → commit is blocked with clear message
   - Protects Matthias from pushing broken content to the live site
8. [ ] **Contact form** — `mailto:` is current fallback; investigate Cloudflare Email Routing
   - Cloudflare Email Routing can forward form submissions to `ohlrogge@outlook.com`
   - May need a small Cloudflare Worker to handle POST from a form
9. [ ] **Go live** — remove `noindex` from `hugo.toml` when ready to publish

---

## 8. Open Questions

- [ ] Contact form: Cloudflare Email Routing + Worker, or third-party (Formspree)?
- [ ] Logo / favicon: generate proper favicon from the π SVG mark with EB Garamond font
- [ ] Real gallery photos: Matthias uploads after launch via git
