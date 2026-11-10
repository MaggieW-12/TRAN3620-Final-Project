"""Verify the 50 human-check flags against the source archive line by line."""

from __future__ import annotations

import csv
import json
import os
import zipfile
from contextlib import ExitStack
from io import TextIOWrapper
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "data" / "raw" / "OpenSubtitles-v2024-en-zh_CN.txt.zip"
EN_FILE = Path(
    os.environ.get(
        "OPUS_EN",
        ROOT / "data" / "raw" / "OpenSubtitles.en-zh_CN.en",
    )
)
ZH_FILE = Path(
    os.environ.get(
        "OPUS_ZH",
        ROOT / "data" / "raw" / "OpenSubtitles.en-zh_CN.zh_CN",
    )
)
DATA = ROOT / "site" / "data" / "corpus.json"
REPORT = ROOT / "site" / "data" / "verification.json"


def main() -> None:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    checked = [e for e in payload["entries"] if e["human_checked"] == "yes"]
    expected = {int(e["line_no"]): e for e in checked}
    mismatches = []

    with ExitStack() as stack:
        if EN_FILE.exists() and ZH_FILE.exists():
            en = stack.enter_context(
                EN_FILE.open("r", encoding="utf-8", errors="replace")
            )
            zh = stack.enter_context(
                ZH_FILE.open("r", encoding="utf-8", errors="replace")
            )
        else:
            archive = stack.enter_context(zipfile.ZipFile(ARCHIVE))
            raw_en = stack.enter_context(
                archive.open("OpenSubtitles.en-zh_CN.en")
            )
            raw_zh = stack.enter_context(
                archive.open("OpenSubtitles.en-zh_CN.zh_CN")
            )
            en = stack.enter_context(
                TextIOWrapper(raw_en, encoding="utf-8", errors="replace")
            )
            zh = stack.enter_context(
                TextIOWrapper(raw_zh, encoding="utf-8", errors="replace")
            )

        if True:
            for line_no, (source, target) in enumerate(zip(en, zh), start=1):
                if line_no not in expected:
                    continue
                entry = expected[line_no]
                source = " ".join(source.strip().replace("\u200b", "").split())
                target = " ".join(target.strip().replace("\u200b", "").split())
                if entry["source_text"] != source or entry["target_text"] != target:
                    mismatches.append(
                        {
                            "id": entry["id"],
                            "expected": [
                                entry["source_text"],
                                entry["target_text"],
                            ],
                            "found": [source, target],
                        }
                    )
                if line_no >= max(expected):
                    break

    report = {
        "sample_size": len(checked),
        "checked_against_source": len(checked) - len(mismatches),
        "mismatches": mismatches,
        "result": "pass" if not mismatches and len(checked) >= 50 else "review",
    }
    REPORT.write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["result"] != "pass":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
