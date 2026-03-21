# OpenSpec: Homepage Gallery & Nav Cleanup

**Date:** 2026-03-21
**Status:** Approved

---

## Goals

- "Galerie" nav link always scrolls to `#galerie` on the homepage (`/#galerie`)
- "Blog" nav link removed
- `/galerie/` content section and album pages removed entirely
- Images from `content/images/` displayed inline in the `#galerie` homepage section as a flat justified grid with PhotoSwipe lightbox
- Dynamic: adding image files to `content/images/` auto-includes them — no code changes needed

---

## Changes

### 1. `hugo.toml`

| Field | Before | After |
|-------|--------|-------|
| Galerie menu URL | `/galerie/` | `/#galerie` |
| Blog menu entry | present | removed |

### 2. `content/galerie/` — Delete

Remove the entire directory including all sub-albums:
- `content/galerie/_index.md`
- `content/galerie/stifte/` (and all contents)
- `content/galerie/kuechenhelfer/` (and all contents)

### 3. `content/images/index.md` — Create

Create an empty leaf-bundle marker file so Hugo treats `content/images/` as a page whose image files are accessible as `.Resources`.

```markdown
---
title: "Galerie"
---
```

### 4. `layouts/index.html` — Modify galerie section

Replace the current album-card loop:

```html
{{ $albums := where .Pages "Params.private" "ne" true }}
{{ if $albums }}
<section id="galerie" class="home-section home-section--light">
  <div class="home-section-inner">
    <div class="section-label">Galerie</div>
    <h2>Aus der <em>Werkstatt</em></h2>
  </div>
  <section class="galleries">
    {{ range $albums }}
      {{ partial "album-card.html" . }}
    {{ end }}
  </section>
</section>
{{ end }}
```

With a direct gallery partial call:

```html
{{ $imagesPage := .Site.GetPage "images" }}
{{ with $imagesPage }}
<section id="galerie" class="home-section home-section--light">
  <div class="home-section-inner">
    <div class="section-label">Galerie</div>
    <h2>Aus der <em>Werkstatt</em></h2>
  </div>
  {{ partial "gallery.html" . }}
</section>
{{ end }}
```

### 5. No JS or CSS changes

The theme's `gallery.js` and `lightbox.js` auto-initialize based on the `#gallery` div that `gallery.html` emits. PhotoSwipe, lazy loading, justified layout, and color placeholders all work unchanged.

---

## What Is NOT Changing

- PhotoSwipe version or lightbox configuration
- Gallery visual style (same justified layout algorithm)
- `/#ueber` and `/#anfrage` nav links
- Hero, footer, Leistungen section, Anfrage CTA
- Custom CSS and fonts

---

## How to Add Images Later

Drop image files (JPG, PNG, WebP) into `content/images/`. They appear automatically on the next build.

---

## Files Touched

| File | Action |
|------|--------|
| `hugo.toml` | Modify menu entries |
| `content/galerie/` | Delete |
| `content/images/index.md` | Create |
| `layouts/index.html` | Modify galerie section |
