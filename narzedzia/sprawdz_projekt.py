#!/usr/bin/env python3
"""Sprawdź lokalny HTML i próbny eksport Org bez zmiany plików projektu."""

from html.parser import HTMLParser
from html import escape, unescape
from pathlib import Path
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urlsplit

sys.dont_write_bytecode = True


ROOT = Path(__file__).resolve().parents[1]
IGNORE = shutil.ignore_patterns(
    ".git", ".codex", ".agents", ".aws", ".venv", "node_modules",
    "__pycache__", ".#*", "#*#", "*~",
)
ORG_DEPENDENCY = re.compile(
    r'^\s*#\+(?:SETUPFILE|INCLUDE):\s*(?:"([^"]+)"|(\S+))', re.IGNORECASE
)

# -Q pomija konfigurację Emacsa. Wyłączenie ustawień lokalnych i Babel
# zapobiega wykonaniu kodu z dokumentów w trakcie próbnego eksportu.
EXPORT = r"""
(progn
  (setq enable-local-variables nil
        enable-local-eval nil
        create-lockfiles nil
        make-backup-files nil
        auto-save-default nil)
  (require 'ox-html)
  (setq org-export-use-babel nil)
  (let ((files command-line-args-left))
    (setq command-line-args-left nil)
    (while files
      (let ((source (pop files))
            (output (pop files)))
        (with-current-buffer (find-file-noselect source)
          (org-export-to-file 'html output nil nil nil nil
                              '(:time-stamp-file nil :html-prefer-user-labels t)))))))
"""


def render_mathml(text):
    """Zamień wzory LaTeX na MathML, pozostawiając kod i skrypty bez zmian."""
    protected = [m.span() for m in re.finditer(
        r"<(pre|code|script|style)\b[^>]*>[\s\S]*?</\1>", text, re.IGNORECASE
    )]
    formula = re.compile(
        r"(?:<!-- numerki-math-label: ([\s\S]*?) -->\s*)?"
        r"(?:\\\(([\s\S]*?)\\\)|"
        r"\\begin\{equation\*\}([\s\S]*?)\\end\{equation\*\})"
    )
    matches = [m for m in formula.finditer(text)
               if not any(start <= m.start() < end for start, end in protected)]
    if not matches:
        return text
    pandoc = shutil.which("pandoc")
    if not pandoc:
        raise ValueError("brak Pandoca; nie można odtworzyć wzorów MathML")
    version = subprocess.run([pandoc, "-f", "markdown", "-t", "json"], input="",
                             capture_output=True, text=True, timeout=30, check=False)
    if version.returncode:
        raise ValueError("nie można odczytać formatu JSON Pandoca: " + version.stderr)
    document = json.loads(version.stdout)
    document["blocks"] = [
        {"t": "Para", "c": [{"t": "Math", "c": [
            {"t": "InlineMath" if m[2] is not None else "DisplayMath"},
            unescape(m[2] if m[2] is not None else m[3]).strip(),
        ]}]} for m in matches
    ]
    result = subprocess.run([pandoc, "-f", "json", "-t", "html", "--mathml", "--wrap=none"],
                            input=json.dumps(document), capture_output=True, text=True,
                            timeout=60, check=False)
    rendered = re.findall(r"<math\b[\s\S]*?</math>", result.stdout)
    if result.returncode or len(rendered) != len(matches) or "Could not convert" in result.stderr:
        raise ValueError("nie powiodła się konwersja wszystkich wzorów do MathML: "
                         + result.stderr)
    for match, replacement in reversed(list(zip(matches, rendered))):
        if match[1] is not None:
            replacement = replacement.replace(
                "<math ", '<math aria-label="' + escape(match[1], quote=True) + '" ', 1
            )
        text = text[:match.start()] + replacement + text[match.end():]
    return text


def finish_org_html(source, output):
    """Wykończ książkę lub stronę przekierowania po standardowym eksporcie Org."""
    from scalony_html import finish_book, finish_redirect, is_book, redirect_source
    if is_book(source):
        finish_book(source, output, render_mathml)
    elif redirect_source(source):
        finish_redirect(source, output)


class Document(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.tags = set()
        self.anchors = set()
        self.duplicate_anchors = set()
        self.references = []
        self.feed(path.read_text(encoding="utf-8"))
        self.close()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.add(tag)
        names = {attrs.get("id"), attrs.get("name") if tag == "a" else None} - {None, ""}
        for name in names:
            if name in self.anchors:
                self.duplicate_anchors.add(name)
            self.anchors.add(name)
        references = [attrs.get("src")]
        if tag in ("a", "link"):
            references.append(attrs.get("href"))
        for value in references:
            if value:
                self.references.append((self.getpos()[0], value))

    handle_startendtag = handle_starttag


def project_files(root, suffix):
    """Zachowaj podkatalogi, pomijając katalogi narzędziowe i kopie Emacsa."""
    for directory, dirs, files in os.walk(root):
        ignored = IGNORE(directory, dirs + files)
        dirs[:] = sorted(name for name in dirs if name not in ignored)
        for name in sorted(files):
            if name not in ignored and name.endswith(suffix):
                yield Path(directory) / name


def check_org_dependencies(root):
    errors = []
    dependencies = 0
    for source in project_files(root, ".org"):
        for line, text in enumerate(source.read_text(encoding="utf-8").splitlines(), 1):
            match = ORG_DEPENDENCY.match(text)
            if not match:
                continue
            reference = match.group(1) or match.group(2)
            url = urlsplit(reference.split("::", 1)[0])
            if url.scheme or url.netloc:
                continue
            dependencies += 1
            if not (source.parent / unquote(url.path)).is_file():
                errors.append(f"{source.relative_to(root)}:{line}: {reference} — brak pliku")
    print(f"Zależności Org: {dependencies} lokalnych odwołań, {len(errors)} błędów.")
    for error in errors:
        print(f"  BŁĄD: {error}")
    return not errors


def check(root, label):
    parsed = {path.resolve(): Document(path) for path in project_files(root, ".html")}
    errors = []
    local_links = 0
    for address, doc in parsed.items():
        name = address.relative_to(root)
        missing = {"html", "head", "title", "body"} - doc.tags
        if missing:
            errors.append(f"{name}: brak elementów {', '.join(sorted(missing))}")
        if doc.duplicate_anchors:
            errors.append(f"{name}: powtórzone kotwice {', '.join(sorted(doc.duplicate_anchors))}")
        for line, reference in doc.references:
            url = urlsplit(reference)
            if url.scheme or url.netloc:
                continue
            local_links += 1
            target = (address.parent / unquote(url.path)).resolve() if url.path else address
            prefix = f"{name}:{line}: {reference}"
            if not target.exists():
                errors.append(f"{prefix} — brak pliku")
            elif url.fragment and target in parsed:
                if unquote(url.fragment) not in parsed[target].anchors:
                    errors.append(f"{prefix} — brak kotwicy")
    print(f"{label}: {len(parsed)} stron, {local_links} lokalnych odsyłaczy/zasobów, "
          f"{len(errors)} błędów.")
    for error in errors:
        print(f"  BŁĄD: {error}")
    return not errors


def main():
    pages = list(project_files(ROOT, ".html"))
    sources = [path for path in project_files(ROOT, ".org")
               if "oprawa" not in path.relative_to(ROOT).parts]
    if not pages or not sources:
        print("BŁĄD: oczekiwano plików HTML i Org w katalogu projektu.", file=sys.stderr)
        return 1
    existing_ok = check(ROOT, "Istniejący HTML")
    if not check_org_dependencies(ROOT):
        return 1
    emacs = shutil.which("emacs")
    if not emacs:
        print("BŁĄD: brak Emacsa; nie sprawdzono eksportu Org.", file=sys.stderr)
        return 1
    with tempfile.TemporaryDirectory(prefix="numerki-org-") as directory:
        staged = Path(directory) / "projekt"
        shutil.copytree(ROOT, staged, ignore=IGNORE)
        command = [emacs, "--batch", "-Q", "--eval", EXPORT]
        for source in sources:
            staged_source = staged / source.relative_to(ROOT)
            command.extend([str(staged_source), str(staged_source.with_suffix(".html"))])
        try:
            result = subprocess.run(command, cwd=staged, capture_output=True,
                                    text=True, timeout=120, check=False)
        except subprocess.TimeoutExpired:
            print("BŁĄD: eksport Org przekroczył 120 sekund.", file=sys.stderr)
            return 1
        if result.returncode:
            print("BŁĄD: eksport Org do HTML nie powiódł się.", file=sys.stderr)
            print(result.stdout + result.stderr, file=sys.stderr)
            return 1
        for source in sources:
            staged_source = staged / source.relative_to(ROOT)
            finish_org_html(staged_source, staged_source.with_suffix(".html"))
        if (staged / "oprawa/scalone/przekierowania.json").is_file():
            from scalony_html import write_redirects
            write_redirects(staged)
        print(f"Próbny eksport: {len(sources)} plików Org; bloki kodu wyłączone.")
        exported_ok = check(staged, "HTML po próbnym eksporcie")
    if existing_ok and exported_ok:
        print("OK. Pliki projektu pozostały bez zmian. Wygląd i działanie sprawdź w przeglądarce.")
        return 0
    return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, UnicodeError, ValueError) as error:
        print(f"BŁĄD: {error}", file=sys.stderr)
        sys.exit(1)
