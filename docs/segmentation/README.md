# Segmentation: before / after the punctuation-first pass

Dumps from `node test/segment-dump.mjs <pdf> --pages 8`. `before-*` is the 1.2.2
behaviour, `after-*` adds the punctuation-first joins, caption chains and math
handling.

| paper | metric | before | after |
|---|---|---|---|
| DeepSeek-V2 (single column) | paragraphs | 115 | 110 |
| | prose paragraphs | 28 | 26 |
| | avg chars per prose paragraph | 449 | 493 |
| | paragraphs ending mid-sentence | 3 | 2 |
| | longest caption (chars) | 248 | 291 |
| | page-break joins | 3 | 2 |
| Xiao et al. (two columns) | paragraphs | 110 | 91 |
| | prose paragraphs | 53 | 48 |
| | avg chars per prose paragraph | 437 | 513 |
| | paragraphs ending mid-sentence | 11 | 5 |
| | longest caption (chars) | 399 | 318 |
| | page-break joins | 3 | 4 |
| DeepSeek-R1 (caption-heavy) | paragraphs | 108 | 99 |
| | prose paragraphs | 47 | 40 |
| | avg chars per prose paragraph | 447 | 523 |
| | paragraphs ending mid-sentence | 8 | 1 |
| | longest caption (chars) | 353 | 551 |
| | page-break joins | 3 | 4 |

## What changed

1. **Punctuation first.** A paragraph that has not finished its sentence continues in
   the next prose block — across an indent, a column edge, or a figure label that sorts
   between the lines. Geometry now only decides when punctuation is neutral.
2. **Caption chains.** A caption absorbs its wrapped lines even when a 4.9 pt axis label
   lands between them; the Figure 1 caption of the R1 paper is one 551-character
   paragraph instead of two fragments plus a body paragraph.
3. **Dominant line size.** A line size is the size most of its characters use, so
   inline math can no longer make one line "11.5 pt" and split the paragraph.
4. **Captions vs figure references.** "Figure 1 | (a) …" is a caption; "Figure 1(a)
   depicts …" is a body paragraph that merely mentions a figure.
5. **Math-led prose stays prose.** A paragraph starting with a formula symbol but
   explaining it ("where … denotes …") is translated, not dropped as a formula.
6. **Math rendering.** `content/scripts/latex.js` turns LaTeX into Unicode and real
   `<sup>`/`<sub>` markup for the translated cards and the summary.
