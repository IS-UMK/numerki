#!/usr/bin/env python3
"""Eksportuj wskazane źródła Org; bez argumentów — scalone notatki index.org."""

from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True

from sprawdz_projekt import EXPORT, ROOT, finish_org_html


def main():
    sources = [Path(value).resolve() for value in sys.argv[1:]] if sys.argv[1:] else [
        ROOT / "index.org"
    ]
    emacs = shutil.which("emacs")
    if not emacs:
        print("BŁĄD: brak Emacsa z Org-mode.", file=sys.stderr)
        return 1
    for source in sources:
        if not source.is_file() or source.suffix != ".org":
            print(f"BŁĄD: brak źródła Org: {source}", file=sys.stderr)
            return 1
    command = [emacs, "--batch", "-Q", "--eval", EXPORT]
    temporary_outputs = []
    try:
        for source in sources:
            with tempfile.NamedTemporaryFile(prefix=".org-export-", suffix=".html",
                                             dir=source.parent, delete=False) as temporary:
                output = Path(temporary.name)
            temporary_outputs.append((source, output))
            command.extend([str(source), str(output)])
        result = subprocess.run(command, capture_output=True, text=True,
                                timeout=120, check=False)
        if result.returncode:
            print(result.stdout + result.stderr, file=sys.stderr)
            return result.returncode
        for source, temporary in temporary_outputs:
            finish_org_html(source, temporary)
        # Zastąp wynik dopiero po powodzeniu eksportu i składu wszystkich wzorów.
        for source, temporary in temporary_outputs:
            output = source.with_suffix(".html")
            shutil.copymode(output if output.exists() else source, temporary)
            temporary.replace(output)
            print(f"OK: {source.name} → {output.name}")
        return 0
    except subprocess.TimeoutExpired:
        print("BŁĄD: eksport przekroczył 120 sekund.", file=sys.stderr)
        return 1
    finally:
        for _, temporary in temporary_outputs:
            temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, UnicodeError, ValueError) as error:
        print(f"BŁĄD: {error}", file=sys.stderr)
        sys.exit(1)
