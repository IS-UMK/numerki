"""Wykończenie i kontrola scalonej publikacji."""

from html import escape
from html.parser import HTMLParser
import re


def is_book(source):
    return bool(re.search(r"^#\+NUMERKI_BOOK:\s*t\s*$",
                          source.read_text(encoding="utf-8"), re.M | re.I))


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


def validate_book(book):
    """Odrzuć powtórzone kotwice przed zastąpieniem wynikowego HTML."""
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
