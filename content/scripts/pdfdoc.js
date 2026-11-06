/* global Zotero */

/**
 * Bridge between Zotero's PDF reader (pdf.js) and the pure layout engine.
 *
 * Responsibilities:
 *  - pull text items out of the loaded PDF and build the document model
 *  - own the per-page coordinate mappers used for hover linking and overlays
 *  - expose document metadata (title, authors, venue, abstract)
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	function getViewer(reader) {
		try {
			const internal = reader?._internalReader;
			const view = internal?._primaryView;
			const win = view?._iframeWindow;
			const app = win?.PDFViewerApplication;
			if (!app || !app.pdfDocument) {
				return null;
			}
			return { app, win, pdfViewer: app.pdfViewer, pdfDocument: app.pdfDocument };
		}
		catch (e) {
			M.Log.debug('getViewer failed', e);
			return null;
		}
	}

	function getDocEl(reader) {
		try {
			return reader?._iframeWindow?.document || null;
		}
		catch (e) {
			return null;
		}
	}

	/**
	 * Document that owns the pdf.js viewer. In current Zotero builds the viewer
	 * lives in its own nested frame, so it is not the reader document that hosts
	 * the toolbar and our panels.
	 */
	function getPdfDocEl(reader) {
		try {
			const viewer = getViewer(reader);
			if (viewer?.win?.document) {
				return viewer.win.document;
			}
		}
		catch (e) {
			// fall through to the reader document
		}
		return getDocEl(reader);
	}

	/**
	 * Objects created inside the reader's own JS realm come back through Xray
	 * wrappers, which hide class prototype members (e.g. `getTextContent`).
	 * Unwrapping restores the real object.
	 */
	function unwrap(object) {
		if (!object) {
			return object;
		}
		try {
			const raw = object.wrappedJSObject;
			return raw || object;
		}
		catch (e) {
			return object;
		}
	}

	function displayRotation(viewer, page) {
		const app = viewer.app;
		const rotation = app?.pdfViewer?.pagesRotation;
		if (typeof rotation === 'number' && Number.isFinite(rotation)) {
			return ((rotation % 360) + 360) % 360;
		}
		return page.rotate || 0;
	}

	/**
	 * Extract the whole document.
	 * @param {Object} reader Zotero reader instance
	 * @param {{maxPages?:number, stopAtReferences?:boolean, onProgress?:Function}} [options]
	 */
	async function extract(reader, options = {}) {
		const viewer = getViewer(reader);
		if (!viewer) {
			throw new Error('reader-not-ready');
		}
		const { pdfDocument } = viewer;
		const numPages = pdfDocument.numPages;
		const maxPages = Math.min(options.maxPages || numPages, numPages);
		const pages = [];
		let textBytes = 0;
		let stopped = false;

		for (let i = 1; i <= maxPages; i++) {
			if (stopped) {
				break;
			}
			const page = unwrap(await pdfDocument.getPage(i));
			const rotation = displayRotation(viewer, page);
			const view = page.view;
			const textContent = await page.getTextContent();
			const built = M.Layout.buildPage(
				textContent.items,
				{ view, rotation },
				i - 1,
				{ stopAtReferences: options.stopAtReferences !== false }
			);
			if (built.stoppedAtReferences) {
				stopped = true;
			}
			pages.push(built);
			for (const paragraph of built.paragraphs) {
				textBytes += paragraph.text.length;
			}
			options.onProgress?.({ page: i, total: maxPages, textBytes });
			// Yield to the UI thread so scrolling stays smooth on long PDFs.
			await new Promise(resolve => setTimeout(resolve, 0));
		}

		// Decide what each block is before anything is translated: a table body, a
		// formula, a TOC line or a running head must stay untouched, while the title,
		// abstract, headings and captions are the most valuable text on the page.
		M.Layout.annotateDocument(pages);

		const paragraphs = [];
		for (const page of pages) {
			for (const paragraph of page.paragraphs) {
				paragraphs.push(paragraph);
			}
		}
		// Stable document-wide ids, plus a bounding box: hovering between the lines
		// of a paragraph (or in a word gap) must still resolve to that paragraph.
		paragraphs.forEach((paragraph, index) => {
			paragraph.id = `p${index}`;
			paragraph.docIndex = index;
			if (paragraph.rects?.length) {
				paragraph.bbox = M.Layout.roundRect(M.Layout.unionRect(paragraph.rects));
			}
			else if (paragraph.rect) {
				paragraph.bbox = paragraph.rect;
			}
		});

		const translatable = paragraphs.filter(paragraph => paragraph.translatable !== false);
		const fullText = translatable.map(paragraph => paragraph.text).join('\n\n');
		const attachment = await getAttachment(reader);
		const fingerprint = [
			numPages,
			paragraphs.length,
			M.Util.hashString(fullText.slice(0, 4000)),
			String(attachment?.key || '')
		].join('-');

		const doc = {
			attachmentKey: attachment?.key || `unknown-${Date.now()}`,
			itemID: attachment?.id ?? reader.itemID,
			numPages,
			pages,
			paragraphs,
			fullText,
			textLength: fullText.length,
			fingerprint,
			meta: await getMetadata(reader, attachment),
			extractedAt: Date.now()
		};
		reader._moonlitDoc = doc;
		return doc;
	}

	async function getAttachment(reader) {
		try {
			const itemID = reader.itemID;
			const item = Zotero.Items.get(itemID) || await Zotero.Items.getAsync(itemID);
			return item;
		}
		catch (e) {
			return null;
		}
	}

	async function getMetadata(reader, attachment) {
		try {
			const parent = attachment?.parentItem || attachment;
			const fields = (name) => {
				try {
					return parent.getField(name) || '';
				}
				catch (e) {
					return '';
				}
			};
			let creators = [];
			try {
				creators = parent.getCreators().map(creator => {
					if (creator.name) {
						return creator.name;
					}
					return [creator.firstName, creator.lastName].filter(Boolean).join(' ');
				}).filter(Boolean);
			}
			catch (e) {
				creators = [];
			}
			return {
				title: fields('title') || (attachment?.getField?.('title') || ''),
				authors: creators.join(', '),
				year: (fields('date') || '').slice(0, 16),
				venue: fields('publicationTitle') || fields('proceedingsTitle') || fields('conferenceName')
					|| fields('bookTitle') || fields('repository'),
				DOI: fields('DOI'),
				abstract: fields('abstractNote'),
				itemType: parent?.itemType || ''
			};
		}
		catch (e) {
			return { title: '', authors: '' };
		}
	}

	function metaSummary(doc) {
		const meta = doc.meta || {};
		const parts = [];
		if (meta.title) {
			parts.push(`Title: ${meta.title}`);
		}
		if (meta.authors) {
			parts.push(`Authors: ${M.Util.truncate(meta.authors, 300)}`);
		}
		if (meta.venue) {
			parts.push(`Venue: ${meta.venue}`);
		}
		if (meta.year) {
			parts.push(`Year: ${meta.year}`);
		}
		if (meta.abstract) {
			parts.push(`Abstract: ${M.Util.truncate(meta.abstract, 2000)}`);
		}
		return parts.join('\n');
	}

	/** The prose the models should see: no tables, formulas, TOC or running heads. */
	function proseText(doc, { maxChars = Infinity, includeCaptions = true } = {}) {
		const keep = new Set(['title', 'heading', 'abstract', 'body', 'keywords', 'figure-caption', 'table-caption']);
		const lines = [];
		for (const paragraph of doc.paragraphs || []) {
			if (paragraph.translatable === false) {
				continue;
			}
			if (!keep.has(paragraph.role || 'body')) {
				continue;
			}
			if (!includeCaptions && (paragraph.role === 'figure-caption' || paragraph.role === 'table-caption')) {
				continue;
			}
			lines.push(paragraph.role === 'heading' || paragraph.role === 'title'
				? `## ${paragraph.text}`
				: paragraph.text);
		}
		const text = lines.join('\n\n');
		return text.length <= maxChars ? text : `${text.slice(0, maxChars)}\n\n[...]`;
	}

	/** Text for the summary pipeline: trimmed for very long papers. */
	function textForSummary(doc, maxChars = 48000) {
		const prose = doc.paragraphs?.length ? proseText(doc) : (doc.fullText || '');
		const text = prose;
		if (text.length <= maxChars) {
			return text;
		}
		const head = text.slice(0, Math.floor(maxChars * 0.7));
		const tail = text.slice(-Math.floor(maxChars * 0.25));
		return `${head}\n\n[...]\n\n${tail}`;
	}

	/** Text for the highlight pipeline: whole paper up to a hard cap. */
	function textForHighlight(doc, maxChars = 60000) {
		const text = doc.paragraphs?.length ? proseText(doc, { includeCaptions: false }) : (doc.fullText || '');
		return text.length <= maxChars ? text : text.slice(0, maxChars);
	}

	// ------------------------------------------------------------- geometry
	function pageViewOf(viewer, pageIndex) {
		try {
			return unwrap(viewer.pdfViewer.getPageView(pageIndex));
		}
		catch (e) {
			return null;
		}
	}

	function pageElement(viewer, pageIndex) {
		const pageView = pageViewOf(viewer, pageIndex);
		return pageView?.div || viewer.app?.pdfViewer?._pages?.[pageIndex]?.div || null;
	}

	function canvasBox(pageEl) {
		const canvas = pageEl.querySelector('.canvasWrapper canvas');
		const target = canvas || pageEl;
		const box = target.getBoundingClientRect();
		return { box, pageBox: pageEl.getBoundingClientRect() };
	}

	/**
	 * Viewport for a page at its current rendered scale.
	 * pdf.js exposes `pageView.viewport`, otherwise it is rebuilt from the DOM box.
	 */
	function currentViewport(viewer, pageIndex, pageEl, box) {
		const pageView = pageViewOf(viewer, pageIndex);
		let viewport = unwrap(pageView?.viewport);
		if (viewport && viewport.width && viewport.height
			&& typeof viewport.convertToViewportPoint === 'function') {
			return viewport;
		}
		if (viewport && viewport.width && viewport.height) {
			// Wrapped or partial viewport: rebuild it from the DOM geometry.
			const page = unwrap(viewer.pdfViewer._pages?.[pageIndex]?.pdfPage);
			const view = page?.view || [0, 0, viewport.width, viewport.height];
			const rotation = viewer.pdfViewer.pagesRotation || 0;
			const scale = box && box.width ? box.width / Math.abs(view[2] - view[0]) : 1;
			return M.Layout.makeViewport({ view, rotation, scale });
		}
		const page = unwrap(viewer.pdfViewer._pages?.[pageIndex]?.pdfPage);
		const view = page?.view || [0, 0, 612, 792];
		const rotation = viewer.pdfViewer.pagesRotation || 0;
		const scale = box && box.width ? box.width / Math.abs(view[2] - view[0]) : 1;
		return M.Layout.makeViewport({ view, rotation, scale });
	}

	/**
	 * Build the conversion helpers for one page.
	 * Returns null when the page is not rendered yet.
	 */
	function pageMapping(reader, pageIndex) {
		const viewer = getViewer(reader);
		if (!viewer) {
			return null;
		}
		const pageEl = pageElement(viewer, pageIndex);
		if (!pageEl) {
			return null;
		}
		const { box, pageBox } = canvasBox(pageEl);
		const viewport = currentViewport(viewer, pageIndex, pageEl, box);
		const scaleX = box.width ? box.width / viewport.width : 1;
		const scaleY = box.height ? box.height / viewport.height : 1;
		return {
			pageIndex,
			pageEl,
			box,
			pageBox,
			viewport,
			/** PDF point -> client px (screen coordinates inside the reader iframe) */
			toClient(x, y) {
				const [vx, vy] = viewport.convertToViewportPoint(x, y);
				return [box.left + vx * scaleX, box.top + vy * scaleY];
			},
			/** PDF rect -> {left, top, width, height} in page-element local px */
			toLocalRect(rect) {
				const [x1, y1] = viewport.convertToViewportPoint(rect[0], rect[1]);
				const [x2, y2] = viewport.convertToViewportPoint(rect[2], rect[3]);
				const left = Math.min(x1, x2) * scaleX;
				const top = Math.min(y1, y2) * scaleY;
				return {
					left,
					top,
					width: Math.abs(x2 - x1) * scaleX,
					height: Math.abs(y2 - y1) * scaleY
				};
			},
			offset: {
				left: box.left - pageBox.left,
				top: box.top - pageBox.top,
				width: box.width,
				height: box.height
			},
			/** Client px -> PDF point */
			toPdf(clientX, clientY) {
				const vx = (clientX - box.left) / (scaleX || 1);
				const vy = (clientY - box.top) / (scaleY || 1);
				return viewport.convertToPdfPoint(vx, vy);
			}
		};
	}

	/**
	 * Find the paragraph under a client-space point.
	 * @returns {{pageIndex:number, paragraph:Object}|null}
	 */
	function paragraphAt(reader, clientX, clientY, options = {}) {
		const doc = reader._moonlitDoc;
		if (!doc) {
			return null;
		}
		const docEl = getPdfDocEl(reader);
		const viewer = getViewer(reader);
		if (!docEl || !viewer) {
			return null;
		}
		let pageEl = null;
		try {
			const el = docEl.elementFromPoint(clientX, clientY);
			pageEl = el?.closest?.('.page');
			if (!pageEl) {
				// Fall back to scanning rendered pages' boxes (overlays are
				// pointer-events:none, but the canvas may be covered by text layer).
				for (const candidate of docEl.querySelectorAll('.pdfViewer .page')) {
					const box = candidate.getBoundingClientRect();
					if (clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom) {
						pageEl = candidate;
						break;
					}
				}
			}
		}
		catch (e) {
			return null;
		}
		if (!pageEl) {
			return null;
		}
		const pageIndex = Number(pageEl.dataset?.pageNumber) - 1;
		if (!Number.isFinite(pageIndex) || pageIndex < 0) {
			return null;
		}
		const mapping = pageMapping(reader, pageIndex);
		if (!mapping) {
			return null;
		}
		const [px, py] = mapping.toPdf(clientX, clientY);
		const page = doc.pages[pageIndex];
		if (!page) {
			return null;
		}
		const tolerance = 2.5;
		for (const paragraph of page.paragraphs) {
			for (const rect of paragraph.rects) {
				if (px >= rect[0] - tolerance && px <= rect[2] + tolerance
					&& py >= rect[1] - tolerance && py <= rect[3] + tolerance) {
					return { pageIndex, paragraph };
				}
			}
		}
		// Between lines, in a word gap, or on an indent: the paragraph's bounding
		// box is what the eye is pointing at.
		for (const paragraph of page.paragraphs) {
			const box = paragraph.bbox || paragraph.rect;
			if (!box) {
				continue;
			}
			if (px >= box[0] - tolerance && px <= box[2] + tolerance
				&& py >= box[1] - tolerance && py <= box[3] + tolerance) {
				return { pageIndex, paragraph, approximate: true };
			}
		}
		// Still nothing: nothing is drawn there (figure area, margin). Keep whatever
		// was highlighted instead of blinking, unless the caller asks for nearest.
		if (options?.nearest) {
			let best = null;
			let bestDistance = Infinity;
			for (const paragraph of page.paragraphs) {
				const box = paragraph.bbox || paragraph.rect;
				if (!box) {
					continue;
				}
				const dx = px < box[0] ? box[0] - px : (px > box[2] ? px - box[2] : 0);
				const dy = py < box[1] ? box[1] - py : (py > box[3] ? py - box[3] : 0);
				const distance = Math.hypot(dx, dy);
				if (distance < bestDistance) {
					bestDistance = distance;
					best = paragraph;
				}
			}
			if (best && bestDistance <= 36) {
				return { pageIndex, paragraph: best, approximate: true, distance: bestDistance };
			}
		}
		return null;
	}

	const revealState = { lastAt: 0, userAt: 0 };

	/** Note a real user scroll so sync never fights it. */
	function noteUserScroll() {
		revealState.userAt = Date.now();
	}

	/** Scroll a paragraph into view inside the reader. */
	function scrollToParagraph(reader, paragraph) {
		const viewer = getViewer(reader);
		if (!viewer || !paragraph) {
			return;
		}
		try {
			const pageView = pageViewOf(viewer, paragraph.pageIndex);
			const rect = paragraph.rect;
			const target = pageView?.viewport
				? pageView.viewport.convertToViewportPoint(rect[0], rect[3])
				: null;
			if (pageView?.div && target) {
				viewer.pdfViewer.scrollPageIntoView({
					pageNumber: paragraph.pageIndex + 1,
					destArray: [null, { name: 'XYZ' }, rect[0], rect[3], null]
				});
				return;
			}
			viewer.pdfViewer.scrollPageIntoView({ pageNumber: paragraph.pageIndex + 1 });
		}
		catch (e) {
			M.Log.debug('scrollToParagraph failed', e);
		}
	}

	/** Ask pdf.js to navigate to a page (works even when it is not rendered yet). */
	function jumpToPage(reader, pageIndex) {
		const viewer = getViewer(reader);
		if (!viewer) {
			return false;
		}
		try {
			const pdfViewer = viewer.pdfViewer;
			if (pdfViewer?.scrollPageIntoView) {
				pdfViewer.scrollPageIntoView({ pageNumber: pageIndex + 1, allowNegativeOffset: true });
				return true;
			}
			if (pdfViewer) {
				pdfViewer.currentPageNumber = pageIndex + 1;
				return true;
			}
		}
		catch (e) {
			M.Log.debug('jumpToPage failed', e);
		}
		return false;
	}

	/**
	 * The element that actually scrolls the pages.
	 *
	 * Zotero's reader does not always scroll `#viewerContainer` (padding, nested
	 * frames, reader tweaks), so pick the first candidate that can really scroll
	 * instead of assuming.
	 */
	function scrollContainer(reader) {
		const doc = getPdfDocEl(reader);
		if (!doc) {
			return null;
		}
		const candidates = [
			doc.getElementById('viewerContainer'),
			doc.querySelector('.pdfViewer'),
			doc.getElementById('viewer'),
			doc.querySelector('#outerContainer'),
			doc.scrollingElement,
			doc.documentElement,
			doc.body
		].filter((element, index, all) => element && all.indexOf(element) === index);
		const scrollable = candidates.filter(el => (el.scrollHeight - el.clientHeight) > 8);
		const view = doc.defaultView;
		for (const el of scrollable) {
			try {
				const style = view?.getComputedStyle?.(el);
				if (style && /(auto|scroll|overlay)/.test(`${style.overflowY}${style.overflow}`)) {
					return el;
				}
			}
			catch (e) {
				// keep looking
			}
		}
		return scrollable[0] || candidates[0] || null;
	}

	/**
	 * Make a set of PDF rects visible, without yanking the view when the target is
	 * already on screen. This is what keeps the original in sync when the pointer
	 * moves over a translation.
	 *
	 * @param {Object} reader
	 * @param {number} pageIndex
	 * @param {number[][]} rects PDF user-space rects
	 * @param {{margin?:number, behavior?:string, ratio?:number}} [options]
	 * @returns {boolean} whether a scroll was performed
	 */
	function revealRects(reader, pageIndex, rects, options = {}) {
		if (!rects || !rects.length) {
			return false;
		}
		const container = scrollContainer(reader);
		if (!container) {
			return false;
		}
		const margin = options.margin ?? 28;
		const ratio = options.ratio ?? 0.34;
		// While a sync-driven scroll is in flight, ignore further sync requests: two
		// competing jumps per animation frame is exactly what made the page judder.
		const now = Date.now();
		if (!options.force && now - (revealState.lastAt || 0) < (options.cooldown ?? 160)) {
			return false;
		}
		const band = options.band ?? 0;

		/** Client-space vertical bounds of the rects, or null when unmeasurable. */
		const bounds = () => {
			const mapping = pageMapping(reader, pageIndex);
			if (!mapping) {
				return null;
			}
			const pageRect = mapping.pageEl.getBoundingClientRect();
			let top = Infinity;
			let bottom = -Infinity;
			for (const rect of rects) {
				const box = mapping.toLocalRect(rect);
				top = Math.min(top, pageRect.top + box.top);
				bottom = Math.max(bottom, pageRect.top + box.top + box.height);
			}
			if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
				return null;
			}
			return { top, bottom, pageRect };
		};

		const visible = (measured) => {
			const viewRect = container.getBoundingClientRect();
			if (band > 0) {
				// Comfortable band: leave the page alone while the target is inside the
				// middle of the view. Chasing every pointer move is what felt jittery.
				const slack = viewRect.height * band;
				return measured.top >= viewRect.top + margin - slack
					&& measured.bottom <= viewRect.bottom - margin + slack;
			}
			return measured.top >= viewRect.top + margin && measured.bottom <= viewRect.bottom - margin;
		};

		/**
		 * Nudge every scrollable ancestor, not just the one we picked: Zotero wraps
		 * the pdf.js container, and which element actually moves depends on the
		 * reader layout and the current scroll mode.
		 */
		const nudge = (delta) => {
			let moved = false;
			let element = container;
			while (element) {
				const before = element.scrollTop;
				const max = Math.max(0, element.scrollHeight - element.clientHeight);
				const next = Math.max(0, Math.min(max, before + delta));
				if (next !== before) {
					element.scrollTop = next;
					moved = true;
				}
				element = element.parentElement;
			}
			return moved;
		};

		const adjust = (attempts) => {
			const measured = bounds();
			if (!measured) {
				return false;
			}
			if (visible(measured)) {
				return false;
			}
			const viewRect = container.getBoundingClientRect();
			const delta = (measured.top - viewRect.top) - viewRect.height * ratio;
			const moved = nudge(delta);
			if (moved) {
				revealState.lastAt = Date.now();
			}
			M.Log.debug('reveal', {
				pageIndex,
				targetTop: Math.round(measured.top),
				viewTop: Math.round(viewRect.top),
				viewBottom: Math.round(viewRect.bottom),
				delta: Math.round(delta),
				scrollTop: container.scrollTop,
				moved
			});
			if (attempts > 0) {
				// pdf.js restores its own scroll position after a layout pass; a single
				// assignment can be undone, so confirm and retry — once, and only when
				// the user is not scrolling right now.
				setTimeout(() => {
					try {
						if (Date.now() - (revealState.userAt || 0) < 400) {
							return;
						}
						adjust(attempts - 1);
					}
					catch (e) {
						M.Log.debug('reveal retry failed', e);
					}
				}, 200);
			}
			return moved;
		};

		const measured = bounds();
		if (measured && !visible(measured)) {
			return adjust(band > 0 ? 0 : 1);
		}
		if (measured) {
			return false;
		}
		// The page has never been rendered: pdf.js is virtualised and there is no
		// DOM box to measure. Hand the navigation to pdf.js, then fine-tune.
		const jumped = jumpToPage(reader, pageIndex);
		if (jumped) {
			setTimeout(() => {
				try {
					adjust(2);
				}
				catch (e) {
					M.Log.debug('reveal after jump failed', e);
				}
			}, 260);
		}
		return jumped;
	}

	function currentPageIndex(reader) {
		const viewer = getViewer(reader);
		if (!viewer) {
			return 0;
		}
		try {
			const pages = viewer.pdfViewer._pages || [];
			const docEl = getPdfDocEl(reader);
			if (!docEl) {
				return 0;
			}
			const container = docEl.getElementById('viewerContainer')
				|| docEl.querySelector('#viewerContainer, .pdfViewer');
			if (!container) {
				return 0;
			}
			const top = container.getBoundingClientRect().top + container.clientHeight * 0.25;
			let best = 0;
			for (let i = 0; i < pages.length; i++) {
				const el = pages[i]?.div;
				if (!el) {
					continue;
				}
				const box = el.getBoundingClientRect();
				if (box.bottom >= top) {
					best = i;
					break;
				}
			}
			return best;
		}
		catch (e) {
			return 0;
		}
	}

	/** Re-apply the current zoom mode so the viewer fits the narrowed area. */
	function refit(reader) {
		const viewer = getViewer(reader);
		if (!viewer) {
			return;
		}
		try {
			const viewerObj = viewer.pdfViewer;
			const previous = viewerObj.currentScaleValue;
			viewerObj.currentScaleValue = previous || 'auto';
			M.Log.debug('refit pdf', previous);
		}
		catch (e) {
			M.Log.debug('refit failed', e);
		}
	}

	M.PdfDoc = {
		getViewer,
		getDocEl,
		getPdfDocEl,
		extract,
		getMetadata,
		metaSummary,
		textForSummary,
		textForHighlight,
		proseText,
		pageMapping,
		paragraphAt,
		scrollToParagraph,
		revealRects,
		jumpToPage,
		scrollContainer,
		currentPageIndex,
		refit,
		pageElement
	};
})();
