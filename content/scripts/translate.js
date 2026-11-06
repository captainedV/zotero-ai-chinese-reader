/**
 * Side-by-side translation view.
 *
 * Layout: the PDF page keeps its own column (the dock pushes it left), and the
 * dock lists the paper's paragraphs in reading order with the translation on
 * top and the original sentence underneath. Hovering either side marks the
 * other — the geometry link is driven by `M.Quotes.rectsForText()`.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});
	const t = (key, vars) => M.I18n.t(key, vars);

	const SEGMENT_CLASS = 'ml-seg';
	const MAX_CHARS_PER_REQUEST = 3200;

	function create(app) {
		const doc = app.doc;
		const state = {
			enabled: false,
			running: false,
			abort: null,
			segments: [],
			pdfScrolledAt: 0,
			selfScrolledAt: 0,
			selfScrolledDockAt: 0,
			userPdfIntentAt: 0,
			translations: new Map(),
			activeId: null,
			activeParagraphId: null,
			lastHoverId: null,
			cardById: new Map(),
			cardByParagraph: new Map(),
			record: null,
			progress: { done: 0, total: 0 },
			progressLabel: '',
			nonStream: false,
			started: false,
			restartRequested: false,
			userScrolledAt: 0
		};

		// ------------------------------------------------------------ skeleton
		const root = M.Dom.h(doc, 'div', { class: 'ml-view ml-view-translate' });

		const toolbar = M.Dom.h(doc, 'div', { class: 'ml-toolrow' });
		const progressWrap = M.Dom.h(doc, 'div', { class: 'ml-progress', style: { display: 'none' } }, [
			M.Dom.h(doc, 'div', {})
		]);
		const progressBar = progressWrap.firstElementChild;
		const statusLabel = M.Dom.h(doc, 'div', { class: 'ml-mutelabel', text: '' });
		const list = M.Dom.h(doc, 'div', { class: 'ml-paragraphs', style: { display: 'flex', 'flex-direction': 'column', gap: '7px' } });
		// Non-prose blocks (tables, formulas, TOC, running heads) are deliberately
		// left alone; say so once so the omission reads as a choice, not a bug.
		const skippedNote = M.Dom.h(doc, 'div', { class: 'ml-mutelabel ml-skipped', text: '' });
		skippedNote.hidden = true;

		let btnStop;
		let btnToggleSource;
		let emptyState;

		function buildToolbar() {
			M.Dom.clear(toolbar);
			btnStop = M.Dom.button(doc, {
				label: t('action.stop'),
				icon: 'stop',
				variant: 'ml-ghost',
				onClick: () => stop()
			});
			btnToggleSource = M.Dom.iconButton(doc, 'eye', t('translate.showOriginal'), () => {
				const show = !M.Prefs.getBool('showOriginalInTranslation', true);
				M.Prefs.set('showOriginalInTranslation', show);
				applySourceVisibility();
			});
			toolbar.append(statusLabel, M.Dom.h(doc, 'div', { class: 'ml-grow' }), btnToggleSource);
			updateToolbarState();
		}

		function updateToolbarState() {
			btnStop.style.display = state.running ? 'inline-flex' : 'none';
			btnToggleSource.style.display = state.segments.length ? 'inline-flex' : 'none';
		}

		function applySourceVisibility() {
			const show = M.Prefs.getBool('showOriginalInTranslation', true);
			list.classList.toggle('ml-hide-src-all', !show);
			for (const card of state.cardById.values()) {
				card.classList.toggle('ml-hide-src', !show);
			}
		}

		/** 0% with no answer yet is "waiting for the model", not "stuck". */
		function progressLabel(done) {
			if (state.nonStream) {
				return t('progress.nonStream');
			}
			if (!done) {
				return t('progress.waiting');
			}
			return t('progress.translate');
		}

		function setProgress(done, total, extra = {}) {
			state.progress = { done, total };
			state.progressLabel = progressLabel(done);
			// "paused" means a run was interrupted. Merely loading a paper with a
			// switch on is not paused — that made a first open look broken.
			const running = extra.state || (state.running
				? 'running'
				: (total && done >= total ? 'done' : (state.started ? 'paused' : 'idle')));
			if (!total) {
				progressWrap.style.display = 'none';
				statusLabel.textContent = '';
				app.setTask('translate', null);
				updateToolbarState();
				return;
			}
			progressWrap.style.display = 'block';
			const pct = Math.round((done / total) * 100);
			progressBar.style.width = `${pct}%`;
			statusLabel.textContent = `${t('translate.progress')} ${done}/${total}`;
			app.setTask('translate', {
				state: running,
				label: running === 'running' ? state.progressLabel : t(`task.${running}`),
				done,
				total,
				tab: 'translate'
			});
			updateToolbarState();
		}

		// ------------------------------------------------------------- empty UI
		function buildEmpty() {
			emptyState = M.Dom.h(doc, 'div', { class: 'ml-empty' }, [
				M.Dom.h(doc, 'div', { class: 'ml-empty-icon', html: M.Icons.get('translate') }),
				M.Dom.h(doc, 'div', { class: 'ml-empty-title', text: t('translate.empty.title') }),
				M.Dom.h(doc, 'div', { class: 'ml-empty-desc', text: t('translate.empty.desc') }),
				M.Dom.h(doc, 'div', { class: 'ml-empty-hint', text: t('empty.useSwitch') })
			]);
			return emptyState;
		}

		// ------------------------------------------------------------ rendering
		function renderSegments() {
			M.Dom.clear(list);
			state.cardById.clear();
			state.cardByParagraph.clear();
			if (!state.segments.length) {
				return;
			}
			const showSource = M.Prefs.getBool('showOriginalInTranslation', true);
			let currentPage = -1;
			for (const paragraph of state.segments) {
				if (paragraph.pageIndex !== currentPage) {
					currentPage = paragraph.pageIndex;
					list.appendChild(M.Dom.h(doc, 'div', {
						class: 'ml-page-divider',
						text: t('translate.page', { page: currentPage + 1 })
					}));
				}
				const card = M.Dom.h(doc, 'div', {
					class: 'ml-para',
					dataset: { paragraphId: paragraph.id },
					attrs: { 'data-page': paragraph.pageIndex }
				});
				if (!showSource) {
					card.classList.add('ml-hide-src');
				}

				const actions = M.Dom.h(doc, 'div', { class: 'ml-mini-actions' }, [
					M.Dom.iconButton(doc, 'jump', t('action.jump'), () => jumpTo(paragraph)),
					M.Dom.iconButton(doc, 'copy', t('action.copy'), () => {
						copyText(paragraph);
					})
				]);
				card.appendChild(actions);

				for (const segment of paragraph.sentences) {
					const seg = M.Dom.h(doc, 'div', {
						class: SEGMENT_CLASS,
						dataset: { segmentId: segment.id }
					});
					const trans = M.Dom.h(doc, 'div', { class: 'ml-trans' });
					const src = M.Dom.h(doc, 'div', { class: 'ml-src', text: segment.text });
					seg.append(trans, src);

					seg.addEventListener('mouseenter', () => onSegmentHover(paragraph, segment));
					seg.addEventListener('mouseleave', () => onSegmentLeave());

					card.appendChild(seg);
					segment.el = trans;
					segment.card = card;
				}

				card.addEventListener('mouseenter', () => {
					if (!state.activeId) {
						app.overlay.show({
							pageIndex: paragraph.pageIndex,
							rects: paragraph.rects,
							key: `para:${paragraph.id}`
						});
						followPdf(paragraph, paragraph.rects);
					}
				});
				card.addEventListener('mouseleave', () => {
					if (state.activeId === `para:${paragraph.id}`) {
						app.overlay.clear();
						state.activeId = null;
					}
				});

				list.appendChild(card);
				state.cardById.set(paragraph.id, card);
				state.cardByParagraph.set(paragraph.id, card);
			}
			paintAll();
		}

		/**
		 * Rects for every segment of a paragraph, resolved once with a monotonic
		 * cursor so sentence N can never paint the region of sentence N-1.
		 */
		function segmentRects(paragraph) {
			if (paragraph.__mlSegmentRects) {
				return paragraph.__mlSegmentRects;
			}
			let resolved = [];
			try {
				resolved = M.Quotes.rectsForSegments(
					paragraph,
					paragraph.sentences.map(segment => segment.text)
				);
			}
			catch (e) {
				M.Log.debug('segment rect resolution failed', e);
			}
			paragraph.__mlSegmentRects = resolved;
			return resolved;
		}

		function rectsOf(paragraph, segment) {
			const resolved = segmentRects(paragraph)[segment.index];
			const rects = resolved?.rects?.length ? resolved.rects : null;
			return rects || paragraph.rects || [];
		}

		function onSegmentHover(paragraph, segment) {
			const key = `seg:${segment.id}`;
			if (state.activeId === key) {
				return;
			}
			state.activeId = key;
			const rects = rectsOf(paragraph, segment);
			// Two levels: the whole paragraph faintly, the live sentence strongly,
			// so the correspondence is obvious even at a glance.
			app.overlay.showMany([
				{ pageIndex: paragraph.pageIndex, rects: paragraph.rects, tone: 'para' },
				{ pageIndex: paragraph.pageIndex, rects, tone: 'seg' }
			], key);
			app.overlay.remember([
				{ pageIndex: paragraph.pageIndex, rects: paragraph.rects, tone: 'para' },
				{ pageIndex: paragraph.pageIndex, rects, tone: 'seg' }
			], key);
			setHotSegment(segment);
			highlightCard(paragraph.id, false);
			followPdf(paragraph, rects);
		}

		/** Keep the original in step with the hovered translation. */
		function followPdf(paragraph, rects, { approximate = false } = {}) {
			if (!M.Prefs.getBool('followPdf', true)) {
				return;
			}
			if (Date.now() - state.userPdfIntentAt < 1200) {
				// The user is scrolling the PDF themselves; don't fight them.
				return;
			}
			if (approximate) {
				// The pointer is in a gap/margin, not on a line: the highlight shows
				// the paragraph, but the page must not move for that.
				return;
			}
			const moved = M.PdfDoc.revealRects(app.reader, paragraph.pageIndex, rects, {
				// A comfort band means small pointer movements never move the page;
				// only a target outside the middle of the view pulls it into place.
				band: 0.16,
				margin: 24,
				cooldown: 240
			});
			M.Log.debug('followPdf', {
				pageIndex: paragraph.pageIndex,
				rects: rects.length,
				moved,
				intentAge: Date.now() - state.userPdfIntentAt,
				pref: M.Prefs.getBool('followPdf', true)
			});
			if (moved) {
				state.selfScrolledAt = Date.now();
			}
		}

		function setHotSegment(segment) {
			if (state.hotSegment === segment) {
				return;
			}
			state.hotSegment?.el?.closest('.ml-seg')?.classList.remove('ml-hot');
			state.hotSegment = segment;
			segment?.el?.closest('.ml-seg')?.classList.add('ml-hot');
		}

		function onSegmentLeave() {
			state.activeId = null;
			setHotSegment(null);
			app.overlay.clear();
		}

		function paintSegment(segment) {
			if (!segment.el) {
				return;
			}
			const text = state.translations.get(segment.id);
			if (text) {
				segment.el.classList.remove('ml-pending');
				segment.el.textContent = text;
			}
			else if (segment.pending) {
				segment.el.classList.add('ml-pending');
				segment.el.innerHTML = '<span class="ml-loading-text"><i></i><i></i><i></i></span>';
			}
			else {
				segment.el.classList.remove('ml-pending');
				segment.el.innerHTML = '<span class="ml-skeleton" style="width:78%"></span>';
			}
		}

		function paintAll() {
			for (const paragraph of state.segments) {
				for (const segment of paragraph.sentences) {
					paintSegment(segment);
				}
			}
		}

		function jumpTo(paragraph) {
			M.PdfDoc.scrollToParagraph(app.reader, paragraph);
			highlightCard(paragraph.id, false);
		}

		function copyText(paragraph) {
			const text = paragraph.sentences
				.map(segment => state.translations.get(segment.id) || '')
				.filter(Boolean)
				.join(' ');
			if (!text) {
				return;
			}
			try {
				app.copy(text);
				app.toast(t('action.copied'), 'success');
			}
			catch (e) {
				M.Log.debug('copy failed', e);
			}
		}

		// ------------------------------------------------------ hover from PDF
		function onPdfHover(hit) {
			if (!state.enabled) {
				return;
			}
			if (!hit) {
				// Genuinely left the page: clear once.
				if (state.lastHoverId) {
					state.cardByParagraph.get(state.lastHoverId)?.classList.remove('ml-active');
					state.activeParagraphId = null;
					state.lastHoverId = null;
					app.overlay.clear();
				}
				return;
			}
			const paragraph = hit.paragraph;
			if (!state.cardByParagraph.has(paragraph.id)) {
				// A table, formula, TOC line or figure label: nothing to show here, but
				// do not blank the previous highlight — blinking reads as a bug.
				return;
			}
			if (state.lastHoverId === paragraph.id) {
				return;
			}
			app.overlay.show({
				pageIndex: paragraph.pageIndex,
				rects: paragraph.rects,
				key: `pdf:${paragraph.id}`
			});
			highlightCard(paragraph.id, true);
			state.lastHoverId = paragraph.id;
		}

		/** Is the card comfortably inside the dock's visible band? */
		function cardInView(card) {
			try {
				const host = app.dock?.scrollHost || list;
				const hostRect = host.getBoundingClientRect();
				const rect = card.getBoundingClientRect();
				const slack = hostRect.height * 0.1;
				return rect.top >= hostRect.top - slack && rect.bottom <= hostRect.bottom + slack;
			}
			catch (e) {
				return true;
			}
		}

		function highlightCard(paragraphId, scroll) {
			const card = state.cardByParagraph.get(paragraphId);
			if (!card) {
				return;
			}
			if (state.activeParagraphId === paragraphId) {
				return;
			}
			if (state.activeParagraphId) {
				state.cardByParagraph.get(state.activeParagraphId)?.classList.remove('ml-active');
			}
			state.activeParagraphId = paragraphId;
			card.classList.add('ml-active');
			// Only move the translation column when the card is actually off screen.
			if (scroll && !cardInView(card)) {
				markDockScrollProgrammatic();
				app.scrollDockTo(card);
			}
		}

		// ---------------------------------------------------------- data model
		function segmentsFromDocument() {
			// Paragraphs are the unit of translation by default: sentence-level cards
			// fragment a paragraph whose PDF runs were split by markup, and the model
			// then translates half-sentences.
			const granularity = M.Prefs.getString('granularity', 'paragraph') || 'paragraph';
			const out = [];
			let skipped = 0;
			for (const paragraph of app.document.paragraphs) {
				if (!paragraph.text || paragraph.text.length < 12) {
					continue;
				}
				// Tables, formulas, the TOC, running heads and reference lists are not
				// translated: a translated cell wrecks the table and a translated page
				// number reads as garbage.
				if (paragraph.translatable === false) {
					skipped++;
					continue;
				}
				let sentences;
				if (granularity === 'paragraph') {
					sentences = [{
						id: `${paragraph.id}:0`,
						text: paragraph.text,
						index: 0
					}];
				}
				else {
					sentences = M.Sentences.split(paragraph.text).map((part, index) => ({
						id: `${paragraph.id}:${index}`,
						text: part.text,
						index
					}));
					if (!sentences.length) {
						continue;
					}
				}
				out.push({
					id: paragraph.id,
					pageIndex: paragraph.pageIndex,
					rects: paragraph.rects,
					lines: paragraph.lines,
					text: paragraph.text,
					sentences
				});
			}
			state.skippedBlocks = skipped;
			if (skippedNote) {
				skippedNote.textContent = skipped ? t('translate.skipped', { count: skipped }) : '';
				skippedNote.hidden = !skipped;
			}
			return out;
		}

		function hydrateFromCache(record) {
			state.record = record;
			const targetLang = M.Prompts.targetLanguage();
			if (record.targetLang && record.targetLang !== targetLang) {
				state.translations.clear();
				record.translation = {};
				return;
			}
			state.translations.clear();
			for (const [id, value] of Object.entries(record.translation || {})) {
				if (value && value.text) {
					state.translations.set(id, value.text);
				}
			}
		}

		function persist() {
			if (!state.record) {
				return;
			}
			state.record.targetLang = M.Prompts.targetLanguage();
			state.record.model = M.AI.describe().model;
			state.record.translation = {};
			for (const [id, text] of state.translations) {
				state.record.translation[id] = { text };
			}
			M.Cache.save(app.document.attachmentKey, state.record);
		}

		function pendingParagraphs() {
			return state.segments.filter(paragraph =>
				paragraph.sentences.some(segment => !state.translations.get(segment.id)));
		}

		function updateProgress() {
			const total = state.segments.length;
			const done = state.segments.filter(paragraph =>
				paragraph.sentences.every(segment => state.translations.get(segment.id))).length;
			setProgress(done, total);
			return { done, total };
		}

		// ------------------------------------------------------------ translate
		function batchRequests(paragraph) {
			const pending = paragraph.sentences.filter(segment => !state.translations.get(segment.id));
			if (!pending.length) {
				return [];
			}
			const batches = [];
			let current = [];
			let size = 0;
			for (const segment of pending) {
				if (current.length && size + segment.text.length > MAX_CHARS_PER_REQUEST) {
					batches.push(current);
					current = [];
					size = 0;
				}
				current.push(segment);
				size += segment.text.length;
			}
			if (current.length) {
				batches.push(current);
			}
			return batches;
		}

		async function translateParagraph(paragraph, signal) {
			const batches = batchRequests(paragraph);
			for (const batch of batches) {
				if (signal.aborted) {
					return;
				}
				for (const segment of batch) {
					segment.pending = true;
					paintSegment(segment);
				}
				const granularity = M.Prefs.getString('granularity', 'paragraph') || 'paragraph';
				const request = granularity === 'paragraph'
					? M.Prompts.buildTranslateParagraphPrompt({
						paragraphText: paragraph.text,
						index: paragraph.pageIndex,
						total: state.segments.length
					})
					: M.Prompts.buildTranslatePrompt({
						sentences: batch.map(segment => ({ id: segment.id, text: segment.text })),
						paragraphText: paragraph.text,
						index: paragraph.pageIndex,
						total: state.segments.length
					});
				let raw;
				try {
					raw = await M.AI.complete({
						kind: 'translate',
						system: request.system,
						prompt: request.prompt,
						json: request.json,
						signal,
						onState: (next, info) => {
							if (next === 'rateLimited') {
								const current = state.progress;
								if (current) {
									app.setTask('translate', {
										state: 'running',
										label: t('progress.rateLimited', { seconds: info?.seconds ?? 3 }),
										done: current.done,
										total: current.total,
										tab: 'translate'
									});
								}
								return;
							}
							if (next === 'fallback') {
								state.nonStream = true;
								state.progressLabel = progressLabel(state.progress?.done || 0);
								const current = state.progress;
								if (current) {
									app.setTask('translate', {
										state: 'running',
										label: state.progressLabel,
										done: current.done,
										total: current.total,
										tab: 'translate'
									});
								}
							}
						}
					});
				}
				catch (e) {
					for (const segment of batch) {
						segment.pending = false;
						paintSegment(segment);
					}
					if (e.code === 'aborted') {
						return;
					}
					throw e;
				}
				const parsed = M.AI.parseJson(raw);
				const translations = Array.isArray(parsed?.translations) ? parsed.translations : [];
				if (granularity === 'paragraph' || !translations.length) {
					const text = (translations[0]?.text || raw || '').trim();
					for (const segment of batch) {
						state.translations.set(segment.id, text);
						segment.pending = false;
						paintSegment(segment);
					}
				}
				else {
					const byId = new Map(translations.map(item => [String(item.id), item.text]));
					for (const segment of batch) {
						const value = byId.get(segment.id);
						state.translations.set(segment.id, (value || '').trim() || '—');
						segment.pending = false;
						paintSegment(segment);
					}
				}
			}
		}

		async function start() {
			if (state.running) {
				// A run is still winding down (aborted requests, in-flight batches).
				// Dropping the request left the feature stuck on "running" forever —
				// reported as "turning it off and on does nothing". Remember it and act
				// when the current run finishes.
				state.restartRequested = true;
				M.Log.info('translate: start requested while a run is finishing; will continue after it');
				return;
			}
			state.nonStream = false;
			if (!M.AI.isConfigured()) {
				app.toast(t('toast.noKey'), 'error');
				app.openSettings();
				return;
			}
			if (!app.document) {
				app.toast(t('toast.noText'), 'error');
				return;
			}
			const pending = pendingParagraphs();
			if (!pending.length) {
				app.toast(t('translate.done'), 'success');
				return;
			}
			state.running = true;
			state.started = true;
			app.setError?.(null);
			state.abort = new M.Util.AbortController();
			app.setBusy(true);
			updateToolbarState();
			updateProgress();
			const signal = state.abort.signal;
			const concurrency = Math.max(1, Math.min(M.Prefs.getInt('concurrency', 3), 6));
			let firstError = null;
			const queue = pending.slice();
			const workers = new Array(concurrency).fill(0).map(async () => {
				for (;;) {
					const paragraph = queue.shift();
					if (!paragraph || signal.aborted) {
						return;
					}
					try {
						await translateParagraph(paragraph, signal);
					}
					catch (e) {
						firstError = firstError || e;
						M.Log.error('translate failed', e);
						if (!e.retryable) {
							state.abort.abort();
						}
					}
					updateProgress();
					persist();
				}
			});
			await Promise.all(workers);
			state.running = false;
			app.setBusy(false);
			const restart = state.restartRequested;
			state.restartRequested = false;
			// Repaint every card from the data: a batch may have completed after a
			// re-render, leaving `segment.el` pointing at a detached node (the text was
			// there, the screen was empty).
			paintAll();
			const result = updateProgress();
			M.Log.info('translate: run finished', {
				done: result.done,
				total: result.total,
				cards: state.cardById.size,
				segments: state.segments.length,
				attached: !!(list && list.isConnected)
			});
			setProgress(result.done, result.total, {
				state: signal.aborted && result.done < result.total ? 'paused' : 'done'
			});
			persist();
			updateToolbarState();
			if (restart && state.enabled && !firstError && pendingParagraphs().length) {
				M.Log.info('translate: continuing the interrupted run', {
					remaining: pendingParagraphs().length
				});
				start();
				return;
			}
			if (signal.aborted && !firstError) {
				app.toast(t('translate.stop'));
			}
			else if (firstError) {
				app.setError?.(firstError.message, {
					endpoint: firstError.endpoint,
					hint: t('error.hint')
				});
			}
			else {
				app.toast(t('translate.done'), 'success');
			}
		}

		function stop() {
			state.abort?.abort();
		}

		function retranslate() {
			state.translations.clear();
			if (state.record) {
				state.record.translation = {};
			}
			paintAll();
			setProgress(0, state.segments.length);
			persist();
			start();
		}

		// ------------------------------------------------------------- plumbing
		function markDockScrollProgrammatic() {
			state.selfScrolledDockAt = Date.now();
		}

		/**
		 * Scrolling the translation column keeps the PDF in step: after the scroll
		 * settles, reveal the paragraph of the first card that is fully visible.
		 */
		const syncPdfToDock = M.Util.debounce(() => {
			if (!state.enabled || !M.Prefs.getBool('followPdf', true)) {
				return;
			}
			// A programmatic dock scroll (hover → card) must not bounce back into a
			// PDF scroll: the round trip is what made the page judder.
			if (Date.now() - state.selfScrolledDockAt < 1200) {
				return;
			}
			if (Date.now() - state.userPdfIntentAt < 1200) {
				return;
			}
			// Measure against the scrolling host, not the list: the list itself is
			// translated by the scroll, which would make every card look visible.
			const host = app.dock?.scrollHost || list;
			const bodyRect = host.getBoundingClientRect();
			for (const paragraph of state.segments) {
				const card = state.cardByParagraph.get(paragraph.id);
				if (!card) {
					continue;
				}
				const rect = card.getBoundingClientRect();
				if (rect.bottom < bodyRect.top + 8) {
					continue;
				}
				if (rect.top > bodyRect.bottom - 8) {
					return;
				}
				if (M.PdfDoc.revealRects(app.reader, paragraph.pageIndex, paragraph.rects, {
					band: 0.12,
					margin: 24,
					cooldown: 260
				})) {
					state.selfScrolledAt = Date.now();
				}
				return;
			}
		}, 260);

		function onDockScroll() {
			state.userScrolledAt = Date.now();
			syncPdfToDock();
		}

		function bindPdfScroll() {
			const readerDoc = M.PdfDoc.getDocEl(app.reader);
			const container = readerDoc?.getElementById('viewerContainer');
			if (!container) {
				return;
			}
			const followPage = M.Util.throttleRaf(() => {
				if (!state.enabled || Date.now() - state.userScrolledAt < 3500) {
					return;
				}
				if (Date.now() - state.selfScrolledAt < 800) {
					// Our own reveal is still settling; following it would loop.
					return;
				}
				const pageIndex = M.PdfDoc.currentPageIndex(app.reader);
				if (pageIndex === state.followPageIndex) {
					return;
				}
				state.followPageIndex = pageIndex;
				const card = state.segments.find(paragraph => paragraph.pageIndex === pageIndex);
				if (!card) {
					return;
				}
				const el = state.cardByParagraph.get(card.id);
				if (el && !cardInView(el)) {
					app.scrollDockTo(el, { smooth: true });
					state.selfScrolledDockAt = Date.now();
				}
			});
			container.addEventListener('scroll', () => {
				state.pdfScrolledAt = Date.now();
			}, { passive: true });
			// Wheel / key / pointer input on the PDF is the only reliable signal that
			// the user is driving the view; a scroll event may be our own smooth
			// scroll finishing.
			const pdfDoc = M.PdfDoc.getPdfDocEl(app.reader);
			const markIntent = () => {
				state.userPdfIntentAt = Date.now();
				M.PdfDoc.noteUserScroll?.();
			};
			for (const type of ['wheel', 'touchmove', 'pointerdown', 'keydown']) {
				(pdfDoc || readerDoc)?.addEventListener(type, markIntent, { passive: true });
			}
			container.addEventListener('scroll', followPage, { passive: true });
			state.unbindScroll = () => container.removeEventListener('scroll', followPage);
		}

		async function load() {
			if (state.loaded) {
				return;
			}
			state.loaded = true;
			M.Dom.clear(list);
			list.appendChild(M.Dom.h(doc, 'div', { class: 'ml-para' }, [
				M.Dom.h(doc, 'div', { class: 'ml-skeleton', style: { width: '92%', margin: '3px 0' } }),
				M.Dom.h(doc, 'div', { class: 'ml-skeleton', style: { width: '70%', margin: '7px 0 3px' } })
			]));
			list.appendChild(M.Dom.h(doc, 'div', { class: 'ml-para' }, [
				M.Dom.h(doc, 'div', { class: 'ml-skeleton', style: { width: '84%', margin: '3px 0' } })
			]));
			statusLabel.textContent = t('summary.generating');

			await app.ensureDocument(p => {
				statusLabel.textContent = p.total
					? `${t('translate.progress')} ${p.page}/${p.total} ${t('translate.pages')}`
					: '';
			});
			if (!app.document) {
				M.Dom.clear(list);
				list.appendChild(M.Dom.h(doc, 'div', { class: 'ml-empty' }, [
					M.Dom.h(doc, 'div', { class: 'ml-empty-icon', html: M.Icons.get('alert') }),
					M.Dom.h(doc, 'div', { class: 'ml-empty-desc', text: t('translate.noText') })
				]));
				statusLabel.textContent = '';
				return;
			}

			state.segments = segmentsFromDocument();
			const record = await M.Cache.load(app.document.attachmentKey);
			hydrateFromCache(record);
			renderSegments();
			bindPdfScroll();
			const { done, total } = updateProgress();
			if (done && done === total) {
				statusLabel.textContent = t('translate.done');
			}
			else if (done) {
				statusLabel.textContent = t('translate.cached');
			}
			else {
				statusLabel.textContent = '';
			}
			if (!total) {
				M.Dom.clear(list);
				list.appendChild(M.Dom.h(doc, 'div', { class: 'ml-empty' }, [
					M.Dom.h(doc, 'div', { class: 'ml-empty-icon', html: M.Icons.get('alert') }),
					M.Dom.h(doc, 'div', { class: 'ml-empty-desc', text: t('translate.noText') })
				]));
			}
			else if (M.Prefs.getBool('autoTranslateOnOpen', false) && done < total) {
				start();
			}
			applySourceVisibility();
		}

		buildToolbar();
		root.append(toolbar, progressWrap, list, skippedNote);

		const api = {
			el: root,
			get enabled() {
				return state.enabled;
			},
			async activate() {
				if (!state.enabled) {
					state.enabled = true;
					if (!state.loaded) {
						await load();
					}
				}
			},
			deactivate() {
				state.enabled = false;
				stop();
				app.overlay.clear();
				// Keep everything that was already translated (and where we stopped) so
				// switching the feature back on resumes instead of restarting. A paused
				// row keeps its numbers on screen; a finished one clears itself.
				const { done, total } = updateProgress();
				if (total && done < total) {
					setProgress(done, total, { state: 'paused' });
				}
				else if (total) {
					app.setTask('translate', null);
				}
			},
			toggle(on) {
				if (on) {
					api.activate();
				}
				else {
					api.deactivate();
				}
			},
			async ensureLoaded() {
				if (!state.loaded) {
					await load();
				}
			},
			start,
			stop,
			retranslate,
			onPdfHover,
			onDockScroll,
			markDockScrollProgrammatic,
			refreshLayout() {
				applySourceVisibility();
			},
			destroy() {
				state.unbindScroll?.();
				stop();
			}
		};

		return api;
	}

	M.TranslateView = { create };
})();
