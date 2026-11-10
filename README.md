# TRAN3620-Final-Project

## Jokes Between Chinese and English

An English-Chinese corpus explorer for the translation of humor in subtitles.

The corpus contains 500 sentence pairs sampled from OpenSubtitles v2024
(`en-zh_CN`). Each entry records its archive line number, collection date,
sampling seed, category, and verification status.

Files:

- `site/data/corpus.csv` - tabular corpus with the required fields.
- `site/data/corpus.json` - the same corpus plus metadata for the website.
- `data/processed/sampling_metadata.json` - sampling counts and method.
- `scripts/build_corpus.py` - reproducible corpus-building script.
- `scripts/verify_corpus.py` - line-level verification for the 50 checked items.

The raw 594 MB OpenSubtitles archive is intentionally excluded from Git.
