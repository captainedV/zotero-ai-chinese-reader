# Segmentation: before / after P0

Dumps generated with `node test/segment-dump.mjs <pdf> --pages 8` on the first eight
pages of two real papers from the library. `before-*.md` is the 1.0.12 segmentation,
`after-*.md` is the P0 work.

| paper | metric | before | after |
|---|---|---|---|
| DeepSeek-V2 (single column) | paragraphs | 132 | 115 |
| | prose paragraphs | 40 | 28 |
| | avg chars per prose paragraph | 311 | 449 |
| | paragraphs ending mid-sentence | 15 | 3 |
| | headings glued into prose | 0 | 0 |
| | page-break joins | 0 | 3 |
| Xiao et al. (two columns) | paragraphs | 124 | 110 |
| | prose paragraphs | 67 | 53 |
| | avg chars per prose paragraph | 352 | 437 |
| | paragraphs ending mid-sentence | 27 | 11 |
| | headings glued into prose | 4 | 0 |
| | page-break joins | 0 | 3 |

"Mid-sentence ends" that remain are intended: a paragraph that introduces a formula
(`… is given by`), a title, or a URL run. Those must not absorb the block that
follows.

## What changed

1. **Page-break join** — a paragraph that stops at the bottom of a page and resumes at
   the top of the next is one paragraph again, chained across any number of pages. The
   second half becomes a *shadow* paragraph on its own page so hovering either half
   highlights the same translation card.
2. **Column-break join** — the same sentence cut at the bottom of the left column and
   resumed at the top of the right column is joined (rects from both halves are kept).
3. **Caption continuation** — a caption whose next line was classified as body text is
   absorbed back into the caption instead of becoming a stray paragraph under a figure.
4. **Wrapped headings merged** — "Agent Tools &" + "Interoperability" is one heading.
5. **Numbered section titles split out** — "2.1. Image-to-Image Translation" no longer
   ends up glued to the paragraph above it.
6. **Header/footer statistics** — exact block matching at a 60% threshold over sampled
   pages (first/last 20), plus digit-normalised keys, restricted to the page margins.
7. **TOC lines recognised** — "B DeepSeek-V2-Lite: A 16B Model 29" and "3 Pre-Training 11"
   are skipped instead of translated.
8. **Font tiers** — body/h1/h2/h3 from a character-weighted size histogram; headings
   carry a level (used by the prompts and by the title rule).
9. **Strict heading rules** — length ≤ 80, no terminal punctuation unless the text is
   numbered, and numbered/section titles force a paragraph split.

## Where the code lives

- `content/scripts/layout.js` — `fontTiers`, `tierOf`, `looksLikeHeading`, `hasNumbering`,
  `isTocLine`, `annotateDocument`, `mergeBrokenSentences` (page/column joins).
- `content/scripts/pdfdoc.js` — assigns ids before the joins and skips shadow entries
  when building the canonical paragraph list.
- `test/segment-dump.mjs` — regenerates these dumps.
