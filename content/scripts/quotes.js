/**
 * Maps a verbatim quote produced by the model back onto PDF geometry.
 *
 * Highlight annotations need rects in PDF user space, so this module walks the
 * extracted document model (paragraph -> line -> glyph run) and returns the
 * exact boxes for the quoted span, with line-precise partial highlighting for
 * the first and last line of a multi-line quote.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	const CHAR_MAP = [
		[/[\u2018\u2019\u201B]/g, "'"],
		[/[\u201C\u201D\u201F]/g, '"'],
		[/[\u2010-\u2015\u2212]/g, '-'],
		[/\uFB01/g, 'fi'],
		[/\uFB02/g, 'fl'],
		[/\uFB00/g, 'ff'],
		[/\uFB03/g, 'ffi'],
		[/\uFB04/g, 'ffl'],
		[/\u00A0/g, ' '],
		[/\u00AD/g, '']
	];

	function normalizeCharMap(text) {
		let out = String(text || '');
		for (const [re, rep] of CHAR_MAP) {
			out = out.replace(re, rep);
		}
		return out.replace(/\s+/g, ' ').trim();
	}

	function normalize(text) {
		return normalizeCharMap(text).toLowerCase();
	}

	/**
	 * Build a per-paragraph index: normalized text plus, for every normalized
	 * character, the index of the line it came from and its relative position
	 * within that line.
	 */
	function indexParagraph(paragraph) {
		const lines = paragraph.lines || [];
		const lineNorms = lines.map(line => normalize(line.text));
		const fullText = normalize(paragraph.text);
		const lineOfChar = new Int32Array(fullText.length);
		const lineProgress = new Float32Array(fullText.length);
		lineOfChar.fill(-1);

		let cursor = 0;
		for (let li = 0; li < lineNorms.length; li++) {
			let needle = lineNorms[li].replace(/-$/, '').trim();
			if (!needle) {
				continue;
			}
			const found = fullText.indexOf(needle, cursor);
			if (found === -1) {
				// The merged paragraph text may have dropped a hyphen differently;
				// try progressively shorter prefixes so progress still advances.
				const short = needle.slice(0, Math.max(12, Math.floor(needle.length * 0.6)));
				const foundShort = fullText.indexOf(short, cursor);
				if (foundShort === -1) {
					continue;
				}
				for (let i = 0; i < needle.length && foundShort + i < fullText.length; i++) {
					lineOfChar[foundShort + i] = li;
					lineProgress[foundShort + i] = i / needle.length;
				}
				cursor = foundShort + needle.length;
				continue;
			}
			for (let i = 0; i < needle.length; i++) {
				lineOfChar[found + i] = li;
				lineProgress[found + i] = i / needle.length;
			}
			cursor = found + needle.length;
		}

		return { paragraph, text: fullText, lineOfChar, lineProgress, lineNorms };
	}

	/** Build (and cache on the document model) the quote search index. */
	function ensureIndex(doc) {
		if (doc.__quoteIndex) {
			return doc.__quoteIndex;
		}
		const pages = [];
		for (const page of doc.pages || []) {
			const entries = [];
			for (const paragraph of page.paragraphs || []) {
				const entry = indexParagraph(paragraph);
				if (entry.text) {
					entries.push(entry);
				}
			}
			pages.push({ pageIndex: page.pageIndex, entries });
		}
		doc.__quoteIndex = pages;
		return pages;
	}

	function partialRect(line, fromRatio, toRatio) {
		const items = line.items || [];
		if (!items.length) {
			return [line.rect.slice()];
		}
		const total = items.reduce((sum, item) => sum + Math.max(item.text.length, 1), 0);
		const rects = [];
		let acc = 0;
		for (const item of items) {
			const len = Math.max(item.text.length, 1);
			const startRatio = acc / total;
			const endRatio = (acc + len) / total;
			acc += len;
			if (endRatio <= fromRatio || startRatio >= toRatio) {
				continue;
			}
			const t0 = (Math.max(fromRatio, startRatio) - startRatio) / (endRatio - startRatio);
			const t1 = (Math.min(toRatio, endRatio) - startRatio) / (endRatio - startRatio);
			const width = item.rect[2] - item.rect[0];
			const left = item.rect[0] + width * Math.max(0, Math.min(1, t0));
			const right = item.rect[0] + width * Math.max(0, Math.min(1, t1));
			// A zero-width sliver has no visual meaning and makes the drawn box
			// jump to the line end; keep a hair of width instead.
			if (right - left < 0.4) {
				rects.push([left, item.rect[1], left + 0.4, item.rect[3]]);
				continue;
			}
			rects.push([left, item.rect[1], right, item.rect[3]]);
		}
		return rects.length ? rects : [line.rect.slice()];
	}

	/**
	 * Turn a normalized match range inside one paragraph into highlight rects.
	 */
	function rectsForRange(entry, from, to) {
		const lines = entry.paragraph.lines || [];
		const byLine = new Map();
		for (let i = from; i < to; i++) {
			const li = entry.lineOfChar[i];
			if (li === -1 || li === undefined) {
				continue;
			}
			const progress = entry.lineProgress[i];
			const bucket = byLine.get(li) || { from: Infinity, to: -Infinity };
			bucket.from = Math.min(bucket.from, Math.max(0, Math.min(1, progress)));
			bucket.to = Math.max(bucket.to, Math.min(1, progress + 0.02));
			byLine.set(li, bucket);
		}
		const rects = [];
		const lineIndices = Array.from(byLine.keys()).sort((a, b) => a - b);
		if (!lineIndices.length) {
			return rects;
		}
		const first = lineIndices[0];
		const last = lineIndices[lineIndices.length - 1];
		for (const li of lineIndices) {
			const line = lines[li];
			if (!line) {
				continue;
			}
			if (li === first && li !== last) {
				rects.push(...partialRect(line, byLine.get(li).from, 1));
			}
			else if (li === last && li !== first) {
				rects.push(...partialRect(line, 0, byLine.get(li).to));
			}
			else if (li === first && li === last) {
				rects.push(...partialRect(line, byLine.get(li).from, byLine.get(li).to));
			}
			else {
				rects.push(line.rect.slice());
			}
		}
		return rects;
	}

	function roundRects(rects) {
		return rects.map(rect => rect.map(v => Math.round(v * 1000) / 1000));
	}

	/**
	 * Anchor-based fuzzy match used when the model's quote is not an exact
	 * substring (extra ellipses, re-joined sentence, dropped words).
	 * Returns the expanded match range inside `entry.text`, or null.
	 */
	function looseMatch(entryText, needle) {
		if (!entryText || !needle || needle.length < 8) {
			return null;
		}
		const anchorCount = Math.min(6, Math.max(2, Math.floor(needle.length / 24)));
		const anchorSize = Math.min(36, Math.max(12, Math.floor(needle.length / (anchorCount + 1))));
		let best = null;
		for (let a = 0; a < anchorCount; a++) {
			const start = Math.floor((needle.length - anchorSize) * (a / Math.max(1, anchorCount - 1)));
			const anchor = needle.slice(start, start + anchorSize);
			let at = entryText.indexOf(anchor);
			while (at !== -1) {
				let left = start;
				let right = start + anchorSize;
				let leftIndex = at;
				let rightIndex = at + anchorSize;
				while (left > 0 && leftIndex > 0 && entryText[leftIndex - 1] === needle[left - 1]) {
					left--;
					leftIndex--;
				}
				while (right < needle.length && rightIndex < entryText.length
					&& entryText[rightIndex] === needle[right]) {
					right++;
					rightIndex++;
				}
				const length = rightIndex - leftIndex;
				if (!best || length > best.length) {
					best = { from: leftIndex, to: rightIndex, length, coverage: length / needle.length };
				}
				at = entryText.indexOf(anchor, at + 1);
			}
		}
		if (!best || best.coverage < 0.55 || best.length < 24) {
			return null;
		}
		return best;
	}

	/** Match a quote that straddles paragraph boundaries, sentence by sentence. */
	function matchAcrossParagraphs(doc, quote) {
		let pieces = quote
			.trim()
			.split(/(?<=[.!?;:])\s+/)
			.map(piece => normalize(piece))
			.filter(piece => piece.length >= 16);
		if (pieces.length < 2) {
			// No sentence break: split near the middle on a word boundary.
			const whole = normalize(quote);
			if (whole.length < 48) {
				return null;
			}
			const middle = Math.floor(whole.length / 2);
			let split = whole.lastIndexOf(' ', middle);
			if (split < 20) {
				split = whole.indexOf(' ', middle);
			}
			if (split <= 0) {
				return null;
			}
			pieces = [whole.slice(0, split).trim(), whole.slice(split).trim()].filter(piece => piece.length >= 16);
		}
		if (pieces.length < 2) {
			return null;
		}
		const pages = ensureIndex(doc);
		const rects = [];
		let pageIndex = null;
		let paragraphId = null;
		let matched = 0;
		for (const piece of pieces) {
			let hit = null;
			for (const page of pages) {
				for (const entry of page.entries) {
					const at = entry.text.indexOf(piece);
					if (at === -1) {
						continue;
					}
					hit = { pageIndex: page.pageIndex, entry, at };
					break;
				}
				if (hit) {
					break;
				}
			}
			if (!hit) {
				continue;
			}
			matched++;
			if (pageIndex === null) {
				pageIndex = hit.pageIndex;
				paragraphId = hit.entry.paragraph.id;
			}
			rects.push(...rectsForRange(hit.entry, hit.at, hit.at + piece.length));
		}
		if (matched < 2 || !rects.length) {
			return null;
		}
		return { pageIndex, paragraphId, rects, matched };
	}

	/**
	 * Locate `quote` in the document model.
	 * @param {Object} doc
	 * @param {string} quote
	 * @returns {{pageIndex:number, paragraphId:string, rects:number[][], text:string, score:number}|null}
	 */
	function findQuote(doc, quote) {
		const needle = normalize(quote);
		if (!needle || needle.length < 4) {
			return null;
		}
		const pages = ensureIndex(doc);
		let best = null;

		const candidates = [needle];
		// Models sometimes keep a trailing period or add ellipses.
		const trimmed = needle.replace(/^[.\s]+|[.\s…]+$/g, '');
		if (trimmed && trimmed !== needle && trimmed.length >= 4) {
			candidates.push(trimmed);
		}

		for (const candidate of candidates) {
			for (const page of pages) {
				for (const entry of page.entries) {
					const at = entry.text.indexOf(candidate);
					if (at === -1) {
						continue;
					}
					const rects = rectsForRange(entry, at, at + candidate.length);
					if (!rects.length) {
						continue;
					}
					const score = candidate.length / Math.max(needle.length, candidate.length);
					if (!best || score > best.score) {
						best = {
							pageIndex: page.pageIndex,
							paragraphId: entry.paragraph.id,
							rects: roundRects(rects),
							text: entry.paragraph.text.slice(
								Math.max(0, entry.paragraph.text.toLowerCase().indexOf(candidate)),
								Math.max(0, entry.paragraph.text.toLowerCase().indexOf(candidate)) + candidate.length
							) || quote,
							score
						};
					}
				}
				if (best && best.score >= 1) {
					return best;
				}
			}
		}

		if (best) {
			return best;
		}

		// Second pass: anchor-based fuzzy match inside a single paragraph.
		for (const candidate of candidates) {
			for (const page of pages) {
				for (const entry of page.entries) {
					const loose = looseMatch(entry.text, candidate);
					if (!loose) {
						continue;
					}
					const rects = rectsForRange(entry, loose.from, loose.to);
					if (!rects.length) {
						continue;
					}
					const score = loose.coverage * 0.9;
					if (!best || score > best.score) {
						best = {
							pageIndex: page.pageIndex,
							paragraphId: entry.paragraph.id,
							rects: roundRects(rects),
							text: quote,
							score
						};
					}
				}
			}
			if (best) {
				return best;
			}
		}

		// Third pass: quote that spans several sentences/paragraphs.
		for (const candidate of candidates) {
			const across = matchAcrossParagraphs(doc, candidate);
			if (across) {
				return {
					pageIndex: across.pageIndex,
					paragraphId: across.paragraphId,
					rects: roundRects(across.rects),
					text: quote,
					score: 0.5
				};
			}
		}
		return null;
	}

	/** Cached paragraph index (kept on the paragraph object, never serialized). */
	function entryFor(paragraph) {
		if (!paragraph.__moonlitQuoteIndex) {
			paragraph.__moonlitQuoteIndex = indexParagraph(paragraph);
		}
		return paragraph.__moonlitQuoteIndex;
	}

	/**
	 * Rects for an arbitrary snippet of a paragraph (used for sentence-level
	 * cross-highlighting).
	 * @param {Object} paragraph document-model paragraph
	 * @param {string} text snippet inside the paragraph
	 * @returns {number[][]|null}
	 */
	function rectsForText(paragraph, text) {
		if (!paragraph || !text) {
			return null;
		}
		const entry = entryFor(paragraph);
		const needle = normalize(text);
		if (!needle) {
			return null;
		}
		let at = entry.text.indexOf(needle);
		if (at === -1) {
			const short = needle.slice(0, Math.max(16, Math.floor(needle.length * 0.7)));
			at = entry.text.indexOf(short);
			if (at === -1) {
				return null;
			}
			return roundRects(rectsForRange(entry, at, at + short.length));
		}
		return roundRects(rectsForRange(entry, at, at + needle.length));
	}

	/**
	 * Rects for every segment of one paragraph, matched in order with a monotonic
	 * cursor. Sequential matching matters: a plain "search anywhere" can resolve a
	 * later sentence to an earlier identical phrase and paint the wrong region,
	 * which is exactly what "hover shows the wrong paragraph" looked like.
	 *
	 * @param {Object} paragraph document-model paragraph
	 * @param {string[]} texts segments in reading order
	 * @returns {Array<{rects:number[][], at:number, exact:boolean}>}
	 */
	function rectsForSegments(paragraph, texts) {
		const entry = entryFor(paragraph);
		const out = [];
		let cursor = 0;
		for (const text of texts || []) {
			const needle = normalize(text);
			if (!needle) {
				out.push({ rects: [], at: cursor, exact: false });
				continue;
			}
			let at = entry.text.indexOf(needle, cursor);
			let exact = at !== -1;
			if (at === -1) {
				// A segment may have been normalised differently; restart from the top
				// rather than losing the mapping entirely.
				at = entry.text.indexOf(needle);
				exact = at !== -1;
			}
			if (at === -1) {
				const short = needle.slice(0, Math.max(16, Math.floor(needle.length * 0.7)));
				at = entry.text.indexOf(short, cursor);
				if (at === -1) {
					at = entry.text.indexOf(short);
				}
				if (at === -1) {
					out.push({ rects: [], at: cursor, exact: false });
					continue;
				}
				const rects = roundRects(rectsForRange(entry, at, at + short.length));
				cursor = at + short.length;
				out.push({ rects, at, exact: false });
				continue;
			}
			const rects = roundRects(rectsForRange(entry, at, at + needle.length));
			cursor = at + needle.length;
			out.push({ rects, at, exact });
		}
		return out;
	}

	M.Quotes = {
		normalize,
		normalizeCharMap,
		findQuote,
		ensureIndex,
		rectsForRange,
		rectsForText,
		rectsForSegments,
		entryFor
	};
})();
