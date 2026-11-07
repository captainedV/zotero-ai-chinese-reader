# Changelog

All notable changes to Moonlit Reader. Versions follow SemVer; the Zotero
manifest version is what Zotero compares, so it only ever increases.

## 1.4.0 — first public release

The first release intended for other people. It is the sum of the work below.

**Reading experience**

- Three switches in the reader toolbar popover (translate / summary / key
  points) are the only entry points: turning one on starts the work, turning it
  off pauses it and keeps what is already done.
- Each feature gets its own progress row in the dock; all three can run at the
  same time and never overwrite each other's numbers.
- The toolbar moon reflects what is happening (working / paused / failed) and
  every switch carries its own status line, so the switch and reality cannot
  disagree.
- Two-way sync between the PDF and the translation column, including hovering
  between lines and scrolling either side.

**Translation quality**

- Paragraph-level translation by default, with consecutive paragraphs batched
  into one request (default 2200 chars / 6 paragraphs) carrying the paper title,
  the current section heading and the neighbouring paragraphs as reference
  context. Measured on a real paper: 103 requests → 18.
- Document structure is classified before anything is sent: title, author,
  headings, abstract, body, figure/table captions are translated; tables,
  formulas, the table of contents, running heads and reference lists are not.
- Paragraphs cut by a page break, a column break or a caption wrap are joined
  back into one block, using punctuation first and geometry second. On three
  real papers the number of paragraphs ending mid-sentence dropped from
  15→2, 27→5 and 11→1.
- Math is readable in the output: LaTeX becomes Unicode and real
  superscripts/subscripts (`c_t^{Q}` → cₜ^Q, `\mathbb{R}^{d_c'}` → ℝ^dᶜ′).

**Reliability**

- `fetch` transport (streaming) with an automatic XMLHttpRequest fallback, a
  stall watchdog, non-streaming retry, bigger-budget retry for reasoning models,
  and 429 handling with a per-minute request budget.
- Settings are per paper and survive upgrades; a private backup restores the
  provider/model/base URL/key if Zotero's prefs are lost.
- Failures stay on screen in a sticky banner with the request URL and a hint.
- Built-in self-test (`moonlit.autoSelfTest`) and a 147-check browser audit.

## 1.3.0

- Punctuation-first paragraph joins across page and column breaks.
- Caption chains: a caption absorbs its wrapped lines even when a figure label
  sorts between them.
- Line font size is the size most of its characters use, so inline math no
  longer splits a paragraph.
- Captions and figure references are distinguished.
- New `content/scripts/latex.js` for math rendering.

## 1.2.1

- Feature switches are stored per paper (they used to leak from one paper to the
  next).
- Per-paper "clear translation" / "clear summary" buttons.
- "Clear local cache" in the preferences pane works again (it runs through the
  plugin instead of the pane sandbox).

## 1.2.0

- Batched, context-aware translation with a strict per-id JSON contract.
- Batches are ordered by distance from the page being read.

## 1.1.1

- Sentence joins across page and column breaks; wrapped headings merged;
  numbered section titles split out; header/footer statistics; TOC lines
  skipped; font tiers; strict heading rules.

## 1.0.0 – 1.0.12

- Initial plugin: reader UI, dock, translation/summary/highlight, cache, usage
  meter, settings pane, self-test, and the fixes that got the pipeline from
  "sometimes nothing happens" to a working product (transport, endpoint
  display, sticky errors, per-task progress, restart queue).
