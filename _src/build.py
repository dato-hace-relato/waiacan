"""
Build the English and Spanish pages from one layout.

    python _src/build.py

Sources:
    _src/template.html         layout of the home page
    _src/thanks-template.html  no-JS "thank you" page after the contact form
    _src/content/en.json       English text  -> index.html, thanks.html
    _src/content/es.json       Spanish text  -> es/index.html, es/thanks.html

Every {{key}} in a template is replaced by the value of that key in the language file.
The build fails (and writes nothing) if a key is missing, a value contains a double quote
(values also land inside HTML attributes), or any {{...}} is left over. Keys present in one
language but not the other are reported, so the two versions can't silently drift apart.
"""
import json
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent
ROOT = SRC.parent
PLACEHOLDER = re.compile(r"\{\{\s*([a-z0-9_]+)\s*\}\}")

# Per-language values that depend on where the page lives, not on the copy.
PAGES = {
    "en": {"out_dir": ROOT, "root": "", "url": "https://waiacan.com/", "alt_href": "es/"},
    "es": {"out_dir": ROOT / "es", "root": "../", "url": "https://waiacan.com/es/", "alt_href": "../"},
}
TEMPLATES = {"template.html": "index.html", "thanks-template.html": "thanks.html"}


def fail(msg):
    print(f"BUILD FAILED: {msg}", file=sys.stderr)
    sys.exit(1)


def load_content():
    content = {}
    for lang in PAGES:
        path = SRC / "content" / f"{lang}.json"
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as e:
            fail(f"{path}: {e}")
        for key, value in data.items():
            if not isinstance(value, str):
                fail(f"{path}: '{key}' must be a string")
            if '"' in value:
                fail(f"{path}: '{key}' contains a double quote; use “ ” or ' instead")
        content[lang] = data

    only = {lang: set(content[lang]) - set().union(*(set(c) for l, c in content.items() if l != lang))
            for lang in content}
    for lang, keys in only.items():
        if keys:
            fail(f"keys only in {lang}.json: {', '.join(sorted(keys))}")
    return content


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
    templates = {name: (SRC / name).read_text(encoding="utf-8") for name in TEMPLATES}
    used = set()
    outputs = {}
    for lang, page in PAGES.items():
        values = {**content[lang], "lang": lang, "root": page["root"], "url": page["url"],
                  "alt_href": page["alt_href"]}
        for tpl_name, out_name in TEMPLATES.items():
            used |= set(PLACEHOLDER.findall(templates[tpl_name]))
            outputs[page["out_dir"] / out_name] = render(templates[tpl_name], values, f"{lang}/{tpl_name}")

    unused = sorted(set(content["en"]) - used)
    for path, html in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html, encoding="utf-8", newline="\n")
        print(f"built  {path.relative_to(ROOT).as_posix()}")
    if unused:
        print(f"note   unused keys (safe to delete): {', '.join(unused)}")


if __name__ == "__main__":
    main()
