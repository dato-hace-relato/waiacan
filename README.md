# WAIACAN website

Static site for **WAIACAN — Business Innovation Powered by AI**, in English and Spanish:
a home page and a projects page.
Plain HTML, CSS and vanilla JS. One small Python script generates the two language versions;
everything else in this folder is served as-is.

## Languages

| URL | Language | Who sees it |
| --- | --- | --- |
| `https://waiacan.com/` | English | Everyone outside Colombia (also the `x-default`) |
| `https://waiacan.com/es/` | Spanish | Visitors in Colombia |
| `https://waiacan.com/projects/` | English | Projects page |
| `https://waiacan.com/es/proyectos/` | Spanish | Projects page |

`js/lang.js` handles the routing (same IP approach as sweat440.com, via the free GeoJS API):
- Only English pages redirect, and only to their Spanish version, when the visitor's IP is in
  Colombia. The Spanish page never redirects, so a shared `/es/` link always opens in Spanish.
- The EN/ES switch (header and footer) is remembered in the browser and beats the IP check.
- The redirect keeps the query string and `#section`, so UTM tags survive.
- Crawlers aren't redirected; both pages are indexed via `hreflang` tags and `sitemap.xml`.
- **Test it:** add `?country=CO` (or `?country=US`) to fake the visitor's country for the
  session. A saved EN/ES choice wins, so clear site data to start over.

## Editing text (build step)

All the pages below are **generated** — don't edit them by hand; the next build overwrites them.

| Source | Generates |
| --- | --- |
| `_src/template.html` + `_src/content/en.json` / `es.json` | `index.html` / `es/index.html` |
| `_src/projects-template.html` + `en.json` / `es.json` + `projects-en.json` / `projects-es.json` | `projects/index.html` / `es/proyectos/index.html` |
| `_src/thanks-template.html` + `en.json` / `es.json` | `thanks.html` / `es/thanks.html` |
| `_src/partials/` (head, header, footer) | included in every page above with `{{> name}}` |

- **Projects:** `_src/content/projects-en.json` / `projects-es.json` hold each project
  (`challenge`, `solution`, `result`; a list inside `result` becomes bullet points) and the
  three `teaser` cards on the home page. Both files must list the same projects (same `slug`s,
  same order). The `slug` is the project's permanent anchor (`/projects/#<slug>`) and image name.
- **Project images:** add `images/projects/<slug>.webp` and rebuild; see
  `images/projects/README.md`. Until then each project shows an empty image slot.

```bash
python _src/build.py
```

- Change text in the two JSON files (same keys in both), layout in the templates.
- The build stops with a message if a key is missing from a language, a value contains a
  straight double quote (use “ ” instead), or a `{{placeholder}}` is left over.
- `h1_em` in each JSON sizes the hero title so line 1 fits on desktop; if you change the
  title, it may need adjusting (it's the width of the longest title line, in em, plus ~0.5).
- Commit the regenerated HTML together with the source change.

## Structure

| File | What it is |
| --- | --- |
| `index.html`, `es/index.html` | Home page in English / Spanish (generated, see above) |
| `projects/index.html`, `es/proyectos/index.html` | Projects page (generated) |
| `images/projects/` | Project images, one per project slug (see its README) |
| `_src/` | Templates, text per language, and `build.py` |
| `css/styles.css` | All styles. Brand colors, fonts and spacing are CSS variables in `:root` |
| `js/main.js` | Mobile menu, header border on scroll, hero word rotator, footer year, contact form submit. UI text comes from `data-*` attributes, so it serves both languages |
| `js/lang.js` | Colombia → Spanish routing and the remembered EN/ES choice |
| `js/hero-flow.js` | Hero animation: tangled lines run through the yellow bulb (`images/logo/waiacan-bulb.svg`) and leave ordered with yellow nodes (canvas; still frame for reduced motion; paused off screen) |
| `thanks.html`, `es/thanks.html` | Confirmation page after a no-JS form submission (`noindex`, generated) |
| `404.html` | Not-found page in both languages (styles inlined, since it's served at any missing path) |
| `images/logo/` | Web copies of the logos (horizontal, stacked, wordmark, icon × full color / white / black). Lettering is Sofia Sans SemiBold, outlined; masters in `../Waiacan_Logo_SofiaSans/` |
| `images/waiacan-og-image.png` | 1200×630 social share image |
| `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Favicons: the original icon (same paths and stroke weights as `Waiacan_Icon_Black.svg`) on a yellow rounded square. `apple-touch-icon.png` is square because iOS rounds it itself |
| `site.webmanifest`, `robots.txt`, `sitemap.xml` | Browser/SEO metadata |
| `.nojekyll` | Tells GitHub Pages to serve files as-is |

Logo masters (AI/SVG/PNG) live outside this repo in `Waiacan_Logo_Final/`. The horizontal
logos here have a tightened viewBox (less empty padding) so they size predictably.

## Brand rules

- Dark theme (blue charcoal). Background `#151B23`, alternate sections and cards `#1E2631`, titles and main
  text `#F5F5F5`, secondary text `#B8B8B8`, lines `#2A3441`. A faint `#222D3B` glow sits behind the hero symbol.
- The only accent is the logo yellow `#FFB400`: buttons (with black text), the rotating word,
  "AI", small labels and indicators, and the one yellow call-to-action card. No ochre/dark
  yellow, and never a full yellow section.
- The contact form is a white card (`--paper`) so typing stays comfortable.
- Logos on the site use the white + yellow versions (`*-white-yellow.svg`). The icon's five
  branch nodes are solid dots; the two bottom terminals keep their ring.
- Logo lettering, headings, buttons and labels: Sofia Sans SemiBold (600). Body text: Inter Regular.
- In the header and footer, "WAIACAN" is live text next to the icon image (`.brand-word`), not the drawn wordmark SVG.

## Contact form

The form in the Contact section sends to **santiago@waiacan.com** through
[FormSubmit](https://formsubmit.co) (free, no account or API key). GitHub Pages can't send
email itself, so a forwarding service is required.

- **One-time activation:** the first submission from the live site triggers a confirmation
  email to santiago@waiacan.com. Click the link in it, or nothing gets delivered.
- After activation, FormSubmit offers a random alias string to use instead of the email
  address in the form `action`, so the address isn't in the page source. Replace
  `santiago@waiacan.com` in the form's `action` in `_src/template.html` with that alias and rebuild.
- With JS, `js/main.js` posts to FormSubmit's AJAX endpoint and shows a thank-you message in
  place. Without JS, the plain POST redirects to `thanks.html` / `es/thanks.html` (set by the
  `_next` field, which assumes `https://waiacan.com/`).
- Each email includes a `language` field (`en`/`es`); Spanish inquiries have “(ES)” in the subject.
- Spam: a hidden honeypot field (`_honey`). If spam becomes a problem, remove the
  `_captcha=false` field to turn on FormSubmit's captcha page (only applies to the no-JS path).
- The "Prefer email?" link and footer link are plain `mailto:` links to the same address.

## Preview locally

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Deploy on GitHub Pages

1. Create a repo and push the contents of this folder to `main`.
2. Repo **Settings → Pages → Source:** "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Custom domain: enter `waiacan.com` in Settings → Pages (GitHub creates a `CNAME` file), then
   point DNS at GitHub Pages (A records `185.199.108.153`, `.109.153`, `.110.153`, `.111.153`,
   and a `www` CNAME to `<user>.github.io`). Enable "Enforce HTTPS".

Canonical URL, Open Graph image, `sitemap.xml` and `robots.txt` assume `https://waiacan.com/`.
If the domain changes, update them together.

## When editing

- Bump the `?v=` query on `css/styles.css` / `js/*.js` in `_src/template.html` after changing them, then rebuild, so visitors don't get a stale cached copy.
- Update `<lastmod>` in `sitemap.xml` after content changes.
- Check both languages at 375px wide and desktop before publishing.
