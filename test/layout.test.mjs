import fs from 'node:fs';
import * as pdfjs from '/tmp/pdfcheck/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import { loadPlugin, test, testAsync, assert, assertEqual, assertClose, summary } from './harness.mjs';

const M = loadPlugin('i18n.js', 'util.js', 'layout.js', 'sentences.js', 'quotes.js');

const PDF = process.env.MOONLIT_TEST_PDF
  || '/Users/xia/Zotero/storage/VTII8MTH/Xiao 等 - Deterministic Image-to-Image Translation via Denoising Brownian Bridge Models with Dual Approximator.pdf';

console.log('\n== document extraction ==');
const data = new Uint8Array(fs.readFileSync(PDF));
const pdf = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: false }).promise;
const page1 = await pdf.getPage(1);
const view = page1.view;
const rotation = page1.rotate;
const tc = await page1.getTextContent();
const built = M.Layout.buildPage(tc.items, { view, rotation }, 0, { stopAtReferences: true });

console.log('\n== viewport math (must match pdf.js) ==');
for (const rot of [0, 90, 180, 270]) {
  for (const scale of [1, 1.53]) {
    test(`viewport transform rotation=${rot} scale=${scale}`, () => {
      const vp = M.Layout.makeViewport({ view, rotation: rot, scale });
      const ref = page1.getViewport({ scale, rotation: rot });
      assertEqual(vp.transform.map(v => +v.toFixed(6)), ref.transform.map(v => +v.toFixed(6)), 'transform');
      assertClose(vp.width, ref.width, 1e-6, 'width');
      assertClose(vp.height, ref.height, 1e-6, 'height');
      const pt = [123, 456];
      assertClose(vp.convertToViewportPoint(...pt)[0], ref.convertToViewportPoint(...pt)[0], 1e-6, 'viewport.x');
      const back = vp.convertToPdfPoint(...vp.convertToViewportPoint(...pt));
      assertClose(back[1], pt[1], 1e-6, 'roundtrip');
    });
  }
}

console.log('\n== content typing ==');

test('a paragraph split by a markup change is merged back', () => {
  // Three stacked lines of one sentence with a small line-height jitter used to
  // become three separate paragraphs (and three half-sentence translations).
  const mk = (text, top, size = 10, x0 = 100) => ({
    text, fontSize: size,
    rect: [x0, top - 12, x0 + 380, top],
    x0, x1: x0 + 380, baseline: top, hasEOL: true,
    items: [{ text, rect: [x0, top - 12, x0 + 380, top] }]
  });
  const lines = [
    mk('We propose a deterministic image-to-image translation', 700),
    mk('framework that removes the stochastic sampling step', 688),
    mk('while keeping the perceptual quality of the baseline.', 676)
  ];
  const paragraphs = M.Layout.groupLinesIntoParagraphs(lines);
  assertEqual(paragraphs.length, 1, `paragraphs=${paragraphs.length}`);
});

test('an indented line starts a new paragraph', () => {
  const mk = (text, top, x0) => ({
    text, fontSize: 10, rect: [x0, top - 12, x0 + 380, top],
    x0, x1: x0 + 380, baseline: top, hasEOL: true,
    items: [{ text, rect: [x0, top - 12, x0 + 380, top] }]
  });
  const paragraphs = M.Layout.groupLinesIntoParagraphs([
    mk('The first paragraph runs to the end of its last full line and stops here:', 700, 100),
    mk('a new thought begins with an indent instead of the column edge.', 688, 118)
  ]);
  assertEqual(paragraphs.length, 2, `paragraphs=${paragraphs.length}`);
});

test('document roles are assigned page by page', () => {
  const page = M.Layout.buildPage(tc.items, { view, rotation }, 0, { stopAtReferences: true });
  const info = M.Layout.annotateDocument([page]);
  const roles = new Set(page.paragraphs.map(p => p.role));
  assert(roles.has('title') || roles.has('heading'), `roles=${[...roles].join(',')}`);
  assert(roles.has('body'), `roles=${[...roles].join(',')}`);
  assertEqual(info.bodySize > 0, true);
  const title = page.paragraphs.find(p => p.role === 'title');
  if (title) {
    assert(title.translatable !== false, 'titles must be translated');
    assert(title.fontSize >= info.bodySize, 'the title is larger than body text');
  }
});

test('tables, formulas and the toc stay untranslated', () => {
  const paragraph = (text, fontSize = 10) => ({
    text, fontSize, pageIndex: 0,
    rect: [100, 100, 500, 112].map(v => v),
    lines: [{ text, rect: [100, 100, 500, 112], fontSize, items: [{ text, rect: [100, 100, 500, 112] }] }]
  });
  const ctx = { bodySize: 10, pageHeight: 800, isFirstPage: false, inAbstract: false, seenBody: true, topBand: false };
  const cases = [
    ['Table 2: Ablation on the two branches of the model', 'table-caption', true],
    ['Figure 3: Overview of the proposed architecture.', 'figure-caption', true],
    ['1. Introduction', 'heading', true],
    ['Table 1.  Layer  Params  FLOPs  3.2M  1.1G  4.5M  2.0G  9.1M', 'table', false],
    ['L = -\u03a3 y log p(y|x) + \u03bb ||\u03b8||   (2)', 'formula', false],
    ['1. Introduction ................................ 3', 'toc', false],
    ['2. Related Work ..................... 4', 'toc', false]
  ];
  for (const [text, role, translatable] of cases) {
    const verdict = M.Layout.classifyParagraph(paragraph(text), ctx);
    assertEqual(verdict.role, role, `"${text.slice(0, 32)}" → ${verdict.role}`);
    assertEqual(verdict.translatable, translatable, `translatable for "${text.slice(0, 24)}"`);
  }
});

test('running heads repeat and are dropped', () => {
  const pages = [0, 1, 2, 3].map(index => ({
    pageIndex: index,
    height: 800,
    paragraphs: [
      { text: 'Proceedings of the 2024 Conference on Empirical Methods', fontSize: 8, rect: [100, 790, 500, 800], lines: [] },
      { text: `Body paragraph number ${index} with real content about the method.`, fontSize: 10, rect: [100, 400, 500, 700], lines: [] }
    ]
  }));
  M.Layout.annotateDocument(pages);
  const head = pages[0].paragraphs[0];
  assertEqual(head.role, 'pageNoise');
  assertEqual(head.translatable, false);
  assertEqual(pages[0].paragraphs[1].translatable, true);
});

test('page model has lines and paragraphs', () => {
  assert(built.lines.length > 20, `lines=${built.lines.length}`);
  assert(built.paragraphs.length > 3, `paragraphs=${built.paragraphs.length}`);
  assertEqual([built.columns], [2], 'two-column detection');
});

test('title is found near the top of the page in reading order', () => {
  const index = built.paragraphs.findIndex(p => /Deterministic Image-to-Image Translation/i.test(p.text));
  assert(index >= 0 && index <= 6, `title paragraph index=${index}`);
});

test('abstract text is extracted with hyphens merged', () => {
  const joined = built.paragraphs.map(p => p.text).join(' ');
  assert(/Image-to-Image \(I2I\) translation is a significant area of research/i.test(joined),
    'abstract sentence missing');
  assert(!/im-\s*age/u.test(joined), 'hyphenation not merged');
});

test('paragraphs stay inside a single column', () => {
  const p = built.paragraphs.find(x => /broad applications across academia/i.test(x.text));
  assert(p, 'paragraph found');
  const singleColumn = p.rects.every(r => r[2] < 310 || r[0] > 300);
  assert(singleColumn, 'paragraph rects stay inside one column');
});

test('line rects carry glyph-level item boxes', () => {
  const line = built.lines.find(l => /significant area of re/.test(l.text));
  assert(line, 'line found');
  assert(line.items.length >= 1, 'items present');
  for (const item of line.items) {
    assert(item.text.length > 0, 'item text');
    assert(item.rect.length === 4 && item.rect[2] > item.rect[0], 'item rect sane');
  }
});

test('noise (page numbers / symbol soup) filtered out', () => {
  assert(!built.paragraphs.some(p => /^\d{1,3}$/.test(p.text.trim())), 'page number kept');
  assert(!built.paragraphs.some(p => !/[A-Za-z]{2}/.test(p.text)), 'symbol-only paragraph kept');
});

console.log('\n== sentences ==');
const S = M.Sentences;
test('splits plain sentences', () => {
  const out = S.split('We propose a model. It works well! Does it scale? Yes.');
  assertEqual(out.map(s => s.text), ['We propose a model.', 'It works well!', 'Does it scale?', 'Yes.']);
});
test('keeps abbreviations intact', () => {
  const out = S.split('Results are shown in Fig. 3 and in Tab. 2 of Smith et al. 2020. Accuracy reaches 0.94 on the benchmark.');
  assertEqual(out.length, 2, JSON.stringify(out.map(s => s.text)));
});
test('handles decimals and citations', () => {
  const out = S.split('The gain is 3.5 points over prior work [12], [13]. We report results in Sec. 4.');
  assertEqual(out.length, 2, JSON.stringify(out.map(s => s.text)));
});
test('splits Chinese punctuation', () => {
  const out = S.split('本文提出一种新方法。实验表明该方法有效！未来将进一步研究？');
  assertEqual(out.length, 3, JSON.stringify(out.map(s => s.text)));
});
test('splitParagraph keeps lossless coverage', () => {
  const text = 'Deterministic I2I translation guarantees consistency. Existing methods are stochastic. Our bridge model reduces variance.';
  const parts = S.splitParagraph({ id: 'p0', text, pageIndex: 0 });
  assertEqual(parts.map(p => p.text).join(' '), text);
});

console.log('\n== sentence -> rects (cross-highlight) ==');

test('every sentence resolves to rects of its own paragraph, in reading order', () => {
  let checked = 0;
  for (const paragraph of built.paragraphs) {
    const sentences = S.split(paragraph.text);
    if (sentences.length < 2) {
      continue;
    }
    const resolved = M.Quotes.rectsForSegments(paragraph, sentences.map(s => s.text));
    assertEqual(resolved.length, sentences.length);
    let lastTop = Infinity;
    for (const item of resolved) {
      assert(item.rects.length > 0, `no rects for "${sentences[0].text.slice(0, 20)}…"`);
      for (const rect of item.rects) {
        assert(rect[2] > rect[0] && rect[3] > rect[1], 'rect degenerate');
        // inside the paragraph bbox (small tolerance for rounded corners)
        const box = paragraph.rect;
        assert(rect[0] >= box[0] - 2 && rect[2] <= box[2] + 2, 'rect escapes paragraph horizontally');
        assert(rect[1] >= box[1] - 4 && rect[3] <= box[3] + 4, 'rect escapes paragraph vertically');
      }
      // PDF user space has its origin at the bottom-left, so reading order means
      // a monotonically decreasing y.
      const top = Math.max(...item.rects.map(r => r[3]));
      assert(top <= lastTop + 1, 'sentences resolved out of order (would paint the wrong region)');
      lastTop = top;
      checked++;
    }
  }
  assert(checked > 20, `too few sentences checked: ${checked}`);
});

test('adjacent sentences never share the same rects', () => {
  const paragraph = built.paragraphs.find(p => S.split(p.text).length >= 3);
  assert(paragraph, 'need a multi-sentence paragraph');
  const sentences = S.split(paragraph.text);
  const resolved = M.Quotes.rectsForSegments(paragraph, sentences.map(s => s.text));
  for (let i = 1; i < resolved.length; i++) {
    assert(
      JSON.stringify(resolved[i].rects) !== JSON.stringify(resolved[i - 1].rects),
      `sentences ${i - 1} and ${i} resolved to identical boxes`
    );
  }
});

test('a repeated phrase still resolves forward, not back to the first occurrence', () => {
  const paragraph = built.paragraphs.find(p => p.text.length > 300) || built.paragraphs[0];
  const word = paragraph.text.split(/\s+/).slice(0, 3).join(' ');
  const repeated = [word, `unrelated middle text`, word];
  const resolved = M.Quotes.rectsForSegments(paragraph, repeated);
  const first = resolved[0].at;
  const second = resolved[2].at;
  assert(second >= first, `second occurrence resolved backwards (${first} vs ${second})`);
});

console.log('\n== quote -> rects ==');
const docModel = {
  pages: [{ pageIndex: 0, paragraphs: built.paragraphs.map((p, i) => ({ ...p, id: `p${i}` })) }],
  paragraphs: built.paragraphs
};

test('locates a verbatim quote and returns rects inside the paragraph', () => {
  const target = built.paragraphs.find(p => /significant area of research/i.test(p.text));
  const quote = 'Image-to-Image (I2I) translation is a significant area of research';
  const hit = M.Quotes.findQuote(docModel, quote);
  assert(hit, 'quote not found');
  assert(hit.score >= 1, `score=${hit.score}`);
  assert(hit.rects.length >= 1, 'rects');
  for (const rect of hit.rects) {
    assert(rect[0] >= 40 && rect[2] <= target.rect[2] + 1, `x inside column: ${rect}`);
    assert(rect[1] >= target.rect[1] - 2 && rect[3] <= target.rect[3] + 2, `y inside paragraph: ${rect}`);
  }
});

test('quote highlighting is partial on the first and last line', () => {
  const hit = M.Quotes.findQuote(docModel, 'academia and industry');
  assert(hit, 'quote not found');
  const columnWidth = 294.753 - 58.5;
  const last = hit.rects[hit.rects.length - 1];
  const widthRatio = (last[2] - last[0]) / columnWidth;
  assert(widthRatio < 0.85, `last rect should be partial, ratio=${widthRatio}`);
});

test('recovers quotes the model reworded slightly', () => {
  // Models often introduce ellipses or drop a word; the fuzzy pass must still land.
  const hit = M.Quotes.findQuote(docModel, 'Image-to-Image … translation is a significant area of research in both academia');
  assert(hit, 'fuzzy quote not found');
  assert(hit.rects.length >= 1, 'rects');
  assert(hit.score > 0.5 && hit.score < 1, `score=${hit.score}`);
});

test('recovers quotes spanning two paragraphs', () => {
  const first = built.paragraphs.find(p => /significant area of research/i.test(p.text));
  const index = built.paragraphs.indexOf(first);
  const next = built.paragraphs[index + 1];
  assert(next, 'need a following paragraph');
  const tail = first.text.split(/(?<=[.!?])\s+/).slice(-1)[0].slice(0, 60);
  const head = next.text.split(/(?<=[.!?])\s+/)[0].slice(0, 60);
  const hit = M.Quotes.findQuote(docModel, `${tail} ${head}`);
  assert(hit, 'cross-paragraph quote not found');
  assert(hit.rects.length >= 2, `rects=${hit.rects.length}`);
});

test('returns null for absent quotes', () => {
  assertEqual(M.Quotes.findQuote(docModel, 'this sentence does not exist in the paper at all'), null);
});

await testAsync('multi-page document indices stay consistent', async () => {
  const pages = [];
  for (let i = 1; i <= 3; i++) {
    const page = await pdf.getPage(i);
    const pageTc = await page.getTextContent();
    pages.push(M.Layout.buildPage(pageTc.items, { view: page.view, rotation: page.rotate }, i - 1, { stopAtReferences: true }));
  }
  let n = 0;
  const allParagraphs = [];
  for (const page of pages) {
    for (const paragraph of page.paragraphs) {
      paragraph.id = `p${n++}`;
      allParagraphs.push(paragraph);
    }
  }
  const multi = { pages, paragraphs: allParagraphs };
  // Pick real prose: index 10 is often a heading, whose "first sentence" is "1.".
  const target = allParagraphs.find(p => p.text.length > 160) || allParagraphs[10];
  const quote = target.text.split(/(?<=[.!?])\s+/)[0].slice(0, 80);
  const hit = M.Quotes.findQuote(multi, quote);
  assert(hit, 'quote not found across pages');
  assertEqual(hit.paragraphId, target.id, 'resolved to the right paragraph');
});

console.log('\n== markdown ==');
const MD = loadPlugin('markdown.js').Markdown;
test('renders headings, lists and bold', () => {
  const html = MD.render('## 一句话总结\n\n- **要点** 内容\n- 第二条\n\n1. 第一\n2. 第二\n\n> 引用\n');
  assert(html.includes('<h3 class="ml-h ml-h2">一句话总结</h3>'), html);
  assert(html.includes('<ul><li><strong>要点</strong> 内容</li><li>第二条</li></ul>'), html);
  assert(html.includes('<ol><li>第一</li><li>第二</li></ol>'), html);
  assert(html.includes('<blockquote>引用</blockquote>'), html);
});
test('escapes HTML from the model', () => {
  const html = MD.render('<img src=x onerror=alert(1)> and `code<script>`');
  assert(!html.includes('<img'), html);
  assert(html.includes('&lt;img'), html);
  assert(html.includes('<code>code&lt;script&gt;</code>'), html);
});

summary();
