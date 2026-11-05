# Project images

One image per project, named after the project's `slug` in `_src/content/projects-*.json`:

| File | Project |
| --- | --- |
| `sweat440-business-intelligence.webp` | Business intelligence portal |
| `sweat440-website.webp` | Website migration |
| `sweat440-advertising-automation.webp` | Advertising automation |
| `sweat440-brand-monitoring.webp` | Instagram brand monitoring |
| `dato-hace-relato.webp` | Dato Hace Relato |

- Ratio 16:10, about 1600 × 1000 px, WebP (`.jpg`/`.png` also work), quality ~75.
- Run `python _src/build.py` after adding one. The empty slot on the projects page and the
  home teaser is replaced automatically; the image's alt text is the project title.
