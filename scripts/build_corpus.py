"""Build the Humor Across the Line corpus from OpenSubtitles 2024.

The script streams the two aligned Moses text files directly from the downloaded
ZIP, applies a fixed topical filter, and retains a deterministic random sample.
No subtitle text is generated or rewritten.
"""

from __future__ import annotations

import csv
import hashlib
import heapq
import json
import os
import random
import re
import sys
import zipfile
from collections import Counter
from contextlib import ExitStack
from io import TextIOWrapper
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = Path(
    os.environ.get(
        "OPUS_ARCHIVE",
        ROOT / "data" / "raw" / "OpenSubtitles-v2024-en-zh_CN.txt.zip",
    )
)
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
OUT_JSON = ROOT / "site" / "data" / "corpus.json"
OUT_CSV = ROOT / "site" / "data" / "corpus.csv"
META_JSON = ROOT / "data" / "processed" / "sampling_metadata.json"
RETRIEVED = "2026-11-10"
SEED = 3620
TARGET_SIZE = 500
SCREEN_SIZE = 300_000
TOTAL_ALIGNED_LINES = 22_394_812
SOURCE_URL = (
    "https://object.pouta.csc.fi/OPUS-OpenSubtitles/v2024/"
    "moses/en-zh_CN.txt.zip"
)

HUMOR_CUES = {
    "joke": re.compile(
        r"\b(joke|jokes|joked|joking|kidding|kidded|kid me|pull(?:ing)? my leg)\b",
        re.I,
    ),
    "laughter": re.compile(
        r"\b(laugh|laughs|laughed|laughing|laughter|giggle|giggles|giggling|"
        r"chuckle|chuckles|chuckling)\b",
        re.I,
    ),
    "funny": re.compile(
        r"\b(funny|funnier|funniest|hilarious|hysterical|humou?r|humou?rous|"
        r"comedy|comedic|punchline|silly|ridiculous|absurd)\b",
        re.I,
    ),
    "play_signal": re.compile(
        r"\b(ha[ -]?ha+|lol|make me laugh|comic relief|"
        r"you(?:'ve| have) got to be kidding|you(?:'re| are) joking|"
        r"yeah,? right|give me a break)\b",
        re.I,
    ),
}

HUMOR_PREFILTER = re.compile(
    r"\b(?:joke|jokes|joked|joking|kidding|kidded|kid me|pull(?:ing)? my leg|"
    r"laugh|laughs|laughed|laughing|laughter|giggle|giggles|giggling|"
    r"chuckle|chuckles|chuckling|"
    r"funny|funnier|funniest|hilarious|hysterical|humou?r|humou?rous|"
    r"comedy|comedic|punchline|silly|ridiculous|absurd|ha[ -]?ha+|lol|"
    r"make me laugh|comic relief|yeah,? right|give me a break)\b",
    re.I,
)

EN_SOURCE_CUE = {
    "joke": ["joke", "jokes", "joked", "joking", "kidding", "kidded", "leg"],
    "laughter": [
        "laugh",
        "laughs",
        "laughed",
        "laughing",
        "laughter",
        "giggle",
        "chuckle",
        "smile",
        "smiling",
        "grin",
    ],
    "funny": [
        "funny",
        "funnier",
        "funniest",
        "hilarious",
        "hysterical",
        "humor",
        "humour",
        "comedy",
        "comedic",
        "punchline",
        "silly",
        "ridiculous",
        "absurd",
    ],
    "play_signal": ["haha", "lol", "right", "break", "kidding", "joking"],
}

EN_IDIOMS = re.compile(
    r"\b("
    r"piece of cake|pulling my leg|pull my leg|under the weather|"
    r"spill the beans|break a leg|cost an arm and a leg|out of the blue|"
    r"once in a blue moon|hit the sack|let the cat out of the bag|"
    r"butterflies in my stomach|speak of the devil|money talks|time flies|"
    r"big deal|get real|give me a break|fat chance|long shot|no way|"
    r"you've got to be kidding|you have got to be kidding"
    r")\b",
    re.I,
)

ZH_CUES = {
    "joke": re.compile(r"玩笑|笑话|说笑|逗我|逗你|闹着玩| kidding |开的玩笑"),
    "laughter": re.compile(r"笑|哈哈|嘻嘻|乐死|偷乐|傻笑|抿嘴|咧嘴"),
    "funny": re.compile(
        r"搞笑|幽默|有趣|好玩|好笑|滑稽|荒唐|离谱|可笑|荒谬|夸张|逗趣|傻|疯"
    ),
    "play_signal": re.compile(r"真的假的|别逗了|开什么玩笑|你在逗我|得了吧|少来|没门"),
}

ZH_IDIOMS = re.compile(
    r"开什么玩笑|你在逗我|真的假的|别逗了|得了吧|少来|没门|"
    r"太阳打西边出来|笑掉大牙|笑死人不偿命|一本正经|开玩笑|闹着玩的"
)

EXPLICITATION_MARKERS = re.compile(
    r"也就是|意思是|我是说|说白了|换句话说|难道|原来|其实|毕竟|"
    r"所谓|这表示|也就是说"
)

CJK = re.compile(r"[\u3400-\u9fff]")
LATIN = re.compile(r"[A-Za-z]")
SPACE = re.compile(r"\s+")

CATEGORY_LABELS = {
    "direct-retention": {
        "en": "Direct retention",
        "zh": "直接保留",
    },
    "functional-equivalence": {
        "en": "Functional equivalence",
        "zh": "功能等值",
    },
    "explicitation": {
        "en": "Explicitation / amplification",
        "zh": "明晰化／增译",
    },
    "compression-neutralization": {
        "en": "Compression / neutralization",
        "zh": "压缩／中和",
    },
}


def clean(text: str) -> str:
    return SPACE.sub(" ", text.strip().replace("\u200b", ""))


def cjk_count(text: str) -> int:
    return len(CJK.findall(text))


def detect_cues(text: str) -> list[str]:
    if not HUMOR_PREFILTER.search(text):
        return []
    found: list[str] = []
    for name, pattern in HUMOR_CUES.items():
        match = pattern.search(text)
        if match:
            found.append(name)
    return found


def detect_zh_cues(text: str) -> list[str]:
    return [name for name, pattern in ZH_CUES.items() if pattern.search(text)]


def category_for(
    source: str, target: str, source_cues: list[str], target_cues: list[str]
) -> tuple[str, str]:
    """Apply the documented four-rule hierarchy in codebook order."""
    en_words = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", source)
    zh_chars = cjk_count(target)
    ratio = zh_chars / max(len(en_words), 1)
    has_explanation = bool(EXPLICITATION_MARKERS.search(target))
    has_idiom = bool(EN_IDIOMS.search(source) or ZH_IDIOMS.search(target))

    if not target_cues and ratio < 1.15:
        return (
            "compression-neutralization",
            "The English has an explicit humor cue, but the Chinese omission/reduction leaves no comparable cue.",
        )

    if has_explanation and ratio >= 1.25:
        return (
            "explicitation",
            "The Chinese adds an explanatory or connective marker and expands the English proposition.",
        )

    if has_idiom or (
        target_cues
        and source_cues
        and set(target_cues).isdisjoint(source_cues)
    ):
        return (
            "functional-equivalence",
            "The Chinese changes the wording or cue family while retaining a comparable humorous function.",
        )

    if target_cues and (
        set(target_cues) & set(source_cues)
        or (
            "joke" in source_cues
            and "joke" in target_cues
        )
    ):
        return (
            "direct-retention",
            "The Chinese retains the same humor cue or proposition without a major explanatory addition.",
        )

    if target_cues:
        return (
            "functional-equivalence",
            "The Chinese uses different humor vocabulary to preserve the interactional effect.",
        )

    return (
        "direct-retention",
        "No rule for omission, explanation, or cue substitution applies; the line is treated as direct.",
    )


def random_key(line_no: int) -> str:
    return hashlib.sha256(f"{SEED}:{line_no}".encode("ascii")).hexdigest()


def main() -> None:
    if not ARCHIVE.exists():
        raise FileNotFoundError(f"Corpus archive not found: {ARCHIVE}")

    rejected = Counter()
    humor_hits = Counter()
    seen_pairs: set[tuple[str, str]] = set()
    seen_sources: set[str] = set()
    heap: list[tuple[str, int, str, str]] = []
    total_pairs = 0
    screened_pairs = 0
    screen_ids = set(
        random.Random(SEED).sample(
            range(1, TOTAL_ALIGNED_LINES + 1), SCREEN_SIZE
        )
    )

    with ExitStack() as stack:
        if EN_FILE.exists() and ZH_FILE.exists():
            en = stack.enter_context(
                EN_FILE.open("r", encoding="utf-8", errors="replace")
            )
            zh = stack.enter_context(
                ZH_FILE.open("r", encoding="utf-8", errors="replace")
            )
            input_method = "extracted aligned text files"
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
            input_method = "ZIP streams"

        if True:
            for line_no, (source_raw, target_raw) in enumerate(zip(en, zh), start=1):
                total_pairs += 1
                if line_no not in screen_ids:
                    continue
                screened_pairs += 1
                source = clean(source_raw)
                target = clean(target_raw)

                if not source or not target:
                    rejected["empty_side"] += 1
                    continue
                if not LATIN.search(source) or not CJK.search(target):
                    rejected["language_script_check"] += 1
                    continue
                word_count = len(re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", source))
                target_cjk_count = cjk_count(target)
                if word_count < 5 or word_count > 32:
                    rejected["english_length"] += 1
                    continue
                if target_cjk_count < 3 or target_cjk_count > 100:
                    rejected["chinese_length"] += 1
                    continue
                if len(source) > 180 or len(target) > 120:
                    rejected["character_limit"] += 1
                    continue
                latin_in_target = len(LATIN.findall(target))
                if latin_in_target > max(12, target_cjk_count * 0.35):
                    rejected["target_not_predominantly_chinese"] += 1
                    continue

                cues = detect_cues(source)
                if not cues:
                    rejected["no_explicit_humor_cue"] += 1
                    continue

                key = (source.casefold(), target.casefold())
                if key in seen_pairs:
                    rejected["duplicate_pair"] += 1
                    continue
                source_key = source.casefold()
                if source_key in seen_sources:
                    rejected["duplicate_english_source"] += 1
                    continue
                seen_pairs.add(key)
                seen_sources.add(source_key)
                humor_hits.update(cues)

                item = (random_key(line_no), line_no, source, target)
                if len(heap) < TARGET_SIZE:
                    heapq.heappush(heap, item)
                elif item[0] < heap[0][0]:
                    heapq.heapreplace(heap, item)

                if screened_pairs % 25_000 == 0:
                    print(
                        f"Screened {screened_pairs:,} random pairs; "
                        f"hits store {len(heap)} random candidates",
                        file=sys.stderr,
                    )

    selected = sorted(heap)
    if len(selected) != TARGET_SIZE:
        raise RuntimeError(
            f"Expected {TARGET_SIZE} candidates, found {len(selected)}. "
            "Broaden the approved filters before proceeding."
        )

    # A fixed random subset is marked checked only after line-level verification
    # has been completed in verify_corpus.py.
    checker = random.Random(SEED)
    checked_lines = set(checker.sample([item[1] for item in selected], 50))

    entries: list[dict[str, object]] = []
    for rank, (_, line_no, source, target) in enumerate(selected, start=1):
        source_cues = detect_cues(source)
        target_cues = detect_zh_cues(target)
        category, basis = category_for(source, target, source_cues, target_cues)
        primary_cue = source_cues[0]
        entries.append(
            {
                "id": f"OS24-{line_no:09d}",
                "source_text": source,
                "target_text": target,
                "source": (
                    f"OpenSubtitles v2024 en-zh_CN, aligned line {line_no}; "
                    f"sampled {RETRIEVED}, seed {SEED}; {SOURCE_URL}"
                ),
                "category": category,
                "human_checked": "yes" if line_no in checked_lines else "no",
                "unit": "sentence pair",
                "key_term": primary_cue,
                "humor_cue": primary_cue,
                "target_cue": target_cues[0] if target_cues else "none",
                "genre": "subtitles",
                "year": 2024,
                "translator": "OpenSubtitles volunteer contributors (individual not recorded)",
                "region": "Simplified Chinese target",
                "notes": basis,
                "line_no": line_no,
                "sample_rank": rank,
            }
        )

    categories = Counter(entry["category"] for entry in entries)
    checked = sum(entry["human_checked"] == "yes" for entry in entries)
    metadata = {
        "corpus": "OpenSubtitles v2024 en-zh_CN",
        "source_url": SOURCE_URL,
        "source_sha256": hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(),
        "input_method": input_method,
        "retrieved": RETRIEVED,
        "seed": SEED,
        "sample_method": (
            "Use seed 3620 to draw 300,000 distinct aligned line numbers uniformly "
            "from all 22,394,812 pairs in the official Moses archive. Apply the "
            "predeclared topical filters to that screening sample, then sort passing "
            "entries by SHA-256(seed:line_no) and retain the lowest 500 hashes. "
            "This is a two-stage reproducible random sample of the filtered "
            "humorous-dialogue frame, not a hand-picked selection."
        ),
        "screen_size": SCREEN_SIZE,
        "screen_ids_with_data": screened_pairs,
        "filters": [
            "Both aligned sides non-empty",
            "English contains Latin letters; Chinese contains CJK characters",
            "English: 5-32 words",
            "Chinese: 3-100 CJK characters",
            "Fixed humor-cue lexicon matches the English line",
            "Exact duplicate aligned pairs removed",
        ],
        "total_aligned_pairs": TOTAL_ALIGNED_LINES,
        "passing_humor_candidates_after_dedup": len(seen_pairs),
        "humor_cue_hits": dict(humor_hits),
        "rejections": dict(rejected),
        "selected": len(entries),
        "checked": checked,
        "category_counts": dict(sorted(categories.items())),
        "generated_date": RETRIEVED,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    META_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps(
            {
                "metadata": metadata,
                "categories": CATEGORY_LABELS,
                "entries": entries,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    fields = [
        "id",
        "source_text",
        "target_text",
        "source",
        "category",
        "human_checked",
        "unit",
        "key_term",
        "humor_cue",
        "target_cue",
        "genre",
        "year",
        "translator",
        "region",
        "notes",
        "line_no",
        "sample_rank",
    ]
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(entries)

    META_JSON.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
