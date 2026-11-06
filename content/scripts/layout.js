/**
 * Pure layout engine: turns pdf.js text items into lines, columns and
 * paragraphs with geometry, so the same code can run inside Zotero's reader and
 * inside Node unit tests.
 *
 * Coordinate system: PDF user space (points, origin bottom-left, y grows
 * upwards), exactly like Zotero annotation `position.rects`, so paragraph
 * geometry can be used directly to create highlights.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	// ---------------------------------------------------------------- matrices
	// Mirrors pdf.js `Util.transform()` / `Util.applyInverseTransform()`.
	function transform(m1, m2) {
		return [
			m1[0] * m2[0] + m1[2] * m2[1],
			m1[1] * m2[0] + m1[3] * m2[1],
			m1[0] * m2[2] + m1[2] * m2[3],
			m1[1] * m2[2] + m1[3] * m2[3],
			m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
			m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
		];
	}

	function applyInverseTransform(p, m) {
		const d = m[0] * m[3] - m[1] * m[2];
		const xt = (p[0] * m[3] - p[1] * m[2] + m[2] * m[5] - m[4] * m[3]) / d;
		const yt = (-p[0] * m[1] + p[1] * m[0] + m[4] * m[1] - m[5] * m[0]) / d;
		return [xt, yt];
	}

	/**
	 * Port of pdf.js `PageViewport` (scale/rotation aware), matching its
	 * transform matrix bit for bit so page geometry lines up with the viewer.
	 * @param {{view:number[], rotation:number, scale:number}} params
	 */
	function makeViewport({ view, rotation = 0, scale = 1 }) {
		const [x0, y0, x1, y1] = view;
		const centerX = (x0 + x1) / 2;
		const centerY = (y0 + y1) / 2;
		let rot = rotation % 360;
		if (rot < 0) {
			rot += 360;
		}
		let rotateA;
		let rotateB;
		let rotateC;
		let rotateD;
		switch (rot) {
		case 180: rotateA = -1; rotateB = 0; rotateC = 0; rotateD = 1; break;
		case 90: rotateA = 0; rotateB = 1; rotateC = 1; rotateD = 0; break;
		case 270: rotateA = 0; rotateB = -1; rotateC = -1; rotateD = 0; break;
		default: rotateA = 1; rotateB = 0; rotateC = 0; rotateD = -1; break;
		}
		let offsetCanvasX;
		let offsetCanvasY;
		let width;
		let height;
		if (rotateA === 0) {
			offsetCanvasX = Math.abs(centerY - y0) * scale;
			offsetCanvasY = Math.abs(centerX - x0) * scale;
			width = (y1 - y0) * scale;
			height = (x1 - x0) * scale;
		}
		else {
			offsetCanvasX = Math.abs(centerX - x0) * scale;
			offsetCanvasY = Math.abs(centerY - y0) * scale;
			width = (x1 - x0) * scale;
			height = (y1 - y0) * scale;
		}
		const m = [
			rotateA * scale,
			rotateB * scale,
			rotateC * scale,
			rotateD * scale,
			offsetCanvasX - rotateA * scale * centerX - rotateC * scale * centerY,
			offsetCanvasY - rotateB * scale * centerX - rotateD * scale * centerY
		];
		return {
			scale,
			width,
			height,
			transform: m,
			convertToViewportPoint(x, y) {
				return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
			},
			convertToPdfPoint(x, y) {
				return applyInverseTransform([x, y], m);
			}
		};
	}

	function bbox(points) {
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const [x, y] of points) {
			if (x < minX) {
				minX = x;
			}
			if (y < minY) {
				minY = y;
			}
			if (x > maxX) {
				maxX = x;
			}
			if (y > maxY) {
				maxY = y;
			}
		}
		return [minX, minY, maxX, maxY];
	}

	function unionRect(rects) {
		let r = rects[0].slice();
		for (let i = 1; i < rects.length; i++) {
			const q = rects[i];
			r = [Math.min(r[0], q[0]), Math.min(r[1], q[1]), Math.max(r[2], q[2]), Math.max(r[3], q[3])];
		}
		return r;
	}

	function roundRect(rect, digits = 3) {
		const k = 10 ** digits;
		return rect.map(v => Math.round(v * k) / k);
	}

	// ------------------------------------------------------------------- items
	const LIGATURES = {
		'\uFB00': 'ff',
		'\uFB01': 'fi',
		'\uFB02': 'fl',
		'\uFB03': 'ffi',
		'\uFB04': 'ffl',
		'\u00A0': ' '
	};

	function normalizeItemText(str) {
		if (!str) {
			return '';
		}
		let out = '';
		for (const ch of str) {
			out += LIGATURES[ch] ?? ch;
		}
		return out.replace(/[\u00AD]/g, '');
	}

	/**
	 * Convert one pdf.js text item into a glyph-run record in PDF space.
	 */
	function toRun(item, viewport) {
		const tx = transform(viewport.transform, item.transform);
		const fontHeight = Math.hypot(tx[2], tx[3]);
		const advance = Math.hypot(tx[0], tx[1]);
		if (!fontHeight || !advance) {
			return null;
		}
		// Rotated (e.g. sideways axis labels) or degenerate runs are skipped:
		// they are never useful as translatable prose.
		const angle = Math.abs(Math.atan2(tx[1], tx[0]));
		if (angle > 0.14 && Math.abs(angle - Math.PI) > 0.14) {
			return null;
		}
		const left = tx[4];
		const top = tx[5] - fontHeight;
		const width = (item.width || 0) * viewport.scale;
		const rect = bbox([
			viewport.convertToPdfPoint(left, top),
			viewport.convertToPdfPoint(left + width, top),
			viewport.convertToPdfPoint(left, top + fontHeight),
			viewport.convertToPdfPoint(left + width, top + fontHeight)
		]);
		const text = normalizeItemText(item.str);
		return {
			text,
			rect: roundRect(rect),
			fontSize: Math.round(fontHeight * 100) / 100,
			baseline: tx[5],
			x0: left,
			x1: left + width,
			hasEOL: !!item.hasEOL
		};
	}

	function median(values) {
		const sorted = values.slice().sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
	}

	/**
	 * Runs sharing a baseline can belong to different columns: split them where
	 * the horizontal gap is much wider than a word space.
	 */
	function splitAtColumnGaps(runs) {
		const sorted = runs.slice().sort((a, b) => a.x0 - b.x0);
		const segments = [];
		let current = [];
		let right = -Infinity;
		let fontSize = 10;
		for (const run of sorted) {
			const threshold = Math.max(fontSize * 1.8, 16);
			if (current.length && run.x0 - right > threshold) {
				segments.push(current);
				current = [];
				right = -Infinity;
			}
			current.push(run);
			right = Math.max(right, run.x1);
			fontSize = Math.max(fontSize, run.fontSize || 10);
		}
		if (current.length) {
			segments.push(current);
		}
		return segments;
	}

	/**
	 * Group glyph runs into text lines.
	 * @param {Array} runs
	 * @returns {Array} lines sorted top-to-bottom
	 */
	function groupRunsIntoLines(runs) {
		const byBaseline = runs
			.filter(run => run.text !== '')
			.slice()
			.sort((a, b) => a.baseline - b.baseline);

		const groups = [];
		for (const run of byBaseline) {
			const tolerance = Math.max(1.5, run.fontSize * 0.38);
			let group = null;
			for (let i = groups.length - 1; i >= 0; i--) {
				const candidate = groups[i];
				if (Math.abs(candidate.baseline - run.baseline) <= tolerance) {
					group = candidate;
					break;
				}
				// Runs are sorted by baseline; once far away, stop scanning.
				if (run.baseline - candidate.baseline > run.fontSize * 3) {
					break;
				}
			}
			if (group) {
				group.runs.push(run);
				group.baseline = Math.max(group.baseline, run.baseline);
			}
			else {
				groups.push({ baseline: run.baseline, runs: [run] });
			}
		}

		const lines = [];
		for (const group of groups) {
			for (const items of splitAtColumnGaps(group.runs)) {
				if (!items.length) {
					continue;
				}
				const text = joinRunTexts(items);
				if (!text.trim()) {
					continue;
				}
				const rect = unionRect(items.map(item => item.rect));
				lines.push({
					text,
					rect: roundRect(rect),
					fontSize: Math.round(median(items.map(item => item.fontSize)) * 100) / 100,
					baseline: group.baseline,
					items
				});
			}
		}
		// Top of the page first (PDF space: larger y first).
		lines.sort((a, b) => b.rect[3] - a.rect[3] || a.rect[0] - b.rect[0]);
		return lines;
	}

	function joinRunTexts(items) {
		let out = '';
		let prev = null;
		for (const item of items) {
			if (prev) {
				const gap = item.x0 - prev.x1;
				const threshold = Math.max(0.9, Math.min(prev.fontSize, item.fontSize) * 0.24);
				const needsSpace = gap > threshold
					&& !/\s$/.test(out)
					&& !/^\s/.test(item.text);
				if (needsSpace) {
					out += ' ';
				}
			}
			out += item.text;
			prev = item;
		}
		return out.replace(/\s+$/g, '');
	}

	// ---------------------------------------------------------------- columns
	const SPAN_RATIO = 0.62;

	function detectColumns(lines) {
		if (lines.length < 4) {
			return { columns: 1, gutter: null, contentLeft: null, contentRight: null };
		}
		const lefts = lines.map(line => line.rect[0]);
		const rights = lines.map(line => line.rect[2]);
		const contentLeft = Math.min(...lefts);
		const contentRight = Math.max(...rights);
		const contentWidth = contentRight - contentLeft;
		if (contentWidth <= 0) {
			return { columns: 1, gutter: null, contentLeft, contentRight };
		}
		const mid = (contentLeft + contentRight) / 2;
		let rightStarts = 0;
		let leftStarts = 0;
		let spanning = 0;
		for (const line of lines) {
			const width = line.rect[2] - line.rect[0];
			if (width > contentWidth * SPAN_RATIO) {
				spanning++;
				continue;
			}
			if (line.rect[0] < mid - contentWidth * 0.06) {
				leftStarts++;
			}
			else if (line.rect[0] > mid - contentWidth * 0.02) {
				rightStarts++;
			}
		}
		const isTwoColumn = rightStarts >= Math.max(3, lines.length * 0.12)
			&& leftStarts >= Math.max(3, lines.length * 0.12);
		return {
			columns: isTwoColumn ? 2 : 1,
			gutter: mid,
			contentLeft,
			contentRight,
			contentWidth,
			spanning
		};
	}

	/**
	 * Build page-level blocks in human reading order.
	 */
	function orderLines(lines, columns, gutter, contentWidth) {
		if (columns === 1) {
			return [{ kind: 'column', lines }];
		}
		const left = [];
		const right = [];
		const spanning = [];
		for (const line of lines) {
			const width = line.rect[2] - line.rect[0];
			const crossesGutter = line.rect[0] < gutter - 4 && line.rect[2] > gutter + 4;
			const wide = contentWidth > 0 && width > contentWidth * SPAN_RATIO;
			if (crossesGutter || wide) {
				spanning.push(line);
				continue;
			}
			if (line.rect[0] < gutter) {
				left.push(line);
			}
			else {
				right.push(line);
			}
		}
		// Split the page into horizontal bands separated by full-width lines so
		// that a spanning title/abstract keeps its position in reading order.
		const bands = [];
		const sortedSpanning = spanning.slice().sort((a, b) => b.rect[3] - a.rect[3]);
		const all = left.concat(right).sort((a, b) => b.rect[3] - a.rect[3]);
		let cursor = 0;
		for (const line of sortedSpanning) {
			const band = { spanning: line, left: [], right: [] };
			while (cursor < all.length && all[cursor].rect[3] > line.rect[3]) {
				pushColumnLine(band, all[cursor], gutter);
				cursor++;
			}
			bands.push(band);
		}
		const tail = { spanning: null, left: [], right: [] };
		while (cursor < all.length) {
			pushColumnLine(tail, all[cursor], gutter);
			cursor++;
		}
		if (tail.left.length || tail.right.length) {
			bands.push(tail);
		}
		const blocks = [];
		for (const band of bands) {
			if (band.left.length) {
				blocks.push({ kind: 'column', lines: band.left });
			}
			if (band.spanning) {
				blocks.push({ kind: 'spanning', lines: [band.spanning] });
			}
			if (band.right.length) {
				blocks.push({ kind: 'column', lines: band.right });
			}
		}
		// Full-width lines arrive one block each. Merging the consecutive ones back
		// into a single flow is what lets the title, the authors and the abstract be
		// recognised as multi-line paragraphs instead of one paragraph per line.
		const merged = [];
		for (const block of blocks) {
			const previous = merged[merged.length - 1];
			if (previous && previous.kind === 'spanning' && block.kind === 'spanning') {
				previous.lines.push(...block.lines);
				continue;
			}
			merged.push({ kind: block.kind, lines: block.lines.slice() });
		}
		return merged;
	}

	function pushColumnLine(band, line, gutter) {
		if (line.rect[0] < gutter) {
			band.left.push(line);
		}
		else {
			band.right.push(line);
		}
	}

	// ------------------------------------------------------------- paragraphs
	function lineGap(prev, next) {
		// prev is above next
		return prev.rect[1] - next.rect[3];
	}

	/**
	 * Are these two stacked lines the same paragraph?
	 *
	 * Over-splitting was the biggest translation-quality problem: a paragraph
	 * broken into five fragments by a PDF's internal text runs becomes five
	 * half-sentence requests. The cues used here are the ones a reader uses —
	 * indentation, line spacing, whether the previous line ends a sentence, and
	 * whether the next line continues in lowercase.
	 */
	function isProbablySameParagraph(prev, next, medianHeight) {
		const gap = lineGap(prev, next);
		const sizeDelta = Math.abs(prev.fontSize - next.fontSize);
		// Superscripts and inline math shift the measured line height a little.
		if (sizeDelta > Math.max(1.2, medianHeight * 0.18)) {
			return false;
		}
		const prevText = String(prev.text || '').trimEnd();
		const nextText = String(next.text || '').trimStart();
		// A hyphenated word broken across lines is always a continuation.
		const hyphenated = /[A-Za-z]-$/.test(prevText) && /^[a-z]/.test(nextText);
		// A line that starts in lowercase (or with punctuation/closing bracket)
		// cannot start a paragraph.
		const softStart = /^[a-z,;:)\]}%]/.test(nextText);
		const prevEndsSentence = /[.!?。！？:：]\s*$/.test(prevText);
		const indent = next.rect[0] - prev.rect[0];

		// An indented first line always starts a new paragraph; so does a dedent
		// after a finished sentence.
		if (indent > Math.max(medianHeight * 1.4, 8)) {
			return false;
		}
		if (indent < -Math.max(medianHeight * 1.4, 8) && prevEndsSentence) {
			return false;
		}

		// A justified paragraph's last line stops short of the right edge.
		const prevStopsEarly = next.rect[2] - prev.rect[2] > medianHeight * 2.2;
		if (prevStopsEarly && !hyphenated && !softStart) {
			return false;
		}

		// Vertical spacing: same paragraph lines sit one line apart. Allow a little
		// slack when the next line clearly continues the sentence.
		const maxGap = prevEndsSentence || !(softStart || hyphenated)
			? medianHeight * 0.85
			: medianHeight * 1.5;
		// A line that does not finish its sentence continues on the next one even
		// when the line spacing is unusually large (double-spaced theses, figures
		// with a caption line in between): the text flow outranks the geometry, but
		// only inside the same column, so a two-column paper never interleaves.
		// A numbered or section-titled line begins something new even at body size:
		// gluing "2.1. Image-to-Image Translation" onto the paragraph above ruins the
		// heading and the paragraph at the same time.
		if ((hasNumbering(nextText) || SECTION_RE.test(nextText)) && nextText.length <= 70) {
			return false;
		}
		const prevLooksLikeIndex = /\s\d{1,4}$/.test(prevText) || /\.{2,}/.test(prevText);
		const continuingSentence = !prevEndsSentence
			&& Math.abs(prev.rect[0] - next.rect[0]) <= Math.max(medianHeight * 0.6, 4)
			&& gap <= medianHeight * 2.4
			&& !prevLooksLikeIndex
			// A capital-letter start only counts as a continuation when the previous
			// line is a full line of prose: a short line followed by a capital is a
			// section change, not a wrapped sentence.
			// A numbered/known section title is never the tail of a sentence.
			&& !hasNumbering(nextText) && !SECTION_RE.test(nextText)
			&& (softStart || (prevText.length > 60 && !/^[A-Z][a-z]+\s+[A-Z]/.test(nextText)));
		if (gap > maxGap && !continuingSentence) {
			return false;
		}
		// Overlapping or above-previous lines belong to another block.
		if (gap < -medianHeight * 0.6) {
			return false;
		}

		const leftDelta = Math.abs(prev.rect[0] - next.rect[0]);
		const sameColumn = leftDelta < Math.max(medianHeight * 1.6, 10);
		if (!sameColumn) {
			return leftDelta < Math.max(medianHeight * 3.2, 22) && gap <= medianHeight * 0.3;
		}
		return true;
	}

	function mergeLineTexts(lines) {
		let text = '';
		for (let i = 0; i < lines.length; i++) {
			const current = lines[i].text;
			if (i === 0) {
				text = current;
				continue;
			}
			const prev = lines[i - 1].text;
			const hyphenated = /[A-Za-z]-$/.test(prev) && /^[a-z]/.test(current.trim());
			if (hyphenated) {
				text = text.replace(/-$/, '') + current.replace(/^\s+/, '');
			}
			else if (/[A-Za-z]-$/.test(prev) && /^[A-Z]/.test(current.trim())) {
				// "IEEE-\nStandards" style: keep the hyphen but join without space.
				text += current.replace(/^\s+/, '');
			}
			else {
				const needsSpace = !/[\s\-/]$/.test(text) && !/^[\s,.;:)\]]/.test(current);
				text += (needsSpace ? ' ' : '') + current.replace(/^\s+/, '');
			}
		}
		return text.replace(/\s{2,}/g, ' ').trim();
	}

	function groupLinesIntoParagraphs(lines) {
		const paragraphs = [];
		if (!lines.length) {
			return paragraphs;
		}
		const medianHeight = median(lines.map(line => line.fontSize)) || 10;
		let bucket = [lines[0]];
		const flush = () => {
			if (bucket.length) {
				paragraphs.push(makeParagraph(bucket));
			}
			bucket = [];
		};
		for (let i = 1; i < lines.length; i++) {
			const prev = lines[i - 1];
			const current = lines[i];
			if (isProbablySameParagraph(prev, current, medianHeight)) {
				bucket.push(current);
			}
			else {
				flush();
				bucket = [current];
			}
		}
		flush();
		return paragraphs;
	}

	function makeParagraph(lines) {
		const rects = [];
		for (const line of lines) {
			rects.push(line.rect);
		}
		return {
			text: mergeLineTexts(lines),
			rects,
			rect: roundRect(unionRect(rects)),
			lines: lines.map(line => ({
				text: line.text,
				rect: line.rect,
				items: line.items.map(item => ({ text: item.text, rect: item.rect }))
			})),
			fontSize: Math.round(median(lines.map(line => line.fontSize)) * 100) / 100
		};
	}

	// ------------------------------------------------------- content typing
	// Papers are not a flat stream of prose: a TOC, table bodies, formulas and
	// running heads must never be translated (translated cells destroy the table
	// layout and translated page numbers read as garbage), while titles, section
	// headings, abstracts and captions must be. Everything below turns a page of
	// geometry into that judgement.

	const SECTION_RE = /^(?:\d+(?:\.\d+)*\.?\s*)?(abstract|introduction|background|related\s+work|preliminar|motivation|method|methods|approach|model|architecture|training|experiment|experiments|setup|results?|evaluation|analysis|ablation|discussion|limitations?|conclusion|future\s+work|references?|bibliography|appendix|acknowledg|摘要|引言|绪论|相关工作|方法|模型|实验|结果|评估|讨论|结论|参考文献|致谢)/i;
	const CAPTION_RE = /^\s*(fig(?:ure)?\.?|tab(?:le)?\.?|algorithm|listing|scheme|chart|图|表)\s*\.?\s*(?:\d+[.:]?)?\s*/i;
	const TABLE_CAPTION_RE = /^\s*(tab(?:le)?\.?|表)\s*\.?\s*(?:\d+[.:]?)?/i;
	const DOT_LEADER_RE = /(\.{3,}|…{2,})\s*\d{1,4}\s*$|\s{3,}\d{1,4}\s*$/;
	const MATH_CHARS_RE = /[=+×÷−∑∏∫√≤≥≈∝∈∂∇∞αβγδεζηθικλμνξπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ^_{}|<>→←↔]/g;
	const NUM_TOKEN_RE = /[-+]?\d+(?:[.,]\d+)?%?/g;

	function textStats(text) {
		const source = String(text || '');
		const letters = (source.match(/[A-Za-z\u4e00-\u9fff]/g) || []).length;
		const digits = (source.match(/\d/g) || []).length;
		const math = (source.match(MATH_CHARS_RE) || []).length;
		const numbers = (source.match(NUM_TOKEN_RE) || []).length;
		const words = (source.match(/[A-Za-z\u4e00-\u9fff]+/g) || []).length;
		const len = source.length || 1;
		return {
			length: source.length,
			letters,
			digits,
			math,
			numbers,
			words,
			digitRatio: digits / len,
			mathRatio: math / len,
			letterRatio: letters / len
		};
	}

	/**
	 * Font tiers, weighted by the amount of text set in each size.
	 *
	 * The most-used size is the body; the distinct sizes above it become h1/h2/h3.
	 * A heading level from this map is far steadier than a fixed ratio: papers set
	 * 11 pt body with 11.5 pt captions, and a bare ratio turns those into headings.
	 */
	function fontTiers(paragraphs) {
		const weights = new Map();
		for (const paragraph of paragraphs) {
			const size = Math.round((paragraph.fontSize || 0) * 10) / 10;
			if (!size) {
				continue;
			}
			weights.set(size, (weights.get(size) || 0) + Math.max(1, (paragraph.text || '').length));
		}
		if (!weights.size) {
			return { body: 10 };
		}
		const ranked = [...weights.entries()].sort((a, b) => b[1] - a[1]);
		const body = ranked[0][0];
		const larger = [...weights.keys()].filter(size => size > body + 1).sort((a, b) => b - a);
		const tiers = { body };
		if (larger[0] !== undefined) {
			tiers.h1 = larger[0];
		}
		if (larger[1] !== undefined) {
			tiers.h2 = larger[1];
		}
		if (larger[2] !== undefined) {
			tiers.h3 = larger[2];
		}
		return tiers;
	}

	/** Which tier a size belongs to: 1/2/3 for headings, 0 for body-sized text. */
	function tierOf(size, tiers) {
		if (!size || !tiers) {
			return 0;
		}
		if (tiers.h1 !== undefined && size >= tiers.h1 - 0.6) {
			return 1;
		}
		if (tiers.h2 !== undefined && size >= tiers.h2 - 0.6) {
			return 2;
		}
		if (tiers.h3 !== undefined && size >= tiers.h3 - 0.6) {
			return 3;
		}
		return 0;
	}

	/** Median font size of the running prose, weighted by how much text it carries. */
	function bodyFontSize(paragraphs) {
		const weighted = [];
		for (const paragraph of paragraphs) {
			const weight = Math.min(4, Math.max(1, Math.round((paragraph.text || '').length / 140)));
			for (let i = 0; i < weight; i++) {
				weighted.push(paragraph.fontSize || 10);
			}
		}
		return median(weighted) || 10;
	}

	function looksLikeFormula(text, stats) {
		if (stats.mathRatio >= 0.14 && stats.letterRatio < 0.72) {
			return true;
		}
		if (/^\s*\\(begin|frac|sum|int)|\\[a-zA-Z]+\{|\\\(|\\\[/.test(text)) {
			return true;
		}
		// An equation followed by its number: "= softmax(QK^T / √d)    (2)"
		if (/\(\s*\d{1,3}\s*\)\s*$/.test(text) && stats.mathRatio >= 0.05 && stats.words <= 12) {
			return true;
		}
		return false;
	}

	function looksLikeTableRow(paragraph, stats) {
		if (stats.numbers >= 4 && stats.letterRatio < 0.6) {
			return true;
		}
		if (stats.numbers >= 3 && stats.digitRatio > 0.18) {
			return true;
		}
		// Wide, repeated internal gaps are table columns: several runs per line
		// separated by much more than a word space.
		let wideGaps = 0;
		for (const line of paragraph.lines || []) {
			const items = line.items || [];
			for (let i = 1; i < items.length; i++) {
				const gap = items[i].rect[0] - items[i - 1].rect[2];
				if (gap > (paragraph.fontSize || 10) * 2.4) {
					wideGaps++;
				}
			}
		}
		return wideGaps >= 2 && stats.words >= 3;
	}

	function isTocLine(text) {
		const trimmed = text.trim();
		if (!trimmed) {
			return false;
		}
		if (DOT_LEADER_RE.test(trimmed) || /^\s*(contents|table of contents|目\s*录)\s*$/i.test(trimmed)) {
			return true;
		}
		// "3 Pre-Training 11", "B DeepSeek-V2-Lite: A 16B Model 29" — a numbered or
		// lettered entry that ends with a page number. Short and prefix-anchored, so a
		// body sentence that merely ends with a year is not caught.
		if (trimmed.length > 90) {
			return false;
		}
		if (!/^(?:\d+(?:\.\d+)*|[A-Z]|[IVX]{1,4})\.?\s+\S/.test(trimmed)) {
			return false;
		}
		return /\s\d{1,4}\s*$/.test(trimmed);
	}

	/** A numbering prefix makes a terminal period acceptable: "1. Introduction". */
	function hasNumbering(text) {
		return /^\d+(?:\.\d+)*\.?\s+[A-Z\u4e00-\u9fff]/.test(text)
			|| /^[A-Z]\.\s+[A-Z]/.test(text)
			|| /^第[一二三四五六七八九十\d]+[章节部分]/.test(text);
	}

	/**
	 * A heading is short, starts like a title and does not end like a sentence.
	 * The strict rules come from the pdf_to_md converter: without them a 9-word
	 * caption or a table label at heading size becomes a "section heading", and
	 * headings are translated differently from prose.
	 */
	function looksLikeHeading(text) {
		const trimmed = text.trim();
		if (!trimmed || trimmed.length > 80) {
			return false;
		}
		const words = (trimmed.match(/[A-Za-z\u4e00-\u9fff]+/g) || []).length;
		if (words > 16) {
			return false;
		}
		// A complete sentence never is one, unless it carries a section number.
		if (/[.。!！?？]$/.test(trimmed) && !hasNumbering(trimmed)) {
			return false;
		}
		if (/[,;，；]$/.test(trimmed)) {
			return false;
		}
		const stats = textStats(trimmed);
		if (stats.letterRatio < 0.55) {
			return false;
		}
		return /^[A-Z0-9\u4e00-\u9fff\u2160-\u217f]/.test(trimmed);
	}

	/** A fragment of a figure or table: "Mistral 7B", "training costs", axis labels. */
	function looksLikeFragment(text, stats) {
		const trimmed = text.trim();
		if (trimmed.length >= 46) {
			return false;
		}
		if (/[.!?。！？]\s*$/.test(trimmed)) {
			return false;
		}
		if (stats.digits >= 2) {
			return true;
		}
		return stats.words <= 6 && trimmed.length <= 30;
	}

	/**
	 * Decide what a paragraph is. `ctx` carries the page-level picture: the body
	 * font size, whether this is the first page, a TOC page, and whether the
	 * paragraph sits inside the abstract.
	 */
	function classifyParagraph(paragraph, ctx, tiers) {
		const text = String(paragraph.text || '');
		const trimmed = text.trim();
		const stats = textStats(text);
		const fontSize = paragraph.fontSize || ctx.bodySize;
		const lower = trimmed.toLowerCase();
		const pageTop = paragraph.rect ? Math.max(0, ctx.pageHeight - paragraph.rect[3]) : 0;
		const pageBottom = paragraph.rect ? Math.max(0, paragraph.rect[1]) : 0;
		const sizeRatio = fontSize / (ctx.bodySize || fontSize || 1);

		if (!trimmed) {
			return { role: 'empty', translatable: false };
		}
		if (isTocLine(text) || ctx.tocPage) {
			return { role: 'toc', translatable: false };
		}
		// Running heads and footers hug the page edges in small type.
		const inEdgeBand = pageTop < ctx.pageHeight * 0.055 || pageBottom < ctx.pageHeight * 0.05;
		if (inEdgeBand && (sizeRatio < 0.92 || stats.length < 60)) {
			return { role: 'pageNoise', translatable: false };
		}
		if (looksLikeFormula(text, stats)) {
			return { role: 'formula', translatable: false };
		}
		const tableRow = looksLikeTableRow(paragraph, stats);
		if (CAPTION_RE.test(trimmed) && stats.length < 400 && (!tableRow || stats.numbers <= 3)) {
			return {
				role: TABLE_CAPTION_RE.test(trimmed) ? 'table-caption' : 'figure-caption',
				translatable: true
			};
		}
		if (tableRow) {
			return { role: 'table', translatable: false };
		}
		if (/^\s*(arxiv|doi|issn|isbn|copyright|©|received|accepted|published|under review)\b/i.test(lower)) {
			return { role: 'meta', translatable: false };
		}
		if (/^\s*(keywords?|index terms|关键词)/i.test(lower)) {
			return { role: 'keywords', translatable: true };
		}

		// "80 DeepSeek-V2" or "Training Costs (K GPU Hours/T Tokens)" sit inside a
		// figure: short, no sentence, not a sentence-cased heading.
		// Axis labels, table cells and legal footers are set smaller than the body.
		if (sizeRatio < 0.9) {
			return { role: 'figure-data', translatable: false };
		}
		if (looksLikeFragment(trimmed, stats) && !SECTION_RE.test(trimmed)
			&& !/^\d{1,2}(?:\.\d{1,2}){0,3}\.?\s+[A-Z\u4e00-\u9fff]/.test(trimmed)
			&& !/^[A-Z][a-z]+(?:\s+[A-Z]\w+)+$/.test(trimmed)) {
			return { role: 'figure-data', translatable: false };
		}
		const numberedHeading = /^\d{1,2}(?:\.\d{1,2}){0,3}\.?\s+[A-Z][a-z]+(?:\s+[A-Za-z][a-z]*)*\.?$/.test(trimmed);
		const sectionish = SECTION_RE.test(trimmed) || numberedHeading;
		const tier = tiers ? tierOf(fontSize, tiers) : 0;
		if ((sectionish || sizeRatio >= 1.15 || tier > 0) && looksLikeHeading(trimmed)) {
			return { role: 'heading', translatable: true, level: tier || (sectionish ? 2 : 1) };
		}

		if (ctx.isFirstPage && ctx.topBand && !ctx.seenBody) {
			if ((sizeRatio >= 1.3 || tier === 1) && stats.length <= 260) {
				return { role: 'title', translatable: true, level: 1 };
			}
			const affiliation = /@|universit|institut|department|laborator|college|school|academy|research/i.test(text);
			if (stats.length <= 220 && affiliation && (sizeRatio >= 1.0 || /@/.test(text))) {
				return { role: 'author', translatable: false };
			}
		}
		if (pageBottom < ctx.pageHeight * 0.16 && sizeRatio < 0.9) {
			return { role: 'footnote', translatable: false };
		}
		if (ctx.inAbstract && (stats.length >= 60 || /^\s*(abstract|摘要)/i.test(lower))) {
			return { role: 'abstract', translatable: true };
		}
		if (looksLikeFragment(trimmed, stats)) {
			return { role: 'figure-data', translatable: false };
		}
		return { role: 'body', translatable: true };
	}

	const CONTINUATION_END_RE = /[.!?。！？:：;；]\s*["'”’)\]]?\s*$/;

	/** Does this paragraph end a sentence (so it cannot continue over the page)? */
	function endsSentence(text) {
		return CONTINUATION_END_RE.test(String(text || '').trim());
	}

	/** A caption is prose too, and its second line often lands on its own. */
	function isCaption(paragraph) {
		const role = paragraph?.role;
		return role === 'figure-caption' || role === 'table-caption';
	}

	/** Can a paragraph run on to the next page? Only running prose can. */
	function canContinued(paragraph) {
		if (!paragraph || paragraph.translatable === false) {
			return false;
		}
		const role = paragraph.role || 'body';
		return role === 'body' || role === 'abstract' || role === 'keywords';
	}

	/**
	 * Join paragraphs that the page break cut in half.
	 *
	 * A paragraph that ends at the bottom of page N and resumes at the top of page
	 * N+1 is one thought; translating the halves separately produces two broken
	 * sentences. The merged paragraph keeps the first page's geometry for the
	 * primary lookup and gains a `continuation` entry plus a shadow paragraph on the
	 * following page, so hovering either half highlights the same card.
	 *
	 * @param {Object[]} pages pages from `buildPage`, already annotated
	 * @returns {Object[]} the canonical paragraph list
	 */
	function mergeBrokenSentences(pages) {
		// Pass 1 — inside a page, a sentence that runs from the bottom of one column
		// into the top of the next arrives as two paragraphs. Join them when nothing
		// (figure, table, heading) sits between and the second half starts mid-sentence.
		for (const page of pages) {
			const paragraphs = page.paragraphs || [];
			for (let i = paragraphs.length - 2; i >= 0; i--) {
				const current = paragraphs[i];
				const next = paragraphs[i + 1];
				// A caption absorbs its own continuation line, otherwise the tail of the
				// caption becomes a "paragraph" right under the figure.
				const captionTail = isCaption(current) && canContinued(next);
				if (!captionTail && (!canContinued(current) || !canContinued(next))) {
					continue;
				}
				if (endsSentence(current.text)) {
					continue;
				}
				const startsLower = /^[a-zà-ÿ,;:)\]}]/.test(next.text.trim());
				if (!startsLower) {
					continue;
				}
				const hyphenated = /[A-Za-z]-$/.test(current.text.trim());
				current.text = (hyphenated
					? `${current.text.replace(/-$/, '')}${next.text.trim()}`
					: `${current.text.trim()} ${next.text.trim()}`).replace(/\s{2,}/g, ' ').trim();
				current.rects = (current.rects || []).concat(next.rects || []);
				current.rect = unionRect(current.rects);
				current.lines = (current.lines || []).concat(next.lines || []);
				current.joined = (current.joined || 0) + 1;
				paragraphs.splice(i + 1, 1);
			}
		}

		// Pass 2 — one carry across the whole document: a sentence that runs over two page
		// breaks keeps collecting, and each half becomes a shadow on its own page so
		// hovering it highlights the same card.
		let carry = null;
		for (const page of pages) {
			const paragraphs = page.paragraphs || [];
			if (!paragraphs.length) {
				continue;
			}
			let first = 0;
			while (first < paragraphs.length && !canContinued(paragraphs[first])) {
				first++;
			}
			const head = paragraphs[first];
			// The continuation must be the *first* prose at the top of the page, in the
			// left column. Without this, a two-column page hands back a paragraph from
			// the middle of the right column and the sentence gets a nonsense ending.
			const pageWidth = page.width || 600;
			// The continuation is the first prose on the page, at the start of a column.
			// A figure may occupy the top of the page, so vertical position is not a
			// usable test — reading order plus column start is.
			const headAtColumnStart = !!head && (head.rect?.[0] ?? pageWidth) <= pageWidth * 0.6;
			// …and the sentence has to actually be unfinished: a lowercase start, or a
			// hanging function word at the end of the carried text.
			const HANGING_RE = /\b(and|or|of|in|to|the|a|an|with|for|by|as|that|which|who|is|are|was|were|be|been|being|we|our|it|its|their|this|these|those|from|on|at|than|while|but|so|into|over|under|between|among|via)$/i;
			const headContinues = (head && /^[a-zà-ÿ,;:)\]}]/.test(head.text.trim()))
				|| HANGING_RE.test(carry?.text.trim() || '');
			if (carry && head && headAtColumnStart && headContinues) {
				const startsLower = /^[a-zà-ÿ,;:)\]}]/.test(head.text.trim());
				const sameSize = !head.fontSize || !carry.fontSize || head.fontSize <= carry.fontSize * 1.05;
				if (startsLower || sameSize) {
					const hyphenated = /[A-Za-z]-$/.test(carry.text.trim());
					carry.text = (hyphenated
						? `${carry.text.replace(/-$/, '')}${head.text.trim()}`
						: `${carry.text.trim()} ${head.text.trim()}`).replace(/\s{2,}/g, ' ').trim();
					carry.continuation = (carry.continuation || []).concat([{
						pageIndex: head.pageIndex,
						rects: head.rects,
						lines: head.lines,
						text: head.text
					}]);
					paragraphs[first] = {
						id: carry.id,
						pageIndex: head.pageIndex,
						rects: head.rects,
						rect: head.rect,
						bbox: head.bbox || head.rect,
						lines: head.lines,
						text: head.text,
						fontSize: head.fontSize,
						role: carry.role,
						translatable: carry.translatable,
						level: carry.level || 0,
						shadow: true,
						continuationOf: carry.id
					};
					// Finished the sentence? Then the paragraph really ends here.
					carry = endsSentence(carry.text) ? null : carry;
				}
				else {
					carry = null;
				}
			}
			// Only the paragraph nearest the page end can bleed into the next page.
			// A carried paragraph still unfinished stays the carry (its remaining text
			// is this page's last one), otherwise the unfinished tail takes over.
			let last = paragraphs.length - 1;
			while (last >= 0 && !canContinued(paragraphs[last])) {
				last--;
			}
			const tail = paragraphs[last];
			const tailUnfinished = tail && !tail.shadow && !endsSentence(tail.text);
			if (tailUnfinished) {
				carry = tail;
			}
			else if (carry && endsSentence(carry.text)) {
				carry = null;
			}
		}
		return pages;
	}

	/**
	 * Annotate every paragraph of a document with `role` and `translatable`.
	 * `pages` is the array produced by `buildPage`; the result also flags the
	 * repeated running heads that only become visible across pages.
	 */
	function annotateDocument(pages) {
		const all = [];
		for (const page of pages) {
			for (const paragraph of page.paragraphs) {
				all.push(paragraph);
			}
		}
		const tiers = fontTiers(all);
		const bodySize = tiers.body || bodyFontSize(all);
		const byPage = pages.map(page => page.paragraphs);

		// Running heads and footers: exact repeated blocks in the page margins. Two
		// keys are counted — the text itself (a fixed header) and the text with digits
		// blanked (a header carrying the page number) — over a sample of the first and
		// last pages, and only text inside the top/bottom band can be noise.
		const sampleIndexes = pages.length > 40
			? [...Array(20).keys(), ...pages.length - 20 + [...Array(20).keys()]]
			: pages.map((unused, index) => index);
		const pageHeightOf = index => pages[index]?.height || 800;
		const inMarginBand = (paragraph, pageIndex) => {
			const height = pageHeightOf(pageIndex);
			const top = paragraph.rect ? Math.max(0, height - paragraph.rect[3]) : 0;
			const bottom = paragraph.rect ? Math.max(0, paragraph.rect[1]) : 0;
			return top < height * 0.11 || bottom < height * 0.1;
		};
		const marginCounts = new Map();
		const marginTotal = new Map();
		for (const index of sampleIndexes) {
			const seenOnPage = new Set();
			for (const paragraph of byPage[index] || []) {
				if (!inMarginBand(paragraph, index)) {
					continue;
				}
				const key = String(paragraph.text || '').toLowerCase().replace(/\s+/g, ' ').trim();
				if (key.length < 3) {
					continue;
				}
				const normalized = key.replace(/\d+/g, '#');
				for (const variant of [key, normalized]) {
					if (seenOnPage.has(variant)) {
						continue;
					}
					seenOnPage.add(variant);
					marginCounts.set(variant, (marginCounts.get(variant) || 0) + 1);
				}
			}
			for (const variant of seenOnPage) {
				marginTotal.set(variant, (marginTotal.get(variant) || 0) + 1);
			}
		}
		const sampledPages = Math.max(1, sampleIndexes.length);
		const repeated = new Set();
		for (const [key, count] of marginCounts) {
			if (count / sampledPages > 0.6) {
				repeated.add(key);
			}
		}
		// Only text that hugs the top or bottom edge can be a running head: a body
		// paragraph that merely repeats (a template sentence, "Table" numbering)
		// must survive.
		const isEdgeParagraph = (paragraph, page) => {
			const height = page?.height || 800;
			const top = paragraph.rect ? Math.max(0, height - paragraph.rect[3]) : 0;
			const bottom = paragraph.rect ? Math.max(0, paragraph.rect[1]) : 0;
			return top < height * 0.09 || bottom < height * 0.08;
		};

		for (let pageIndex = 0; pageIndex < byPage.length; pageIndex++) {
			const paragraphs = byPage[pageIndex];
			// A title usually arrives as two or three stacked lines of the same big
			// font: merge them so the title is translated (and shown) as one unit.
			if (pageIndex === 0 && paragraphs.length > 1) {
				for (let i = paragraphs.length - 2; i >= 0; i--) {
					const current = paragraphs[i];
					const next = paragraphs[i + 1];
					const big = (current.fontSize || bodySize) >= bodySize * 1.25
						&& (next.fontSize || bodySize) >= bodySize * 1.25;
					const close = Math.abs((current.rect?.[3] ?? 0) - (next.rect?.[3] ?? 0)) < bodySize * 6;
					if (big && close && current.text.length < 200) {
						current.text = `${current.text} ${next.text}`.replace(/\s+/g, ' ').trim();
						current.rects = (current.rects || []).concat(next.rects || []);
						current.rect = unionRect([...(current.rects || []), ...(next.rects || [])]);
						current.lines = (current.lines || []).concat(next.lines || []);
						paragraphs.splice(i + 1, 1);
					}
				}
			}
			// A wrapped heading arrives as two stacked paragraphs ("Agent Tools &" /
			// "Interoperability"). Merging them keeps one heading, one translation.
			for (let i = paragraphs.length - 2; i >= 0; i--) {
				const current = paragraphs[i];
				const next = paragraphs[i + 1];
				const sizeA = current.fontSize || bodySize;
				const sizeB = next.fontSize || bodySize;
				const sameSize = Math.abs(sizeA - sizeB) <= 0.6;
				const bodyLevel = sizeA >= bodySize * 0.98;
				const shortFirst = current.text.trim().length < 70 && !/[.。!！?？:：;；]$/.test(current.text.trim());
				const gapBelow = (current.rect?.[1] ?? 0) - (next.rect?.[3] ?? 0);
				const adjacent = gapBelow <= sizeA * 1.4 && gapBelow >= -sizeA * 0.4;
				if (sameSize && bodyLevel && shortFirst && adjacent) {
					current.text = `${current.text.trim()} ${next.text.trim()}`.replace(/\s+/g, ' ').trim();
					current.rects = (current.rects || []).concat(next.rects || []);
					current.rect = unionRect(current.rects);
					current.lines = (current.lines || []).concat(next.lines || []);
					paragraphs.splice(i + 1, 1);
				}
			}
			const page = pages[pageIndex];
			const isFirstPage = pageIndex === 0;
			// A table of contents is a whole page of "1 Introduction 4" lines: none of
			// it should be translated, and treating it as prose derails the summary.
			const numberedLines = paragraphs.filter(candidate => /\.{3,}\s*\d{1,4}\s*$|\s{2,}\d{1,4}\s*$/.test(candidate.text)
				&& candidate.text.length <= 90).length;
			const tocPage = paragraphs.slice(0, 6).some(candidate => /^\s*(contents|table of contents|目\s*录)\s*$/i.test(candidate.text.trim()))
				|| numberedLines >= 4;
			let inAbstract = false;
			let seenBody = false;
			for (let i = 0; i < paragraphs.length; i++) {
				const paragraph = paragraphs[i];
				const ctx = {
					bodySize,
					pageHeight: page.height || 800,
					isFirstPage,
					tocPage: tocPage && pageIndex > 0
						? true
						: tocPage && !/^(abstract|摘要)/i.test(paragraph.text.trim()),
					inAbstract,
					seenBody,
					topBand: isFirstPage && i < 6
				};
				const verdict = classifyParagraph(paragraph, ctx, tiers);
				const key = String(paragraph.text || '').toLowerCase().replace(/\s+/g, ' ').trim();
				const normalizedKey = key.replace(/\d+/g, '#');
				const repeatedNoise = (repeated.has(key) || repeated.has(normalizedKey)) && isEdgeParagraph(paragraph, page);
				paragraph.role = repeatedNoise ? 'pageNoise' : verdict.role;
				paragraph.translatable = repeatedNoise ? false : verdict.translatable;
				paragraph.level = verdict.level || 0;
				if (paragraph.role === 'heading') {
					inAbstract = /^(abstract|摘要)\b/i.test(paragraph.text.trim());
				}
				if (paragraph.role === 'body' || paragraph.role === 'figure-caption' || paragraph.role === 'table-caption') {
					seenBody = true;
					inAbstract = false;
				}
			}
		}
		return { bodySize, tiers, pages: byPage };
	}

	// -------------------------------------------------------------- page build
	const REFERENCES_RE = /^\s*(?:\d+\.?\s*)?(references|bibliography|literature cited|参考文献)\s*$/i;
	const NOISE_RE = /^[\s\d\W]{0,}$/;

	function isNoise(text) {
		const trimmed = text.trim();
		if (trimmed.length < 3) {
			return true;
		}
		if (NOISE_RE.test(trimmed)) {
			return true;
		}
		const letters = (trimmed.match(/[A-Za-z\u4e00-\u9fff]/g) || []).length;
		if (letters / trimmed.length < 0.45) {
			return true;
		}
		return false;
	}

	/**
	 * Build the structure for a single page.
	 * @param {Object[]} items - pdf.js text items (`getTextContent().items`)
	 * @param {{view:number[], rotation:number}} pageInfo
	 * @param {number} pageIndex
	 * @param {Object} [options]
	 */
	function buildPage(items, pageInfo, pageIndex, options = {}) {
		const viewport = makeViewport({ view: pageInfo.view, rotation: pageInfo.rotation || 0, scale: 1 });
		const runs = [];
		for (const item of items) {
			if (!item || typeof item.str !== 'string') {
				continue;
			}
			const run = toRun(item, viewport);
			if (run && run.text.trim() !== '' || (run && /\s/.test(run.text))) {
				runs.push(run);
			}
		}
		const lines = groupRunsIntoLines(runs);
		const columnInfo = detectColumns(lines);
		const { columns, gutter, contentWidth } = columnInfo;
		const blocks = orderLines(lines, columns, gutter, contentWidth);
		const paragraphs = [];
		let stoppedAtReferences = false;
		for (const block of blocks) {
			for (const paragraph of groupLinesIntoParagraphs(block.lines)) {
				if (isNoise(paragraph.text)) {
					continue;
				}
				if (options.stopAtReferences && REFERENCES_RE.test(paragraph.text)) {
					stoppedAtReferences = true;
					break;
				}
				paragraphs.push({
					...paragraph,
					pageIndex,
					index: paragraphs.length
				});
			}
			if (stoppedAtReferences) {
				break;
			}
		}
		return {
			pageIndex,
			width: viewport.width,
			height: viewport.height,
			view: pageInfo.view,
			rotation: pageInfo.rotation || 0,
			columns,
			lines: lines.map(line => ({
				text: line.text,
				rect: line.rect,
				fontSize: line.fontSize,
				items: line.items.map(item => ({ text: item.text, rect: item.rect }))
			})),
			paragraphs,
			stoppedAtReferences
		};
	}

	M.Layout = {
		transform,
		applyInverseTransform,
		makeViewport,
		toRun,
		groupRunsIntoLines,
		splitAtColumnGaps,
		groupLinesIntoParagraphs,
		detectColumns,
		orderLines,
		mergeLineTexts,
		buildPage,
		annotateDocument,
		mergeBrokenSentences,
		mergePageBreaks: mergeBrokenSentences,
		endsSentence,
		classifyParagraph,
		fontTiers,
		tierOf,
		bodyFontSize,
		isNoise,
		unionRect,
		roundRect,
		REFERENCES_RE
	};
})();
