"""
Build the English and Spanish pages from shared layouts.

    python _src/build.py

Sources:
    _src/template.html            home page layout
    _src/projects-template.html   projects page layout
    _src/thanks-template.html     no-JS "thank you" page after the contact form
    _src/partials/*.html          shared pieces, included with {{> name}} (head, header, footer)
    _src/content/en.json, es.json page text (flat "key": "text")
    _src/content/projects-en.json, projects-es.json
                                  the projects (challenge / solution / result) and the 3 teaser
                                  cards on the home page

Outputs:
    index.html, thanks.html, projects/index.html                  (English)
    es/index.html, es/thanks.html, es/proyectos/index.html        (Spanish)

Every {{key}} is replaced by that key's text. The build fails (and writes nothing) if a key is
missing, a page-text value contains a straight double quote (values also land in attributes),
the two languages don't have the same keys or the same projects, a teaser points at a project
that doesn't exist, or any {{...}} is left over.

Project images: put images/projects/<slug>.webp (or .jpg/.png) in place and rebuild; until
then the page shows an empty image slot.
"""
import html
import json
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent
ROOT = SRC.parent
PLACEHOLDER = re.compile(r"\{\{\s*([a-z0-9_]+)\s*\}\}")
INCLUDE = re.compile(r"\{\{>\s*([a-z0-9_-]+)\s*\}\}")
LANGS = ("en", "es")
IMAGE_DIR = ROOT / "images" / "projects"
IMAGE_EXTS = (".webp", ".jpg", ".jpeg", ".png")

SITE = "https://waiacan.com/"
URLS = {  # page -> {lang: absolute URL}; also used for hreflang pairs
    "home": {"en": SITE, "es": SITE + "es/"},
    "projects": {"en": SITE + "projects/", "es": SITE + "es/proyectos/"},
}

# Where each page lives and how its links resolve (all links are relative, so the site also
# works without the custom domain).
PAGES = [
    # template, page, lang, output, root, alt_href, home_href, home_anchor, projects_href
    ("template.html", "home", "en", "index.html", "", "es/", "./", "", "projects/"),
    ("template.html", "home", "es", "es/index.html", "../", "../", "./", "", "proyectos/"),
    ("thanks-template.html", "home", "en", "thanks.html", "", "es/", "./", "", "projects/"),
    ("thanks-template.html", "home", "es", "es/thanks.html", "../", "../", "./", "", "proyectos/"),
    ("projects-template.html", "projects", "en", "projects/index.html", "../", "../es/proyectos/", "../", "../", "./"),
    ("projects-template.html", "projects", "es", "es/proyectos/index.html", "../../", "../../projects/", "../", "../", "./"),
]
# On the projects page the <head> uses the projects_* text instead of the home page's.
META_OVERRIDES = {
    "projects": {"meta_title": "projects_meta_title", "meta_description": "projects_meta_description",
                 "og_title": "projects_meta_title", "og_description": "projects_meta_description"},
}


def fail(msg):
    print(f"BUILD FAILED: {msg}", file=sys.stderr)
    sys.exit(1)


def read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        fail(f"{path}: {e}")


def load_content():
    content = {}
    for lang in LANGS:
        path = SRC / "content" / f"{lang}.json"
        data = read_json(path)
        for key, value in data.items():
            if not isinstance(value, str):
                fail(f"{path}: '{key}' must be a string")
            if '"' in value:
                fail(f"{path}: '{key}' contains a double quote; use “ ” or ' instead")
        content[lang] = data
    for lang in LANGS:
        others = set().union(*(set(content[o]) for o in LANGS if o != lang))
        extra = set(content[lang]) - others
        if extra:
            fail(f"keys only in {lang}.json: {', '.join(sorted(extra))}")
    return content


def load_projects():
    projects = {}
    for lang in LANGS:
        path = SRC / "content" / f"projects-{lang}.json"
        data = read_json(path)
        for p in data.get("projects", []):
            for field in ("slug", "title", "meta", "challenge", "solution", "result"):
                if not p.get(field):
                    fail(f"{path}: project '{p.get('slug', '?')}' is missing '{field}'")
        slugs = [p["slug"] for p in data["projects"]]
        for t in data.get("teaser", []):
            if t.get("slug") not in slugs:
                fail(f"{path}: teaser points at unknown project '{t.get('slug')}'")
        projects[lang] = data
    order = {lang: [p["slug"] for p in projects[lang]["projects"]] for lang in LANGS}
    if len({tuple(o) for o in order.values()}) != 1:
        fail(f"projects differ between languages: {order}")
    return projects


def esc(text):
    return html.escape(text, quote=True)


def image_for(slug):
    """Return (filename, width, height) of the project's image, or None if not added yet."""
    for ext in IMAGE_EXTS:
        f = IMAGE_DIR / f"{slug}{ext}"
        if f.exists():
            try:
                from PIL import Image
                with Image.open(f) as im:
                    return f.name, im.width, im.height
            except Exception:
                return f.name, None, None
    return None


def media(slug, alt, root, cls):
    img = image_for(slug)
    if img:
        name, w, h = img
        size = f' width="{w}" height="{h}"' if w else ""
        return (f'<figure class="{cls}"><img src="{root}images/projects/{name}" alt="{esc(alt)}"'
                f'{size} loading="lazy"></figure>')
    # Empty slot until an image is added; the faint bulb keeps it looking intentional.
    return (f'<div class="{cls} is-empty" aria-hidden="true">'
            f'<!-- Image slot: add images/projects/{slug}.webp (16:10, about 1600 px wide) and rebuild -->'
            f'<img src="{root}images/logo/waiacan-bulb.svg?v=1" alt="" width="375" height="427" loading="lazy"></div>')


def paragraphs(items, indent):
    out = []
    for item in items:
        if isinstance(item, list):
            lis = "".join(f"<li>{esc(li)}</li>" for li in item)
            out.append(f"{indent}<ul>{lis}</ul>")
        else:
            out.append(f"{indent}<p>{esc(item)}</p>")
    return "\n".join(out)


def render_projects(data, text, root):
    pad = " " * 10
    blocks = []
    for p in data["projects"]:
        blocks.append(f"""{pad}<article class="project" id="{p['slug']}">
{pad}  {media(p['slug'], p['title'], root, 'project-media')}
{pad}  <div class="project-body">
{pad}    <p class="project-meta">{esc(p['meta'])}</p>
{pad}    <h2>{esc(p['title'])}</h2>
{pad}    <div class="project-block">
{pad}      <h3 class="project-label">{esc(text['label_challenge'])}</h3>
{paragraphs(p['challenge'], pad + '      ')}
{pad}    </div>
{pad}    <div class="project-block">
{pad}      <h3 class="project-label">{esc(text['label_solution'])}</h3>
{paragraphs(p['solution'], pad + '      ')}
{pad}    </div>
{pad}    <div class="project-block project-result">
{pad}      <h3 class="project-label">{esc(text['label_result'])}</h3>
{paragraphs(p['result'], pad + '      ')}
{pad}    </div>
{pad}  </div>
{pad}</article>""")
    return "\n".join(blocks)


def render_teaser(data, root, projects_href):
    pad = " " * 10
    cards = []
    for t in data["teaser"]:
        cards.append(f"""{pad}<a class="card teaser-card" href="{projects_href}#{t['slug']}">
{pad}  {media(t['slug'], t['title'], root, 'teaser-media')}
{pad}  <h3>{esc(t['title'])}</h3>
{pad}  <p>{esc(t['text'])}</p>
{pad}  <p class="teaser-meta">{esc(t['meta'])}</p>
{pad}</a>""")
    return "\n".join(cards)


def expand(template, partials, name):
    def sub(m):
        if m.group(1) not in partials:
            fail(f"{name}: unknown partial '{m.group(1)}'")
        return partials[m.group(1)].rstrip("\n")
    return INCLUDE.sub(sub, template)


def render(template, values, name):
    missing = sorted({k for k in PLACEHOLDER.findall(template) if k not in values})
    if missing:
        fail(f"{name}: no value for {', '.join(missing)}")
    out = PLACEHOLDER.sub(lambda m: values[m.group(1)], template)
    if "{{" in out or "}}" in out:
        fail(f"{name}: unresolved placeholder left in output")
    return out


def main():
    content = load_content()
    projects = load_projects()
    partials = {f.stem: f.read_text(encoding="utf-8") for f in (SRC / "partials").glob("*.html")}
    used, outputs = set(), {}
    for tpl, page, lang, out, root, alt_href, home_href, home_anchor, projects_href in PAGES:
        template = expand((SRC / tpl).read_text(encoding="utf-8"), partials, tpl)
        used |= set(PLACEHOLDER.findall(template))
        text = content[lang]
        values = {
            **text,
            "lang": lang, "root": root, "url": URLS[page][lang],
            "url_en": URLS[page]["en"], "url_es": URLS[page]["es"],
            "alt_href": alt_href, "home_href": home_href, "home_anchor": home_anchor,
            "projects_href": projects_href,
            "projects_current": ' aria-current="page"' if page == "projects" else "",
            "projects_list": render_projects(projects[lang], text, root),
            "teaser_cards": render_teaser(projects[lang], root, projects_href),
        }
        used |= {"label_challenge", "label_solution", "label_result"}  # used by render_projects
        for key, source in META_OVERRIDES.get(page, {}).items():
            values[key] = text[source]
            used.add(source)
        outputs[ROOT / out] = render(template, values, f"{lang}/{tpl}")

    for path, page_html in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(page_html, encoding="utf-8", newline="\n")
        print(f"built  {path.relative_to(ROOT).as_posix()}")
    missing_images = [p["slug"] for p in projects["en"]["projects"] if not image_for(p["slug"])]
    if missing_images:
        print(f"note   image slots still empty: {', '.join(missing_images)} (add images/projects/<slug>.webp)")
    unused = sorted(set(content["en"]) - used)
    if unused:
        print(f"note   unused keys (safe to delete): {', '.join(unused)}")


if __name__ == "__main__":
    main()
