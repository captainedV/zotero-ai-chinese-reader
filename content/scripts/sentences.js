/**
 * Sentence segmentation tuned for academic English (and tolerant of Chinese).
 *
 * The goal is not linguistic perfection: segments are the units that get
 * translated and cross-highlighted, so they must (a) cover the paragraph text
 * losslessly and (b) break at real sentence boundaries.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	// Abbreviations that should not terminate a sentence.
	const ABBREVIATIONS = new Set([
		'al', 'fig', 'figs', 'eq', 'eqs', 'ref', 'refs', 'sec', 'secs', 'tab', 'tabs',
		'no', 'nos', 'vs', 'cf', 'ca', 'approx', 'resp', 'dr', 'prof', 'mr', 'mrs', 'ms',
		'st', 'jr', 'sr', 'inc', 'ltd', 'co', 'corp', 'dept', 'univ', 'inst', 'e.g', 'i.e',
		'ie', 'eg', 'etc', 'vol', 'vols', 'pp', 'p', 'ch', 'chap', 'ed', 'eds', 'engl',
		'fig', 'min', 'max', 'avg', 'std', 'def', 'prob', 'thm', 'lem', 'cor', 'rem',
		'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
		'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'u.s', 'u.k', 'e.u', 'a.m', 'p.m'
	]);

	/** Last whitespace-delimited token ending at `index` (inclusive). */
	function trailingWord(text, index) {
		const start = Math.max(0, text.lastIndexOf(' ', index) + 1);
		return text.slice(start, index + 1);
	}

	function isAbbreviation(word) {
		if (!word) {
			return false;
		}
		const lower = word.toLowerCase()
			.replace(/^[(\["'`]+/, '')
			.replace(/[)\]}.'"`]+$/, '');
		if (!lower) {
			return false;
		}
		if (ABBREVIATIONS.has(lower)) {
			return true;
		}
		// Single capital letter (initials): "J. Smith", "R. S. Sutton"
		if (/^[A-Z]$/.test(lower)) {
			return true;
		}
		// Multi-part abbreviations such as "e.g.", "i.e.", "Ph.D.", "U.S.A."
		if ((lower.match(/\./g) || []).length >= 1 && /^[a-z](\.[a-z])+$/.test(lower)) {
			return true;
		}
		return false;
	}

	/**
	 * Split text into sentence segments.
	 * @param {string} text
	 * @returns {Array<{text:string, start:number, end:number}>}
	 */
	function split(text) {
		const source = String(text || '');
		if (!source.trim()) {
			return [];
		}
		const segments = [];
		let start = 0;
		let i = 0;
		const push = (end) => {
			const raw = source.slice(start, end);
			const trimmedStart = raw.length - raw.replace(/^\s+/, '').length;
			const trimmed = raw.trim();
			if (trimmed) {
				segments.push({
					text: trimmed,
					start: start + trimmedStart,
					end: start + trimmedStart + trimmed.length
				});
			}
			start = end;
		};

		while (i < source.length) {
			const ch = source[i];
			// CJK terminators always end a sentence.
			if (ch === '\u3002' || ch === '\uFF01' || ch === '\uFF1F') {
				i++;
				// Eat following closing quotes/brackets and spaces.
				while (i < source.length && /["'”’）)\]】\s]/.test(source[i])) {
					if (/\s/.test(source[i]) && !/[”’）)\]]/.test(source[i - 1] || '')) {
						break;
					}
					i++;
				}
				push(i);
				continue;
			}
			if (ch === '.' || ch === '!' || ch === '?') {
				// Decimal numbers, version strings, URLs: "0.94", "v1.2"
				const next = source[i + 1] || '';
				const prev = source[i - 1] || '';
				if (ch === '.' && /\d/.test(prev) && /\d/.test(next)) {
					i++;
					continue;
				}
				let j = i + 1;
				// Consume closing quotes / brackets that belong to the sentence.
				while (j < source.length && /["'”’）)\]]/.test(source[j])) {
					j++;
				}
				if (j >= source.length) {
					push(source.length);
					i = source.length;
					continue;
				}
				if (!/\s/.test(source[j])) {
					// e.g. "e.g.x" or "Fig.3" — not a boundary.
					i++;
					continue;
				}
				// Skip whitespace to look at the next word.
				let k = j;
				while (k < source.length && /\s/.test(source[k])) {
					k++;
				}
				const nextChar = source[k] || '';
				// A lowercase continuation can still start a sentence in academic text
				// ("... state-of-the-art. our method ..." is rare), so require a capital
				// letter, a digit, an opening quote/bracket or CJK.
				const looksLikeSentenceStart = /[A-Z0-9"'“‘（(\[\u4e00-\u9fff]/.test(nextChar);
				if (ch === '.' && isAbbreviation(trailingWord(source, i))) {
					i++;
					continue;
				}
				if (looksLikeSentenceStart) {
					push(j);
					i = j;
					continue;
				}
				i++;
				continue;
			}
			i++;
		}
		if (start < source.length) {
			push(source.length);
		}
		return segments;
	}

	/**
	 * Split a paragraph into sentence records that keep their paragraph context.
	 * @param {{id:string, text:string, pageIndex:number}} paragraph
	 */
	function splitParagraph(paragraph) {
		const parts = split(paragraph.text);
		if (parts.length <= 1) {
			return [{
				id: `${paragraph.id}:0`,
				paragraphId: paragraph.id,
				pageIndex: paragraph.pageIndex,
				index: 0,
				text: paragraph.text.trim(),
				count: 1
			}];
		}
		return parts.map((part, index) => ({
			id: `${paragraph.id}:${index}`,
			paragraphId: paragraph.id,
			pageIndex: paragraph.pageIndex,
			index,
			text: part.text,
			count: parts.length
		}));
	}

	/**
	 * Map a character range inside a paragraph back to the sentence records that
	 * intersect it (used when translating per paragraph but highlighting a quote).
	 */
	function sentencesInRange(paragraphText, segments, from, to) {
		return segments.filter(segment => segment.start < to && segment.end > from);
	}

	M.Sentences = { split, splitParagraph, sentencesInRange, isAbbreviation, trailingWord };
})();
