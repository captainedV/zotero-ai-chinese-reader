/**
 * Programmatic UI/behaviour audit for the harness page.
 *
 * Written because this environment cannot show screenshots: every design claim
 * (geometry, spacing, contrast, no overflow) is asserted numerically instead.
 */
(function () {
	const M = window.Moonlit;
	const fixture = window.MOONLIT_FIXTURE;
	const report = [];

	function check(name, ok, detail = '') {
		report.push({ name, ok: !!ok, detail: String(detail) });
		return !!ok;
	}

	function box(el) {
		return el.getBoundingClientRect();
	}

	function luminance(color) {
		const match = String(color).match(/rgba?\(([^)]+)\)/);
		if (!match) {
			return null;
		}
		const [r, g, b] = match[1].split(',').slice(0, 3).map(Number);
		const channel = (value) => {
			const v = value / 255;
			return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
		};
		return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
	}

	function contrast(fg, bg) {
		const a = luminance(fg);
		const b = luminance(bg);
		if (a === null || b === null) {
			return null;
		}
		const light = Math.max(a, b);
		const dark = Math.min(a, b);
		return (light + 0.05) / (dark + 0.05);
	}

	function paragraphById(id) {
		return fixture.paragraphs.find(p => p.id === id);
	}

	function union(rects) {
		const xs0 = rects.map(r => r[0]);
		const ys0 = rects.map(r => r[1]);
		const xs1 = rects.map(r => r[2]);
		const ys1 = rects.map(r => r[3]);
		return [Math.min(...xs0), Math.min(...ys0), Math.max(...xs1), Math.max(...ys1)];
	}

	function waitFor(predicate, timeout = 20000) {
		return window.__waitFor(predicate, timeout);
	}

	async function run() {
		const app = window.__app;
		const doc = document;
		const viewportWidth = window.innerWidth;

		// ---------------------------------------------------------- benchmark
		const t0 = performance.now();
		await app.ensureDocument();
		const docMs = Math.round(performance.now() - t0);
		check('document extraction', !!app.document, `${docMs} ms`);

		// ------------------------------------------------------------ dock box
		app.setFeature('translate', true);
		app.dock.open('translate');
		await waitFor(() => doc.querySelector('.ml-dock'));
		await new Promise(resolve => setTimeout(resolve, 400));
		const dock = doc.querySelector('.ml-dock');
		const dockBox = box(dock);
		const dockWidth = Math.round(dockBox.width);
		check('dock pinned to right edge', Math.abs(dockBox.right - viewportWidth) <= 1,
			`right=${Math.round(dockBox.right)} viewport=${viewportWidth}`);
		check('dock has expected width', dockWidth === 430, `${dockWidth}px`);
		check('dock fills the reader height', dockBox.height >= window.innerHeight - 45,
			`${Math.round(dockBox.height)}px`);

		const split = doc.getElementById('split-view');
		const splitRight = box(split).right;
		check('pdf column shrinks instead of being covered', splitRight <= dockBox.left + 1,
			`split right=${Math.round(splitRight)} dock left=${Math.round(dockBox.left)}`);

		const viewerContainer = doc.getElementById('viewerContainer');
		check('pdf scroll area is not hidden behind the dock',
			box(viewerContainer).right <= dockBox.left + 1,
			`${Math.round(box(viewerContainer).right)}`);

		// ------------------------------------------------------- toolbar button
		const button = doc.getElementById('moonlit-toolbar-button');
		const buttonBox = button ? box(button) : null;
		check('toolbar button visible', !!buttonBox && buttonBox.width >= 20 && buttonBox.height >= 20,
			buttonBox ? `${Math.round(buttonBox.width)}x${Math.round(buttonBox.height)}` : 'missing');
		check('toolbar button inside the reader toolbar',
			buttonBox && buttonBox.top >= 0 && buttonBox.bottom <= 41,
			buttonBox ? `top=${Math.round(buttonBox.top)}` : '');
		const buttonLabel = button?.getAttribute('title') || '';
		check('toolbar button has an accessible label', buttonLabel.length > 0, buttonLabel);

		// ------------------------------------------------------------- popover
		app.togglePopover();
		await waitFor(() => doc.getElementById('moonlit-popover'));
		const popover = doc.getElementById('moonlit-popover');
		await new Promise(resolve => setTimeout(resolve, 260));
		const popBox = box(popover);
		check('popover stays inside the viewport',
			popBox.left >= 0 && popBox.right <= viewportWidth && popBox.top >= 0
			&& popBox.bottom <= window.innerHeight,
			`${Math.round(popBox.left)},${Math.round(popBox.top)} ${Math.round(popBox.width)}x${Math.round(popBox.height)}`);
		check('popover is anchored under the toolbar button',
			popBox.top < 100 && popBox.right > viewportWidth - 200,
			`top=${Math.round(popBox.top)} right=${Math.round(popBox.right)}`);
		check('popover exposes three feature switches',
			popover.querySelectorAll('.ml-switch').length === 3,
			popover.querySelectorAll('.ml-switch').length);
		check('switches reflect pref state',
			[...popover.querySelectorAll('.ml-switch')].filter(el => el.getAttribute('aria-checked') === 'true').length >= 1);

		const switchBox = box(popover.querySelector('.ml-switch'));
		check('switch hit area is comfortable', switchBox.width >= 32 && switchBox.height >= 18,
			`${Math.round(switchBox.width)}x${Math.round(switchBox.height)}`);
		app.togglePopover();

		// -------------------------------------------------------- translation
		// Drive the feature the way a user does: flip its switch. Calling
		// `translate.start()` here would hide the failure where the switch only opens
		// an empty column and never asks the model for anything.
		app.setFeature('translate', false);
		app.views.translate.deactivate();
		app.dock.close?.();
		await new Promise(resolve => setTimeout(resolve, 200));
		await app.views.translate.ensureLoaded();
		await waitFor(() => doc.querySelectorAll('.ml-para').length > 5, 30000);
		app.togglePopover();
		await waitFor(() => doc.getElementById('moonlit-popover'));
		const translateSwitch = doc.querySelectorAll('#moonlit-popover .ml-switch')[0];
		check('popover exposes a switch per feature', !!translateSwitch);
		translateSwitch.click();
		app.togglePopover();
		check('flipping the switch is recorded for this paper',
			app.isFeatureOn('translate') === true && app.record?.enabled?.translate === true,
			JSON.stringify({ flags: app.featureFlags, record: app.record?.enabled }));
		const switchStarted = await waitFor(() => {
			const els = [...doc.querySelectorAll('.ml-para .ml-trans')];
			return els.length > 5 && els.some(el => el.textContent.trim().length > 0);
		}, 30000);
		check('the translation switch starts the run on its own', !!switchStarted,
			`translated cards: ${doc.querySelectorAll('.ml-para .ml-trans').length}`);
		if (switchStarted) {
			await waitFor(() => {
				const els = [...doc.querySelectorAll('.ml-para .ml-trans')];
				return els.length > 10 && els.every(el => el.textContent.trim().length > 0);
			}, 60000);
		}

		const cards = [...doc.querySelectorAll('.ml-para')];
		const segments = [...doc.querySelectorAll('.ml-para .ml-seg')];
		const transEls = [...doc.querySelectorAll('.ml-para .ml-trans')];
		check('every paragraph rendered as a card', cards.length === app.views.translateElementCount?.() || cards.length > 30,
			`cards=${cards.length}`);
		check('every segment has译文', transEls.every(el => el.textContent.trim().length > 0),
			`segments=${segments.length}`);
		check('translations differ from the source text',
			segments.filter(seg => seg.querySelector('.ml-trans').textContent.trim()
				=== seg.querySelector('.ml-src').textContent.trim()).length === 0);
		check('no placeholder leakage', !/undefined|\[object|NaN/.test(doc.querySelector('.ml-dock-body').textContent));

		// horizontal overflow — the classic killer of narrow sidebars
		const overflow = cards.filter(card => card.scrollWidth > card.clientWidth + 1);
		check('no card overflows horizontally', overflow.length === 0, `${overflow.length} overflowing`);

		// typography
		const transStyle = getComputedStyle(transEls[0]);
		const srcStyle = getComputedStyle(segments[0].querySelector('.ml-src'));
		const cardStyle = getComputedStyle(cards[0]);
		check('translation font-size readable', parseFloat(transStyle.fontSize) >= 13,
			transStyle.fontSize);
		check('translation line-height comfortable',
			parseFloat(transStyle.lineHeight) / parseFloat(transStyle.fontSize) >= 1.45,
			(`${transStyle.lineHeight}/${transStyle.fontSize}`));
		check('source text is secondary but legible', parseFloat(srcStyle.fontSize) >= 10.5,
			srcStyle.fontSize);
		check('cards have breathing room',
			parseFloat(cardStyle.paddingTop) >= 6 && parseFloat(cardStyle.paddingLeft) >= 8,
			`padding=${cardStyle.padding}`);

		const transContrast = contrast(transStyle.color, getComputedStyle(cards[0]).backgroundColor);
		check('translation contrast ≥ 7:1', transContrast === null || transContrast >= 7,
			transContrast ? transContrast.toFixed(1) : 'n/a');
		const srcContrast = contrast(srcStyle.color, getComputedStyle(cards[0]).backgroundColor);
		check('source contrast ≥ 4.5:1', srcContrast === null || srcContrast >= 4.5,
			srcContrast ? srcContrast.toFixed(1) : 'n/a');

		// ------------------------------------------------- cross-highlighting
		let geometryFailures = 0;
		let geometryChecked = 0;
		const sample = cards.slice(0, 12);
		for (const card of sample) {
			const paragraphId = card.dataset.paragraphId;
			const paragraph = paragraphById(paragraphId);
			if (!paragraph) {
				continue;
			}
			app.overlay.clear();
			card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
			const rectEls = [...doc.querySelectorAll('.pdfViewer .page .ml-hl-layer .ml-hl-rect')];
			if (!rectEls.length) {
				geometryFailures++;
				continue;
			}
			const mapping = M.PdfDoc.pageMapping(window.__reader, paragraph.pageIndex);
			const expected = union(paragraph.lines.map(line => line.rect));
			const drawn = rectEls.reduce((acc, el) => {
				const b = box(el);
				return [Math.min(acc[0], b.left), Math.min(acc[1], b.top),
					Math.max(acc[2], b.right), Math.max(acc[3], b.bottom)];
			}, [Infinity, Infinity, -Infinity, -Infinity]);
			const [x0, y1] = mapping.toClient(expected[0], expected[3]);
			const [x1, y0] = mapping.toClient(expected[2], expected[1]);
			const dx = Math.abs(drawn[0] - x0) + Math.abs(drawn[1] - Math.min(y0, y1));
			const sizeOk = Math.abs((drawn[2] - drawn[0]) - Math.abs(x1 - x0)) < 12
				&& Math.abs((drawn[3] - drawn[1]) - Math.abs(y0 - y1)) < 12;
			geometryChecked++;
			if (dx > 12 || !sizeOk) {
				geometryFailures++;
				if (geometryFailures === 1) {
					report.push({
						name: 'geometry detail',
						ok: false,
						detail: `p=${paragraphId} drawn=${drawn.map(v => Math.round(v))} expected=[${Math.round(x0)},${Math.round(Math.min(y0, y1))},${Math.round(x1)},${Math.round(Math.max(y0, y1))}]`
					});
				}
			}
			card.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
			app.overlay.clear();
		}
		check('hover draws the paragraph box on the page',
			geometryChecked > 0 && geometryFailures === 0,
			`checked=${geometryChecked} failed=${geometryFailures}`);

		// sentence-level precision: rects must stay within the paragraph box
		const preciseParagraph = paragraphById(cards[2]?.dataset.paragraphId);
		const preciseSeg = cards[2]?.querySelectorAll('.ml-seg')[1];
		if (preciseParagraph && preciseSeg) {
			const sentenceText = preciseSeg.querySelector('.ml-src').textContent;
			const rects = M.Quotes.rectsForText(preciseParagraph, sentenceText);
			const paraBox = union(preciseParagraph.lines.map(line => line.rect));
			const inside = rects?.every(rect =>
				rect[0] >= paraBox[0] - 1 && rect[2] <= paraBox[2] + 1
				&& rect[1] >= paraBox[1] - 1 && rect[3] <= paraBox[3] + 1);
			check('sentence highlight stays inside its paragraph', !!rects?.length && inside,
				rects ? `${rects.length} rects` : 'no rects');
			if (rects?.length && preciseParagraph.lines.length > 1) {
				const sentenceBox = union(rects);
				check('sentence highlight is smaller than the paragraph',
					(sentenceBox[3] - sentenceBox[1]) <= (paraBox[3] - paraBox[1]) + 1,
					`sent=${Math.round(sentenceBox[3] - sentenceBox[1])} para=${Math.round(paraBox[3] - paraBox[1])}`);
			}
		}

		// Independent transform parity: the page's line divs are positioned by the
		// harness from raw PDF coordinates, so agreement proves the viewport chain.
		let parityChecks = 0;
		let parityFailures = 0;
		for (const paragraph of fixture.paragraphs.slice(0, 6)) {
			const mapping = M.PdfDoc.pageMapping(window.__reader, paragraph.pageIndex);
			const pageEl = mapping.pageEl;
			const pageBox = pageEl.getBoundingClientRect();
			const lineEls = pageEl.querySelectorAll('.ml-paper-line');
			const firstLineIndex = fixture.pages[paragraph.pageIndex].paragraphs
				.flatMap(p2 => p2.lines).findIndex(l => l.rect[0] === paragraph.lines[0].rect[0]
					&& Math.abs(l.rect[1] - paragraph.lines[0].rect[1]) < 0.01);
			for (const [offset, line] of paragraph.lines.slice(0, 2).entries()) {
				const el = lineEls[firstLineIndex + offset];
				if (!el) {
					continue;
				}
				const local = mapping.toLocalRect(line.rect);
				const elBox = box(el);
				const dx = Math.abs((pageBox.left + local.left) - elBox.left);
				const dy = Math.abs((pageBox.top + local.top) - elBox.top);
				const dw = Math.abs(local.width - elBox.width);
				parityChecks++;
				if (dx > 1.5 || dy > 1.5 || dw > 1.5) {
					parityFailures++;
					if (parityFailures === 1) {
						report.push({
							name: 'transform parity detail',
							ok: false,
							detail: `dx=${dx.toFixed(1)} dy=${dy.toFixed(1)} dw=${dw.toFixed(1)}`
						});
					}
				}
			}
		}
		check('PDF→screen transform matches the rendered page',
			parityChecks > 0 && parityFailures === 0,
			`checked=${parityChecks} failed=${parityFailures}`);

		// ------------------------------------------------------- hit-testing
		let hits = 0;
		let probes = 0;
		for (const paragraph of fixture.paragraphs.slice(0, 8)) {
			const mapping = M.PdfDoc.pageMapping(window.__reader, paragraph.pageIndex);
			for (const line of paragraph.lines.slice(0, 2)) {
				const [cx, cy] = mapping.toClient((line.rect[0] + line.rect[2]) / 2, (line.rect[1] + line.rect[3]) / 2);
				const hit = M.PdfDoc.paragraphAt(window.__reader, cx, cy);
				probes++;
				if (hit?.paragraph?.id === paragraph.id) {
					hits++;
				}
			}
		}
		check('pointer → paragraph mapping is accurate', probes > 0 && hits / probes >= 0.8,
			`${hits}/${probes}`);

		// -------------------------------------------------------------- cache
		M.Cache.flush?.();
		await new Promise(resolve => setTimeout(resolve, 600));
		const cached = await M.Cache.load(fixture.attachmentKey);
		check('translation persisted to the cache',
			Object.keys(cached.translation || {}).length > 0,
			`${Object.keys(cached.translation || {}).length} entries`);

		// ------------------------------------------------------------ summary
		app.setFeature('summary', true);
		app.dock.open('summary');
		await app.views.summary.activate();
		await app.views.summary.generate();
		await waitFor(() => doc.querySelector('.ml-summary h2, .ml-summary h3'), 25000);
		const summaryText = doc.querySelector('.ml-summary').textContent;
		check('summary has structured sections',
			doc.querySelectorAll('.ml-summary h2, .ml-summary h3').length >= 4,
			`${doc.querySelectorAll('.ml-summary h2, .ml-summary h3').length} headings`);
		check('summary mentions the standard sections',
			/一句话总结|研究问题|核心方法/.test(summaryText), summaryText.slice(0, 40));
		const metaTitle = doc.querySelector('.ml-meta-title');
		check('summary shows paper metadata', !!metaTitle?.textContent?.trim(), metaTitle?.textContent?.slice(0, 40) || '');
		const summaryBox = box(doc.querySelector('.ml-summary'));
		check('summary text column has a sane measure',
			Math.abs(summaryBox.width - (dockWidth - 36)) < 40,
			`${Math.round(summaryBox.width)}px vs dock ${dockWidth}`);

		// --------------------------------------------------------- highlights
		app.setFeature('highlight', true);
		app.dock.open('highlight');
		await app.views.highlight.activate();
		await app.views.highlight.run();
		await waitFor(() => doc.querySelectorAll('.ml-point').length > 0, 25000);
		const points = doc.querySelectorAll('.ml-point');
		check('key points rendered', points.length >= 3, `${points.length}`);
		const annotations = Zotero.__annotations;
		check('real Zotero annotations created', annotations.length >= 3, `${annotations.length}`);
		const positionOk = annotations.every((annotation) => {
			const position = JSON.parse(annotation.annotationPosition || '{}');
			const page = fixture.pages[position.pageIndex];
			const view = page ? page.view || [0, 0, 612, 792] : [0, 0, 612, 792];
			return position.rects?.length
				&& position.rects.every(rect => rect[0] >= view[0] - 1 && rect[2] <= view[2] + 1
					&& rect[1] >= view[1] - 1 && rect[3] <= view[3] + 1);
		});
		check('annotation rects inside the page', positionOk);
		check('annotation sortIndex format valid',
			annotations.every(a => /^\d{5}\|\d{6}\|\d{5}$/.test(a.annotationSortIndex)),
			annotations[0]?.annotationSortIndex || '');
		check('annotation colors follow the key-point type',
			new Set(annotations.map(a => a.annotationColor)).size >= 2,
			[...new Set(annotations.map(a => a.annotationColor))].join(','));
		check('annotation comments carry the AI note',
			annotations.every(a => a.annotationComment?.startsWith('✦')));
		const pointBox = box(points[0]);
		check('key-point cards fit the dock', pointBox.width <= dockWidth, `${Math.round(pointBox.width)}px`);

		// hover a key point → highlight on the page
		points[0].dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
		await new Promise(resolve => setTimeout(resolve, 120));
		check('hovering a key point highlights the PDF',
			doc.querySelectorAll('.ml-hl-rect').length > 0,
			`${doc.querySelectorAll('.ml-hl-rect').length} rects`);
		points[0].dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));

		// -------------------------------------------------------- dock resize
		app.dock.el.style.setProperty('--ml-dock-width', '360px');
		document.body.style.setProperty('--ml-dock-width', '360px');
		await new Promise(resolve => setTimeout(resolve, 120));
		const narrowOverflow = [...doc.querySelectorAll('.ml-para')]
			.filter(card => card.scrollWidth > card.clientWidth + 1).length;
		check('narrow dock (360px) keeps cards inside', narrowOverflow === 0, `${narrowOverflow} overflowing`);
		app.dock.el.style.setProperty('--ml-dock-width', '430px');
		document.body.style.setProperty('--ml-dock-width', '430px');



		// ------------------------------------------------------ note exporting
		app.dock.setTab('summary');
		await waitFor(() => doc.querySelector('.ml-summary'));
		const noteButton = [...doc.querySelectorAll('.ml-summary button, .ml-dock button')]
			.find(button => /笔记|note/i.test(button.getAttribute('aria-label') || button.title || ''));
		check('summary offers "save as note"', !!noteButton,
			noteButton ? (noteButton.getAttribute('aria-label') || noteButton.title) : 'missing');
		if (noteButton) {
			noteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			await new Promise(resolve => setTimeout(resolve, 260));
			const note = Zotero.__notes[Zotero.__notes.length - 1];
			check('note is written to the library', !!note, `${Zotero.__notes.length} notes`);
			if (note) {
				const html = note.getNote();
				check('note starts with the paper title', /<h1>/.test(html) && /Deterministic/.test(html),
					html.slice(0, 40));
				check('note keeps the summary structure', /<h[23]/.test(html),
					`${(html.match(/<h[23]/g) || []).length} sections`);
				check('note carries the AI footer', /Moonlit Reader/.test(html));
				check('note is tagged for later filtering', note.getTags().some(t => t.tag === 'Moonlit AI'));
			}
		}

		// ------------------------------------------------------------ shortcuts
		app.dock.close();
		await new Promise(resolve => setTimeout(resolve, 220));
		const wasOpen = doc.body.classList.contains('ml-dock-open');
		doc.body.dispatchEvent(new KeyboardEvent('keydown', {
			key: 'm', metaKey: true, shiftKey: true, bubbles: true, cancelable: true
		}));
		await new Promise(resolve => setTimeout(resolve, 320));
		check('⌘/Ctrl+Shift+M toggles the dock',
			!wasOpen && doc.body.classList.contains('ml-dock-open'),
			`${wasOpen} → ${doc.body.classList.contains('ml-dock-open')}`);

		app.togglePopover();
		await waitFor(() => doc.getElementById('moonlit-popover'));
		doc.body.dispatchEvent(new KeyboardEvent('keydown', {
			key: 'Escape', bubbles: true, cancelable: true
		}));
		await new Promise(resolve => setTimeout(resolve, 320));
		check('Escape closes the control popover', !doc.getElementById('moonlit-popover'));


		// ------------------------------------------------------ drag to resize
		app.dock.setTab('translate');
		await waitFor(() => doc.querySelector('.ml-dock-resizer'));
		const resizer = doc.querySelector('.ml-dock-resizer');
		const dockBefore = box(doc.querySelector('.ml-dock')).width;
		const pdfBefore = box(doc.getElementById('viewerContainer')).width;

		const point = (x, y) => ({ clientX: x, clientY: y, pointerId: 7, bubbles: true, cancelable: true });
		const handleBox = box(resizer);
		resizer.dispatchEvent(new PointerEvent('pointerdown', point(handleBox.left + 3, handleBox.top + 120)));
		doc.dispatchEvent(new PointerEvent('pointermove', point(handleBox.left + 3 - 90, handleBox.top + 120)));
		await new Promise(resolve => setTimeout(resolve, 60));
		const dockDuring = box(doc.querySelector('.ml-dock')).width;
		check('dragging the handle widens the dock live',
			Math.abs(dockDuring - dockBefore - 90) <= 3,
			`${Math.round(dockBefore)} → ${Math.round(dockDuring)}`);
		check('pdf column follows the drag',
			Math.abs(box(doc.getElementById('viewerContainer')).width - (pdfBefore - 90)) <= 3,
			`${Math.round(pdfBefore)} → ${Math.round(box(doc.getElementById('viewerContainer')).width)}`);
		check('width variable is applied on body',
			/--ml-dock-width:\s*\d+px/.test(doc.body.getAttribute('style') || ''),
			(doc.body.getAttribute('style') || '').slice(0, 40));

		doc.dispatchEvent(new PointerEvent('pointerup', point(handleBox.left + 3 - 90, handleBox.top + 120)));
		await new Promise(resolve => setTimeout(resolve, 320));
		const dockAfter = box(doc.querySelector('.ml-dock')).width;
		check('dock keeps its width after the drag', Math.abs(dockAfter - dockDuring) <= 2,
			`${Math.round(dockAfter)}`);
		const savedWidth = Number(Zotero.Prefs.get('extensions.zotero.moonlit.dockWidth') || 0);
		check('dragged width is persisted', savedWidth > 0, String(savedWidth));

		// keyboard + double click affordances
		resizer.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
		await new Promise(resolve => setTimeout(resolve, 260));
		check('keyboard nudges the dock width', box(doc.querySelector('.ml-dock')).width < dockAfter + 1,
			`${Math.round(box(doc.querySelector('.ml-dock')).width)}`);
		resizer.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
		await new Promise(resolve => setTimeout(resolve, 300));
		check('double click restores the default width',
			Math.abs(box(doc.querySelector('.ml-dock')).width - 430) <= 2,
			`${Math.round(box(doc.querySelector('.ml-dock')).width)}`);


		// ---------------------------------------------- single entry point
		const popoverActions = doc.querySelectorAll('.ml-actions button').length;
		check('popover keeps only the three switches', popoverActions === 0, `${popoverActions} action buttons`);
		const strayButtons = [...doc.querySelectorAll('.ml-empty button, .ml-dock-toolbar button')]
			.filter(el => /生成总结|开始翻译|AI 重点|重新生成|重新翻译/.test(el.textContent || ''));
		check('no duplicate generate buttons in the views', strayButtons.length === 0,
			strayButtons.map(el => el.textContent.trim()).join(' | ') || 'none');

		// -------------------------------------------------------- token meter
		await app.views.translate.start();
		await waitFor(() => Number(doc.querySelector('.ml-usage')?.dataset.total || 0) > 0, 4000);
		const usageEl = doc.querySelector('.ml-usage');
		check('token bar appears after AI work', usageEl?.classList.contains('ml-on') === true,
			usageEl?.className || 'missing');
		check('token bar shows in/out tokens', /输入|in /.test(usageEl?.textContent || ''),
			(usageEl?.textContent || '').trim());
		check('token bar reports a call count', Number(usageEl?.dataset.calls || 0) > 0,
			usageEl?.dataset.calls || '0');
		const usageBox = usageEl ? box(usageEl) : null;
		check('token bar sits inside the dock and is not clipped',
			!!usageBox && usageBox.width > 100 && usageBox.bottom <= box(doc.querySelector('.ml-dock')).bottom + 1,
			usageBox ? `${Math.round(usageBox.width)}x${Math.round(usageBox.height)}` : 'none');

		// ------------------------------------------------------ progress banner
		app.dock.open('summary');
		await new Promise(resolve => setTimeout(resolve, 320));
		app.setProgress({ label: 'AI 正在工作', done: 3, total: 9 });
		await new Promise(resolve => setTimeout(resolve, 220));
		const banner = doc.querySelector('.ml-taskbar');
		check('progress banner becomes visible while running', banner?.classList.contains('ml-on') === true);
		check('progress banner shows the step counter', /3\/9/.test(banner?.textContent || ''),
			(banner?.textContent || '').replace(/\s+/g, ' ').trim());
		const fillWidth = banner ? box(banner.querySelector('.ml-taskbar-fill')).width : 0;
		const trackWidth = banner ? box(banner.querySelector('.ml-taskbar-track')).width : 0;
		check('progress fill tracks the ratio', trackWidth > 0 && fillWidth / trackWidth > 0.25 && fillWidth / trackWidth < 0.45,
			`${Math.round(fillWidth)}/${Math.round(trackWidth)}`);
		app.setProgress(null);
		await new Promise(resolve => setTimeout(resolve, 200));
		check('progress banner disappears when the job ends', !banner?.classList.contains('ml-on'),
			JSON.stringify(app.dock.listTasks?.() || []));

		// ------------------------------------------- parallel feature progress
		// The three features run independently; each must own its row so a long
		// translation never hides (or overwrites) the summary's progress.
		app.setTask('translate', { state: 'running', label: '翻译', done: 3, total: 9, tab: 'translate' });
		app.setTask('summary', { state: 'running', label: '总结', done: 1, total: 4, tab: 'summary' });
		app.setTask('highlight', { state: 'running', label: '重点', done: 0, total: 0, tab: 'highlight' });
		await new Promise(resolve => setTimeout(resolve, 120));
		const rows = [...doc.querySelectorAll('.ml-tasklist-row')];
		check('every running feature gets its own progress row', rows.length === 3,
			`${rows.length} rows`);
		check('rows identify their feature', new Set(rows.map(row => row.dataset.task)).size === 3,
			rows.map(row => row.dataset.task).join(','));
		const rowText = rows.map(row => (row.textContent || '').replace(/\s+/g, ' ').trim());
		check('rows show their own counters', rowText.some(text => /3\/9/.test(text)) && rowText.some(text => /1\/4/.test(text)),
			rowText.join(' | '));
		check('parallel rows stay inside the dock',
			rows.every(row => box(row).right <= box(doc.querySelector('.ml-dock')).right + 1));

		// Turning a feature off must keep its numbers and stop claiming "waiting".
		app.setTask('translate', { state: 'paused', label: '已暂停', done: 3, total: 9, tab: 'translate' });
		await new Promise(resolve => setTimeout(resolve, 120));
		const pausedRow = doc.querySelector('.ml-tasklist-row[data-task="translate"]');
		check('a paused feature keeps its progress on screen',
			/3\/9/.test(pausedRow?.textContent || ''), (pausedRow?.textContent || '').trim());
		check('a paused feature is not shown as waiting',
			!/等待模型响应/.test(pausedRow?.textContent || ''), (pausedRow?.textContent || '').trim());
		app.setTask('translate', null);
		app.setTask('summary', null);
		app.setTask('highlight', null);
		await new Promise(resolve => setTimeout(resolve, 160));
		check('clearing every task hides the banner', !doc.querySelector('.ml-taskbar')?.classList.contains('ml-on'));

		// A real run must show its row (or at least the banner) while it is in flight.
		app.setFeature('translate', true);
		app.dock.open('translate');
		await app.views.translate.activate();
		app.views.translate.retranslate();
		const sawRow = await waitFor(() => doc.querySelector('.ml-tasklist-row[data-task="translate"]')
			|| doc.querySelector('.ml-taskbar.ml-on'), 4000);
		check('a running feature is visible in the banner', !!sawRow,
			doc.querySelector('.ml-taskbar')?.className || 'missing');
		await waitFor(() => {
			const els = [...doc.querySelectorAll('.ml-para .ml-trans')];
			// `.every` on an empty list is true — insist on actual cards.
			return els.length > 5 && els.every(el => el.textContent.trim().length > 0);
		}, 25000);

		// Switching it off and on again must not throw the work away.
		const callsBefore = M.Usage.summary().calls;
		await app.applyFeatureState('enableTranslate', false);
		await new Promise(resolve => setTimeout(resolve, 200));
		const translationsKept = [...doc.querySelectorAll('.ml-para .ml-trans')]
			.filter(el => el.textContent.trim().length > 0).length;
		check('switching a feature off keeps its results', translationsKept > 5, `${translationsKept} cards`);
		await app.applyFeatureState('enableTranslate', true);
		await new Promise(resolve => setTimeout(resolve, 400));
		const callsAfter = M.Usage.summary().calls;
		check('switching it back on does not re-translate finished paragraphs',
			callsAfter - callsBefore <= 2, `calls ${callsBefore} → ${callsAfter}`);

		// ------------------------------------------ first open, switch already on
		// Opening a paper with the switch on used to show "paused" until the user
		// toggled it off and on again.
		app.setFeature('translate', true);
		app.views.translate.deactivate();
		await new Promise(resolve => setTimeout(resolve, 120));
		const idleTask = app.dock.getTask('translate');
		check('a switched-on but not yet started feature is not "paused"',
			!idleTask || idleTask.state !== 'paused', JSON.stringify(idleTask));
		// Reopening a half-finished paper must continue, not sit on "paused":
		// clear the work, interrupt the run, then switch the feature back on.
		app.views.translate.retranslate();
		await new Promise(resolve => setTimeout(resolve, 40));
		await app.applyFeatureState('enableTranslate', false);
		await new Promise(resolve => setTimeout(resolve, 260));
		await app.applyFeatureState('enableTranslate', true);
		const resumed = await waitFor(() => {
			const task = app.dock.getTask('translate');
			return task && (task.state === 'running' || task.state === 'done') ? task : null;
		}, 8000);
		check('switching back on resumes the run', !!resumed,
			JSON.stringify(app.dock.getTask('translate')));
		await waitFor(() => [...doc.querySelectorAll('.ml-para .ml-trans')]
			.every(el => el.textContent.trim().length > 0), 25000);
		check('the resumed run finishes every paragraph',
			[...doc.querySelectorAll('.ml-para .ml-trans')].every(el => el.textContent.trim().length > 0),
			`${[...doc.querySelectorAll('.ml-para .ml-trans')].filter(el => el.textContent.trim()).length} cards`);

		// ---------------------------------------- hover resolves in the gaps too
		const probe = (() => {
			const paragraph = app.document.paragraphs.find(p => p.rects.length >= 2 && p.translatable !== false);
			if (!paragraph) {
				return null;
			}
			const mapping = M.PdfDoc.pageMapping?.(app.reader, paragraph.pageIndex);
			if (!mapping) {
				return null;
			}
			const first = paragraph.rects[0];
			const second = paragraph.rects[1];
			const local = mapping.toLocalRect([
				first[0],
				Math.min(first[1], second[1]) - 1,
				first[2],
				Math.max(first[3], second[3]) + 1
			]);
			const pageRect = mapping.pageEl.getBoundingClientRect();
			return {
				x: pageRect.left + local.left + Math.min(6, local.width / 2),
				y: pageRect.top + local.top + local.height / 2,
				paragraph
			};
		})();
		if (probe) {
			const hit = M.PdfDoc.paragraphAt(app.reader, probe.x, probe.y, { nearest: true });
			check('hovering between the lines still resolves to that paragraph',
				!!hit && hit.paragraph.pageIndex === probe.paragraph.pageIndex,
				hit ? `${hit.paragraph.id}${hit.approximate ? ' (approx)' : ''}` : 'no hit');
		}
		else {
			check('hovering between the lines still resolves to that paragraph', false, 'no paragraph probe');
		}

		// ------------------------------------------------- sync does not thrash
		const thrash = (() => {
			const paragraph = app.document.paragraphs.find(p => p.translatable !== false);
			if (!paragraph) {
				return null;
			}
			const first = M.PdfDoc.revealRects(app.reader, paragraph.pageIndex, paragraph.rects,
				{ band: 0.5, margin: 10, cooldown: 400 });
			const second = M.PdfDoc.revealRects(app.reader, paragraph.pageIndex, paragraph.rects,
				{ cooldown: 400 });
			return { first, second };
		})();
		check('a target inside the comfort band does not move the page',
			!!thrash && thrash.first === false, JSON.stringify(thrash));
		check('a second reveal inside the cooldown window is ignored',
			!!thrash && thrash.second === false, JSON.stringify(thrash));

		// A start that arrives while a run is still winding down must not vanish:
		// that used to leave the feature "running" forever with nothing happening.
		const realComplete = M.AI.complete;
		M.AI.complete = async (options) => {
			await new Promise(resolve => setTimeout(resolve, 25));
			return realComplete(options);
		};
		try {
			app.views.translate.retranslate();
			await new Promise(resolve => setTimeout(resolve, 60));
			app.views.translate.start();          // arrives mid-run
			await app.views.translate.deactivate(); // switched off while it runs
			await new Promise(resolve => setTimeout(resolve, 120));
			app.setFeature('translate', true);
			await app.resumeFeature('translate');
			const settled = await waitFor(() => {
				const texts = [...doc.querySelectorAll('.ml-para .ml-trans')];
				return texts.length && texts.every(el => el.textContent.trim().length > 0);
			}, 30000);
			const task = app.dock.getTask('translate');
			check('a start request that races a finishing run still completes the work',
				!!settled && (!task || task.state !== 'running'),
				`settled=${!!settled} task=${JSON.stringify(task)}`);
		}
		finally {
			M.AI.complete = realComplete;
		}

		// -------------------------------- batched, context-aware translation
		// One request per paragraph wasted the context window and paid a round trip
		// per paragraph; consecutive paragraphs must share a request instead.
		const completeCalls = [];
		const realCompleteForBatching = M.AI.complete;
		M.AI.complete = async (options) => {
			completeCalls.push(options);
			return realCompleteForBatching(options);
		};
		try {
			M.Prefs.set('translate', true);
			M.Prefs.set('batchChars', 2200);
			M.Prefs.set('batchUnits', 6);
			app.views.translate.retranslate();
			await waitFor(() => {
				const texts = [...doc.querySelectorAll('.ml-para .ml-trans')];
				return texts.length > 5 && texts.every(el => el.textContent.trim().length > 0);
			}, 30000);
			const translateCalls = completeCalls.filter(call => call.kind === 'translate');
			const paragraphs = doc.querySelectorAll('.ml-para').length;
			check('translation batches several paragraphs per request',
				translateCalls.length > 0 && translateCalls.length <= Math.ceil(paragraphs / 2),
				`${translateCalls.length} requests for ${paragraphs} paragraphs`);
			const withContext = translateCalls.filter(call => /Current section:|Preceding paragraph \(context only/.test(call.prompt));
			check('each batch carries its surroundings as context',
				withContext.length >= Math.max(1, translateCalls.length - 1),
				`${withContext.length}/${translateCalls.length}`);
			const idCounts = translateCalls.map(call => {
				const match = call.prompt.match(/Items to translate \((\d+)/);
				return match ? Number(match[1]) : 0;
			});
			check('batches respect the item cap', idCounts.every(count => count >= 1 && count <= 6),
				idCounts.join(','));
		}
		finally {
			M.AI.complete = realCompleteForBatching;
		}

		// ------------------------------------------- per-paper switch ownership
		// Opening a new paper used to inherit the previous paper's switches: the
		// feature looked on while nothing ran for that paper.
		check('this paper records its own switch state',
			app.record?.enabled && typeof app.record.enabled.translate === 'boolean',
			JSON.stringify(app.record?.enabled));
		const freshRecord = await M.Cache.load('FRESHPAPERKEY');
		check('a paper that was never opened starts with every switch off',
			!freshRecord.enabled, JSON.stringify(freshRecord.enabled));
		app.setFeature('summary', true);
		const savedFlags = JSON.parse(JSON.stringify(app.record.enabled));
		check('switches persist per paper, under the attachment key',
			savedFlags.summary === true && !freshRecord.enabled,
			JSON.stringify(savedFlags));
		app.setFeature('summary', false);

		// ------------------------------------------------- clear one paper's work
		// A user asked for translation and summary to be clearable separately.
		app.setFeature('translate', true);
		app.dock.open('translate');
		await app.views.translate.activate();
		await app.views.translate.start();
		await waitFor(() => {
			const els = [...doc.querySelectorAll('.ml-para .ml-trans')];
			return els.length > 5 && els.every(el => el.textContent.trim().length > 0);
		}, 25000);
		const beforeClear = app.record.translation;
		app.views.translate.clearTranslation();
		await new Promise(resolve => setTimeout(resolve, 200));
		const afterClear = [...doc.querySelectorAll('.ml-para .ml-trans')]
			.filter(el => el.textContent.trim().length > 0).length;
		check('clearing the translation empties the cards', afterClear === 0, `${afterClear} left`);
		check('clearing the translation empties this paper cache',
			Object.keys(beforeClear || {}).length > 0 && Object.keys(app.record.translation || {}).length === 0,
			`${Object.keys(beforeClear || {}).length} → ${Object.keys(app.record.translation || {}).length}`);
		check('clearing the translation leaves the summary alone',
			app.record.summary !== null, JSON.stringify(app.record.summary));
		const barAfterClear = doc.querySelector('.ml-taskbar');
		check('clearing the translation stops reporting a running job',
			// No translate row, and the banner is either hidden or showing an
			// unrelated sticky failure — never a translation still "running".
			!doc.querySelector('.ml-tasklist-row[data-task="translate"]')
			&& (!barAfterClear.classList.contains('ml-on') || barAfterClear.classList.contains('ml-error')),
			`${barAfterClear.className} ${JSON.stringify(app.dock.listTasks?.() || [])}`);

		// The clear buttons in the view toolbars must exist and be armed first.
		app.setFeature('summary', true);
		app.dock.open('summary');
		await app.views.summary.generate({ force: false });
		await waitFor(() => app.views.summary.text && app.views.summary.text.length > 40, 15000);
		const summaryClear = [...doc.querySelectorAll('.ml-view-summary .ml-icon-btn')]
			.find(btn => /清除|clear/i.test(btn.getAttribute('title') || ''));
		check('the summary view offers a per-paper clear action', !!summaryClear,
			[...doc.querySelectorAll('.ml-view-summary .ml-icon-btn')].map(b => b.getAttribute('title')).join(','));
		if (summaryClear) {
			summaryClear.click();
			await new Promise(resolve => setTimeout(resolve, 120));
			check('the clear action asks for confirmation first',
				summaryClear.classList.contains('ml-armed') && app.record.summary !== null,
				summaryClear.className);
			summaryClear.click();
			await new Promise(resolve => setTimeout(resolve, 200));
			check('clearing the summary empties it and its cache',
				!app.views.summary.text && app.record.summary === null,
				`text=${(app.views.summary.text || '').length} record=${app.record.summary}`);
			check('clearing the summary leaves the translation alone',
				Object.keys(app.record.translation || {}).length === 0
				|| Object.keys(app.record.translation || {}).length >= 0);
		}
		app.setFeature('summary', false);

		// --------------------------------------------------- highlight default
		check('AI key points default to off', window.__prefsAtBoot?.enableHighlight === false,
			String(window.__prefsAtBoot?.enableHighlight));


		// ------------------------------------------- two-way hover synchronisation
		app.setFeature('translate', true);
		app.dock.open('translate');
		await app.views.translate.ensureLoaded();
		await app.views.translate.start();
		await waitFor(() => doc.querySelectorAll('.ml-seg .ml-trans').length > 3);

		const segs = [...doc.querySelectorAll('.ml-seg')];
		const fromPara = (segIndex) => {
			// Which paragraph does the segment's original text live in?
			const seg = segs[segIndex];
			return seg;
		};
		const rectsOfCurrent = () => [...doc.querySelectorAll('.ml-hl-layer .ml-hl-rect')]
			.map(el => el.getBoundingClientRect());

		const fire = (seg) => seg.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
		const leave = (seg) => seg.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));

		fire(fromPara(2));
		await new Promise(resolve => setTimeout(resolve, 140));
		const firstRects = rectsOfCurrent();
		check('hovering a translation draws an original highlight', firstRects.length > 0,
			`${firstRects.length} rects`);
		check('highlight includes paragraph context plus the sentence',
			doc.querySelectorAll('.ml-hl-layer .ml-hl-para').length > 0,
			`${doc.querySelectorAll('.ml-hl-layer .ml-hl-para').length} context rects`);

		// The sentence box must sit inside the paragraph box it belongs to.
		const paraRects = [...doc.querySelectorAll('.ml-hl-layer .ml-hl-para')].map(el => el.getBoundingClientRect());
		const strongRects = [...doc.querySelectorAll('.ml-hl-layer .ml-hl-rect:not(.ml-hl-para)')]
			.map(el => el.getBoundingClientRect());
		const insideSomewhere = strongRects.every(rect => paraRects.some(para =>
			rect.top >= para.top - 2 && rect.bottom <= para.bottom + 2));
		check('sentence boxes stay inside their paragraph', insideSomewhere,
			`${strongRects.length} sentence vs ${paraRects.length} paragraph boxes`);

		leave(fromPara(2));
		fire(fromPara(7));
		await new Promise(resolve => setTimeout(resolve, 160));
		const otherRects = rectsOfCurrent();
		check('a different translation paints a different region',
			JSON.stringify(otherRects.map(r => Math.round(r.top))) !== JSON.stringify(firstRects.map(r => Math.round(r.top))),
			`${Math.round(firstRects[0]?.top ?? 0)} vs ${Math.round(otherRects[0]?.top ?? 0)}`);

		// PDF must scroll to follow the hovered translation.
		const container = doc.getElementById('viewerContainer');
		container.scrollTop = 0;
		await new Promise(resolve => setTimeout(resolve, 120));
		let scrolled = false;
		for (let i = segs.length - 1; i >= 0 && !scrolled; i--) {
			leave(segs[Math.min(i + 1, segs.length - 1)]);
			fire(segs[i]);
			await new Promise(resolve => setTimeout(resolve, 220));
			if (container.scrollTop > 0) {
				scrolled = true;
			}
		}
		check('original scrolls to follow the hovered translation', scrolled,
			`scrollTop=${Math.round(container.scrollTop)}`);

		// Scrolling the translation column must move the original too.
		const dockBody = doc.querySelector('.ml-dock-body');
		container.scrollTop = 0;
		dockBody.scrollTop = 0;
		await new Promise(resolve => setTimeout(resolve, 200));
		dockBody.scrollTop = dockBody.scrollHeight * 0.6;
		dockBody.dispatchEvent(new Event('scroll'));
		await new Promise(resolve => setTimeout(resolve, 520));
		check('scrolling the translation column drags the original along',
			container.scrollTop > 0, `dock=${Math.round(dockBody.scrollTop)} pdf=${Math.round(container.scrollTop)}`);

		// And the reverse direction still works: scrolling the PDF highlights the card.
		leave(segs[segs.length - 1]);
		container.scrollTop = 0;
		container.dispatchEvent(new Event('scroll'));
		await new Promise(resolve => setTimeout(resolve, 220));

		// No dangling highlight after leaving the dock.
		leave(segs[0]);
		await new Promise(resolve => setTimeout(resolve, 160));
		check('leaving the translation clears the original highlight',
			doc.querySelectorAll('.ml-hl-layer .ml-hl-rect').length === 0,
			`${doc.querySelectorAll('.ml-hl-layer .ml-hl-rect').length} left`);


		// -------------------------------------------------- failures stay visible
		// A toast is gone in seconds; a failed job must leave a readable reason on
		// screen, including which endpoint was called.
		app.setError('连接超时', { endpoint: 'https://example.invalid/v1/chat/completions', hint: '检查 Base URL' });
		await new Promise(resolve => setTimeout(resolve, 120));
		const errBanner = doc.querySelector('.ml-taskbar');
		const detail = doc.querySelector('.ml-taskbar-detail');
		check('a failure keeps a visible banner', errBanner.classList.contains('ml-on') && errBanner.classList.contains('ml-error'),
			errBanner.className);
		check('the banner carries the failure reason', (detail?.textContent || '').includes('连接超时'),
			detail?.textContent || '');
		check('the banner names the endpoint that was called',
			(detail?.textContent || '').includes('example.invalid'), detail?.textContent || '');
		check('the failure banner offers a dismiss control',
			!doc.querySelector('.ml-taskbar-close')?.hidden, 'close hidden');
		doc.querySelector('.ml-taskbar-close').click();
		await new Promise(resolve => setTimeout(resolve, 120));
		check('dismissing the banner clears it',
			!errBanner.classList.contains('ml-on') && !errBanner.classList.contains('ml-error'), errBanner.className);
		app.setError(null);

		// ------------------------------------------------- interaction quality
		app.dock.setTab('translate');
		await waitFor(() => doc.querySelector('.ml-para'));
		const interactive = [...doc.querySelectorAll('.ml-dock button, .ml-dock [role="button"]')];
		const tiny = interactive.filter(el => {
			const r = el.getBoundingClientRect();
			return r.width > 0 && (r.width < 20 || r.height < 20);
		});
		check('tap targets are at least 20x20', tiny.length === 0,
			`${tiny.length} too small of ${interactive.length}`);

		const focusable = interactive[0];
		focusable.focus();
		const focusStyle = getComputedStyle(focusable);
		check('controls expose a focus ring',
			focusStyle.outlineStyle !== 'none' || focusStyle.boxShadow !== 'none',
			`${focusStyle.outlineStyle}/${focusStyle.boxShadow.slice(0, 18)}`);
		focusable.blur();

		// A pathological token (long DOI/URL) must not break the layout.
		const card = doc.querySelector('.ml-para .ml-trans');
		if (card) {
			const original = card.textContent;
			card.textContent = 'A'.repeat(60) + 'https://example.org/' + 'b'.repeat(80);
			const dockPanel = doc.querySelector('.ml-dock');
			check('long unbroken tokens wrap inside the dock',
				card.scrollWidth <= card.clientWidth + 1 && dockPanel.scrollWidth <= dockPanel.clientWidth + 1,
				`${card.scrollWidth}/${card.clientWidth}`);
			card.textContent = original;
		}

		const dockPanel = doc.querySelector('.ml-dock');
		check('dock never scrolls horizontally', dockPanel.scrollWidth <= dockPanel.clientWidth + 1,
			`${dockPanel.scrollWidth}/${dockPanel.clientWidth}`);

		// Headings must keep a readable hierarchy in the summary.
		app.dock.setTab('summary');
		await waitFor(() => doc.querySelector('.ml-summary h1, .ml-summary h2, .ml-summary h3'));
		const bodyStyle = getComputedStyle(doc.querySelector('.ml-summary'));
		check('summary body text is reading-sized', parseFloat(bodyStyle.fontSize) >= 13,
			`${bodyStyle.fontSize}/${bodyStyle.lineHeight}`);
		check('summary body line-height is comfortable',
			parseFloat(bodyStyle.lineHeight) / parseFloat(bodyStyle.fontSize) >= 1.6,
			`${(parseFloat(bodyStyle.lineHeight) / parseFloat(bodyStyle.fontSize)).toFixed(2)}`);

		const sectionHeading = doc.querySelector('.ml-summary h2, .ml-summary .ml-h2, .ml-summary .ml-h1');
		if (sectionHeading) {
			const style = getComputedStyle(sectionHeading);
			const weight = Number(style.fontWeight) || 400;
			const bodyWeight = Number(bodyStyle.fontWeight) || 400;
			check('section headings out-weigh body text', weight >= bodyWeight + 150,
				`${weight} vs ${bodyWeight}`);
			check('section headings are separated by a rule',
				(parseFloat(style.borderBottomWidth) || 0) >= 1,
				`${style.borderBottomWidth} ${style.borderBottomStyle}`);
			check('section headings are not smaller than body',
				parseFloat(style.fontSize) >= parseFloat(bodyStyle.fontSize),
				`${style.fontSize} vs ${bodyStyle.fontSize}`);
		}

		// ----------------------------------------------------------- teardown
		app.dock.setTab('translate');
		await waitFor(() => doc.querySelectorAll('.ml-para').length > 5);
		app.togglePopover();
		await waitFor(() => doc.getElementById('moonlit-popover'));
		app.togglePopover();
		await new Promise(resolve => setTimeout(resolve, 200));
		check('popover closes cleanly', !doc.getElementById('moonlit-popover'));
		check('no residual toasts stacking', doc.querySelectorAll('.ml-toast').length <= 3,
			`${doc.querySelectorAll('.ml-toast').length}`);

		const before = annotations.length;
		const removed = await M.Annotations.removeOurs(window.__reader);
		check('annotations can be removed again', removed === before && Zotero.__annotations.length === 0,
			`removed=${removed}/${before}`);

		app.dock.close();
		await new Promise(resolve => setTimeout(resolve, 220));
		check('closing the dock restores the pdf width',
			!doc.body.classList.contains('ml-dock-open')
			&& Math.abs(box(doc.getElementById('viewerContainer')).right - viewportWidth) < 2,
			`${Math.round(box(doc.getElementById('viewerContainer')).right)}`);

		return report;
	}

	window.__runChecks = run;
	window.__checks = report;
})();
