"""Wykończenie scalonej publikacji i obsługa dotychczasowych adresów."""

from html import escape
from html.parser import HTMLParser
from pathlib import Path
import json
import posixpath
import re


MANIFEST = Path("oprawa/scalone/przekierowania.json")


def is_book(source):
    return bool(re.search(r"^#\+NUMERKI_BOOK:\s*t\s*$",
                          source.read_text(encoding="utf-8"), re.M | re.I))


def project_root(source):
    for parent in (source.parent, *source.parents):
        if (parent / MANIFEST).is_file():
            return parent
    raise ValueError(f"{source}: nie znaleziono mapy przekierowań")


def chapter_cards(text, source):
    """Uzupełnij automatyczny spis rozdziałów opisami zapisanymi w Org."""
    descriptions = {}
    for drawer in re.finditer(r"^\* [^\n]+\n:PROPERTIES:\n(.*?)^:END:\s*$",
                              source.read_text(encoding="utf-8"), re.M | re.S):
        properties = dict(re.findall(r"^:([A-Z_]+):[ \t]*(.*?)[ \t]*$", drawer[1], re.M))
        if "CUSTOM_ID" in properties and "CHAPTER_DESCRIPTION" in properties:
            descriptions[properties["CUSTOM_ID"]] = properties["CHAPTER_DESCRIPTION"]

    def card(match):
        target, title = match[1], match[2]
        numbered = re.match(r"^(\d+)\.\s+([\s\S]+)$", title)
        number = ""
        card_class = "chapter-card"
        if numbered:
            number = ('<span class="chapter-card-number">'
                      f'{int(numbered[1]):02d}</span>\n')
            title = numbered[2]
        else:
            card_class += " chapter-card-unnumbered"
        description = descriptions.get(target)
        detail = ('\n<span class="chapter-card-description">'
                  + escape(description) + '</span>') if description else ""
        return (f'<li class="{card_class}"><a class="chapter-card-link" href="#{target}">'
                + number + '<span class="chapter-card-title">' + title + '</span>'
                + detail + '\n<span class="chapter-card-arrow" aria-hidden="true">→</span>'
                + '</a></li>')

    def contents(match):
        return re.sub(r'<li><a href="#([^"<>]+)">([\s\S]*?)</a>\s*</li>', card, match[0])

    return re.sub(r'<nav\b[^>]*\bid="table-of-contents"[^>]*>[\s\S]*?</nav>',
                  contents, text)


def finish_book(source, output, render_mathml):
    text = render_mathml(output.read_text(encoding="utf-8"))
    # Org zachowuje LaTeX w trybie MathJax bez zamiany znaków \- na soft hyphen.
    # Po składzie do natywnego MathML konfiguracja i biblioteka są zbędne.
    text = re.sub(r"<script\b([^>]*)>([\s\S]*?)</script>",
                  lambda m: "" if ("MathJax-script" in m[1]
                                   or "MathJax" in m[2]) else m[0], text, flags=re.I)
    explicit = set(re.findall(r'\bid=["\'](org[0-9a-f]+)["\']',
                              source.read_text(encoding="utf-8")))
    text = re.sub(r' id="(org[0-9a-f]+)"',
                  lambda m: m[0] if m[1] in explicit else "", text)
    text = re.sub(r'class="([^"]*)"',
                  lambda m: 'class="' + " ".join(dict.fromkeys(m[1].split())) + '"', text)
    text = re.sub(r"<b>([\s\S]*?)</b>", r"<strong>\1</strong>", text)
    text = re.sub(r"<table\b[^>]*>",
                  lambda m: re.sub(r'\s+(?:border|cellspacing|cellpadding|rules|frame)="[^"]*"',
                                   "", m[0]), text)
    text = re.sub(r"<html\b([^>]*)>", r'<html\1 data-mode="reading">', text, count=1)

    # Dotychczasowe linki cbN-M rozdziału liniowego wskazują konkretne wiersze.
    def lines(match):
        opening, identifier, code = match[1], match[2], match[3]
        rendered = "".join(
            f'<span id="{identifier}-wiersz-{i}">{line}</span>'
            for i, line in enumerate(code.splitlines(keepends=True), 1)
        )
        return opening + rendered + "</pre>"

    text = re.sub(r'(<pre\b[^>]*\bid="(liniowe-kod-[0-9]+)"[^>]*>)([\s\S]*?)</pre>',
                  lines, text)
    text = chapter_cards(text, source)
    output.write_text(text, encoding="utf-8")


def load_redirects(root):
    value = json.loads((root / MANIFEST).read_text(encoding="utf-8"))
    if value.get("wersja") != 1 or not isinstance(value.get("strony"), dict):
        raise ValueError("nieobsługiwany format mapy przekierowań")
    return value["strony"]


def validate_redirects(root, book):
    class Anchors(HTMLParser):
        def __init__(self):
            super().__init__()
            self.ids = set()

        def handle_starttag(self, tag, attrs):
            identifier = dict(attrs).get("id")
            if identifier:
                if identifier in self.ids:
                    raise ValueError(f"powtórzona kotwica publikacji: {identifier}")
                self.ids.add(identifier)

    document = Anchors()
    document.feed(book.read_text(encoding="utf-8"))
    for page, specification in load_redirects(root).items():
        for target in [specification["rozdzial"], *specification["kotwice"].values()]:
            if target not in document.ids:
                raise ValueError(f"{page}: brak docelowej kotwicy {target}")


def redirect_html(page, specification):
    relative = posixpath.relpath("index.html", posixpath.dirname(page) or ".")
    target = relative + "#" + specification["rozdzial"]
    mapping = specification["kotwice"]
    config = json.dumps({"strona": relative, "rozdzial": specification["rozdzial"],
                         "kotwice": mapping}, ensure_ascii=False).replace("<", "\\u003c")
    aliases = "\n".join(
        f'<a id="{escape(old, quote=True)}" href="{escape(relative + "#" + new, quote=True)}" hidden></a>'
        for old, new in sorted(mapping.items())
    )
    return f'''<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rozdział w scalonych notatkach — Metody numeryczne</title>
<link rel="canonical" href="{escape(target, quote=True)}">
<script>
"use strict";
const przeniesienie = {config};
let staraKotwica = location.hash.slice(1);
try {{ staraKotwica = decodeURIComponent(staraKotwica); }} catch (_) {{}}
const cel = Object.prototype.hasOwnProperty.call(przeniesienie.kotwice, staraKotwica)
  ? przeniesienie.kotwice[staraKotwica] : przeniesienie.rozdzial;
location.replace(przeniesienie.strona + "#" + encodeURIComponent(cel));
</script>
</head>
<body>
<p>Ten rozdział jest częścią wspólnych notatek.</p>
<p><a href="{escape(target, quote=True)}">Otwórz rozdział w nowym dokumencie</a></p>
{aliases}
</body>
</html>
'''


def finish_redirect(source, output):
    root = project_root(source)
    page = source.with_suffix(".html").relative_to(root).as_posix()
    specification = load_redirects(root).get(page)
    if specification is None:
        raise ValueError(f"{page}: brak przekierowania w mapie")
    output.write_text(redirect_html(page, specification), encoding="utf-8")


def redirect_source(source):
    return bool(re.search(r"^#\+NUMERKI_REDIRECT:\s*t\s*$",
                          source.read_text(encoding="utf-8"), re.M | re.I))


def write_redirects(root):
    validate_redirects(root, root / "index.html")
    pages = load_redirects(root)
    for page, specification in pages.items():
        target = (root / page).resolve()
        if not target.is_relative_to(root.resolve()) or target == root / "index.html":
            raise ValueError(f"niedozwolona ścieżka przekierowania: {page}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(redirect_html(page, specification), encoding="utf-8")
