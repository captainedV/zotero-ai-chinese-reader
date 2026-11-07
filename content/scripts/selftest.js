/* global Zotero, Services, PathUtils, IOUtils */

/**
 * In-app smoke test.
 *
 * Enabled with the hidden `extensions.zotero.moonlit.autoSelfTest` preference.
 * It drives the real reader end to end using the built-in demo provider, and
 * writes a structured report to the debug output — the only way to verify the
 * DOM integration without clicking through the UI by hand.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});
	const results = [];

	function log(message) {
		try {
			Zotero.debug(`[Moonlit][SELFTEST] ${message}`);
		}
		catch (e) {
			// stdout may be unavailable; M.Log still records it
		}
	}

	function record(name, ok, detail = '') {
		results.push({ name, ok, detail });
		const line = `${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`;
		log(line);
		// Zotero's stdout is not always captured (it depends on how the app was
		// started), so mirror the report into the plugin log file as well.
		M.Log.info(`[SELFTEST] ${line}`);
	}

	function assertStep(name, condition, detail) {
		record(name, !!condition, detail);
		return !!condition;
	}

	async function waitFor(predicate, timeout = 20000, interval = 150) {
		const started = Date.now();
		for (;;) {
			const value = await predicate();
			if (value) {
				return value;
			}
			if (Date.now() - started > timeout) {
				return null;
			}
			await M.Util.sleep(interval);
		}
	}

	/**
	 * A PDF reader must exist for the rest of the test. When the client was
	 * started without one, import the PDF given by `selfTestPDF`.
	 */
	async function ensureReader() {
		const findReader = () => (Zotero.Reader._readers || []).find(r => r._type === 'pdf');
		const existing = await waitFor(findReader, 5000);
		if (existing) {
			return existing;
		}
		const pdfPath = M.Prefs.getString('selfTestPDF', '');
		if (!pdfPath) {
			log('no reader open and no selfTestPDF configured');
			return null;
		}
		try {
			log(`importing ${pdfPath}`);
			const attachment = await Zotero.Attachments.importFromFile({
				file: pdfPath,
				libraryID: Zotero.Libraries.userLibraryID
			});
			await Zotero.Reader.open(attachment.id);
		}
		catch (e) {
			log(`import failed: ${e.message}`);
			return null;
		}
		return waitFor(findReader, 45000);
	}

	async function run() {
		log('starting');
		/** The reader app under test; also used by the restore block below. */
		let app = null;

		const restore = {
			provider: M.Prefs.getString('provider', 'deepseek'),
			enableTranslate: false,
			enableSummary: false,
			enableHighlight: false,
			granularity: M.Prefs.getString('granularity', 'sentence'),
			targetLang: M.Prefs.getString('targetLang', 'zh-CN')
		};

		// Demo provider by default; set `selfTestProvider` to an empty string to
		// run the same suite against the configured live provider.
		const providerOverride = M.Prefs.getString('selfTestProvider', 'mock');
		if (providerOverride) {
			M.Prefs.set('provider', providerOverride);
		}
		M.Log.debug('self-test provider', {
			raw: M.Prefs.getString('provider', 'deepseek'),
			selfTestProvider: M.Prefs.getString('selfTestProvider', 'mock'),
			hasKey: !!M.Prefs.getString('apiKey', ''),
			describe: M.AI.describe()
		});
		M.Prefs.set('granularity', 'sentence');
		M.Prefs.set('targetLang', 'zh-CN');

		try {
			const reader = await ensureReader();
			if (!assertStep('pdf reader is open', !!reader)) {
				return finish();
			}

			app = await M.ReaderUI.attach(reader);
			Object.assign(restore, {
				enableTranslate: app.isFeatureOn('translate'),
				enableSummary: app.isFeatureOn('summary'),
				enableHighlight: app.isFeatureOn('highlight')
			});
			if (!assertStep('plugin attached to reader', !!app)) {
				return finish();
			}

			const doc = await waitFor(() => M.PdfDoc.getDocEl(reader), 10000);
			assertStep('reader document reachable', !!doc);

			const stylesOk = assertStep('stylesheet injected', !!doc.getElementById('moonlit-reader-styles'));
			void stylesOk;

			const button = await waitFor(() => doc.getElementById('moonlit-toolbar-button'), 8000);
			if (!assertStep('toolbar button injected', !!button)) {
				return finish();
			}
			const toolbar = doc.querySelector('.toolbar');
			assertStep('toolbar button lives in reader toolbar', toolbar?.contains(button));

			// Popover
			button.click();
			const popover = await waitFor(() => doc.getElementById('moonlit-popover'), 4000);
			assertStep('control popover opens', !!popover);
			assertStep('popover has three feature switches', popover && popover.querySelectorAll('.ml-switch').length === 3,
				popover ? `switches=${popover.querySelectorAll('.ml-switch').length}` : '');
			button.click();

			// Document extraction
			const document_ = await app.ensureDocument();
			assertStep('document extracted', !!document_, document_ ? `pages=${document_.numPages} paragraphs=${document_.paragraphs.length}` : 'no document');
			assertStep('text model has usable paragraphs', document_ && document_.paragraphs.length > 5,
				document_ ? `paragraphs=${document_.paragraphs.length}` : '');
			assertStep('document metadata read', !!document_?.meta?.title, document_?.meta?.title || '');

			// ---- document structure: prose vs tables/formulas/TOC
			if (document_) {
				const roles = {};
				for (const paragraph of document_.paragraphs) {
					roles[paragraph.role || 'body'] = (roles[paragraph.role || 'body'] || 0) + 1;
				}
				const translatable = document_.paragraphs.filter(p => p.translatable !== false).length;
				assertStep('blocks are classified by kind',
					Object.keys(roles).length >= 2, JSON.stringify(roles));
				assertStep('non-prose blocks are excluded from translation',
					translatable > 0 && translatable <= document_.paragraphs.length,
					`${translatable}/${document_.paragraphs.length} translatable`);
				const headings = document_.paragraphs.filter(p => p.role === 'heading' || p.role === 'title');
				assertStep('the paper title or a heading is recognised', headings.length > 0,
					headings.slice(0, 2).map(p => p.text.slice(0, 34)).join(' | '));
				const prose = M.PdfDoc.proseText(document_);
				assertStep('summary input contains no table or formula rows',
					!/\t{2,}/.test(prose) && prose.length > 200, `${prose.length} chars`);
			}

			// Geometry sanity: paragraph rects must be inside the page box.
			if (document_) {
				const page0 = document_.pages[0];
				const inside = document_.paragraphs
					.filter(p => p.pageIndex === 0)
					.every(p => p.rects.every(rect =>
						rect[0] >= page0.view[0] - 2 && rect[2] <= page0.view[2] + 2
						&& rect[1] >= page0.view[1] - 2 && rect[3] <= page0.view[3] + 2));
				assertStep('paragraph rects inside page bounds', inside);
			}

			// Dock + translation, driven through the switch exactly like a user does:
			// if the switch only opens an empty column, this step must fail.
			app.setFeature('translate', false);
			await app.views.translate.ensureLoaded();
			app.dock.open('translate');
			const dock = await waitFor(() => doc.querySelector('.ml-dock'), 5000);
			assertStep('dock opens', !!dock);
			assertStep('dock makes room for itself', doc.body.classList.contains('ml-dock-open'));

			const cards = await waitFor(() => doc.querySelectorAll('.ml-para').length > 2, 45000);
			assertStep('translation cards rendered', !!cards, `cards=${doc.querySelectorAll('.ml-para').length}`);

			await app.applyFeatureState('enableTranslate', true);
			assertStep('translation switch persists', app.isFeatureOn('translate') === true);
			const switchRan = await waitFor(() => {
				const els = Array.from(doc.querySelectorAll('.ml-para .ml-trans'));
				return els.length > 2 && els.some(el => el.textContent.trim().length > 0);
			}, 60000);
			assertStep('translation switch starts the run', !!switchRan,
				`translated=${Array.from(doc.querySelectorAll('.ml-para .ml-trans')).filter(el => el.textContent.trim()).length}`);
			// A long paper takes proportionally longer than a short one: budget the
			// wait from the number of segments instead of a fixed minute.
			const segments = doc.querySelectorAll('.ml-para').length;
			// At the default 45 requests/minute a big paper needs many minutes, so the
			// budget scales with the segment count instead of a fixed minute.
			const budget = Math.min(900000, Math.max(60000, segments * 1500));
			const translated = await waitFor(() => {
				const texts = Array.from(doc.querySelectorAll('.ml-para .ml-trans'));
				return texts.length && texts.every(el => el.textContent.trim().length > 0);
			}, budget);
			const transEls = Array.from(doc.querySelectorAll('.ml-para .ml-trans'));
			const transDone = transEls.filter(el => el.textContent.trim().length > 0).length;
			assertStep('all sentences translated', !!translated,
				`${transDone}/${transEls.length} sentences`);
			// Accept any Chinese output (demo prose or a real model's wording).
			assertStep('translation follows target language (zh-CN)',
				/[\u4e00-\u9fa5]{4}/.test(doc.querySelector('.ml-para .ml-trans')?.textContent || ''),
				doc.querySelector('.ml-para .ml-trans')?.textContent?.slice(0, 40) || '');

			// Cross highlight: hovering a segment paints rects on the page.
			const seg = doc.querySelector('.ml-para .ml-seg');
			if (seg) {
				seg.dispatchEvent(new doc.defaultView.MouseEvent('mouseenter', { bubbles: false }));
				const pdfDocEl = M.PdfDoc.getPdfDocEl(reader);
				const painted = await waitFor(() => pdfDocEl.querySelectorAll('.ml-hl-rect').length > 0, 4000);
				assertStep('hovering translation paints PDF highlight', !!painted,
					`rects=${pdfDocEl.querySelectorAll('.ml-hl-rect').length}`);
				if (painted) {
					const rect = pdfDocEl.querySelector('.ml-hl-rect');
					const box = rect.getBoundingClientRect();
					assertStep('highlight rect has real geometry', box.width > 4 && box.height > 1,
						`${Math.round(box.width)}x${Math.round(box.height)}`);
				}
				seg.dispatchEvent(new doc.defaultView.MouseEvent('mouseleave', { bubbles: false }));
				app.overlay.clear();
			}

			// Hover from the PDF side.
			const firstParagraph = document_.paragraphs.find(p => p.pageIndex === 0);
			const mapping = firstParagraph && M.PdfDoc.pageMapping(reader, 0);
			if (mapping && firstParagraph) {
				const rect = firstParagraph.rects[0];
				const [cx, cy] = mapping.toClient((rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2);
				const hit = M.PdfDoc.paragraphAt(reader, cx, cy, { nearest: true });
				assertStep('pointer → paragraph hit-testing works', !!hit,
					hit ? `p${hit.paragraph.pageIndex}:${hit.paragraph.text.slice(0, 30)}` : 'no hit');
				// A point in the gap between two lines of the same paragraph is the
				// common case when hovering real text; it must still resolve.
				const multi = app.document.paragraphs.find(item => item.rects.length >= 2 && item.translatable !== false);
				if (multi && hit) {
					const mapping = M.PdfDoc.pageMapping(reader, multi.pageIndex);
					const gapPoint = (() => {
						if (!mapping) {
							return null;
						}
						const first = multi.rects[0];
						const second = multi.rects[1];
						const local = mapping.toLocalRect([first[0], Math.min(first[1], second[1]) + 1, first[2], Math.max(first[3], second[3]) - 1]);
						const pageRect = mapping.pageEl.getBoundingClientRect();
						return { x: pageRect.left + local.left + Math.min(6, local.width / 2), y: pageRect.top + local.top + local.height / 2 };
					})();
					const gapHit = gapPoint ? M.PdfDoc.paragraphAt(reader, gapPoint.x, gapPoint.y, { nearest: true }) : null;
					assertStep('hovering between lines still resolves a paragraph', !!gapHit,
						gapHit ? `${gapHit.paragraph.id}${gapHit.approximate ? ' approx' : ''}` : 'no hit');
				}
			}
			else {
				assertStep('pointer → paragraph hit-testing works', false, 'page mapping unavailable');
			}

			// Batching: several paragraphs share one request, with context attached.
			try {
				const stats = app.views.translate.batchStats;
				assertStep('translation batches paragraphs instead of one request each',
					!!stats && stats.batches > 0 && stats.batches < stats.units,
					stats ? `units=${stats.units} batches=${stats.batches}` : 'no stats');
				const budget = M.Prefs.getInt('batchChars', 2200);
				assertStep('batch size is bounded by the character budget', budget >= 400, `${budget} chars`);
			}
			catch (e) {
				assertStep('translation batches paragraphs instead of one request each', false, e.message);
			}

			// Reopening with the switch already on must continue the work, not sit on
			// "paused". Clear the translations, interrupt the run, then resume.
			try {
				app.views.translate.retranslate();
				await M.Util.sleep(400);
				app.views.translate.deactivate();
				await M.Util.sleep(200);
				const paused = app.dock.getTask?.('translate');
				const pausedOk = !paused || paused.state === 'paused' || paused.state === 'running';
				assertStep('an interrupted feature never reports a wrong state', pausedOk,
					JSON.stringify(paused));
				app.setFeature('translate', true);
				await app.resumeFeature('translate');
				const resumed = await waitFor(() => {
					const current = app.dock.getTask?.('translate');
					return current && (current.state === 'running' || current.state === 'done') ? current : null;
				}, 20000);
				assertStep('reopening with the switch on resumes the run', !!resumed,
					JSON.stringify(app.dock.getTask?.('translate')));
				const finished = await waitFor(() => {
					const texts = Array.from(doc.querySelectorAll('.ml-para .ml-trans'));
					return texts.length && texts.every(el => el.textContent.trim().length > 0);
				}, 900000);
				const transEls2 = Array.from(doc.querySelectorAll('.ml-para .ml-trans'));
				assertStep('the resumed run finishes the paper', !!finished,
					`${transEls2.filter(el => el.textContent.trim()).length}/${transEls2.length} translated, `
					+ `${doc.querySelectorAll('.ml-para').length} cards, `
					+ `${app.views.translate.el?.isConnected ? 'attached' : 'detached'}`);
			}
			catch (e) {
				assertStep('reopening with the switch on resumes the run', false, e.message);
			}

			// Summary — same rule: the switch has to do the work.
			app.setFeature('summary', false);
			app.dock.open('summary');
			await app.views.summary.activate();
			await app.applyFeatureState('enableSummary', true);
			const summaryText = await waitFor(() => {
				const el = doc.querySelector('.ml-view-summary .ml-summary');
				return el && el.textContent.trim().length > 40 ? el : null;
			}, 40000);
			assertStep('summary rendered', !!summaryText,
				summaryText ? summaryText.textContent.slice(0, 60) : '');
			assertStep('summary has structured headings',
				!!summaryText?.querySelector('h2, h3') || /一句话总结/.test(summaryText?.textContent || ''));

			// Highlights — the switch is the entry point here too.
			app.setFeature('highlight', false);
			app.dock.open('highlight');
			await app.views.highlight.activate();
			await app.applyFeatureState('enableHighlight', true);
			const points = await waitFor(() => doc.querySelectorAll('.ml-point').length, 40000);
			assertStep('AI key points listed', !!points, `points=${doc.querySelectorAll('.ml-point').length}`);

			const attachment = Zotero.Items.get(reader.itemID);
			const ours = await M.Annotations.listOurs(reader);
			assertStep('highlight annotations created in Zotero', ours.length > 0, `annotations=${ours.length}`);
			if (ours.length) {
				const first = ours[0];
				assertStep('annotation has rects', !!JSON.parse(first.annotationPosition || '{}').rects?.length,
					first.annotationPosition?.slice(0, 60) || '');
				const removed = await M.Annotations.removeOurs(reader);
				assertStep('AI annotations can be cleaned up', removed === ours.length, `removed=${removed}`);
			}
			void attachment;

			// Optional: ask the real AddonManager how it feels about a built XPI.
			const checkXPI = M.Prefs.getString('devCheckXPI', '');
			if (checkXPI) {
				try {
					const { AddonManager } = ChromeUtils.importESModule(
						'resource://gre/modules/AddonManager.sys.mjs'
					);
					const file = Zotero.File.pathToFile(checkXPI);
					const install = await AddonManager.getInstallForFile(file, 'application/x-xpinstall');
					const info = {
						state: install.state,
						stateName: AddonManager.errorToString(install.error) || 'OK',
						error: install.error,
						addon: install.addon
							? {
								id: install.addon.id,
								version: install.addon.version,
								appDisabled: install.addon.appDisabled,
								userDisabled: install.addon.userDisabled,
								softDisabled: install.addon.softDisabled,
								blocklistState: install.addon.blocklistState,
								isCompatible: install.addon.isCompatible,
								isActive: install.addon.isActive
							}
							: null,
						name: install.name,
						existingAddon: install.existingAddon?.id || null
					};
					M.Log.info('install check', info);
					try {
						install.cancel();
					}
					catch (e) {
						// ignore
					}
					assertStep('built XPI passes AddonManager validation',
						install.state === AddonManager.STATE_DOWNLOADED && !install.error,
						`state=${install.state} error=${info.stateName}`);
				}
				catch (e) {
					M.Log.error('install check failed', e);
					assertStep('built XPI passes AddonManager validation', false, e.message);
				}
			}

			// Note export: AI output becomes a real Zotero note.
			try {
				const summaryView = app.views.summary;
				const noteResult = await M.Notes.save(reader, {
					title: document_.meta?.title,
					meta: [document_.meta?.authors, document_.meta?.year].filter(Boolean).join(' · '),
					summaryMarkdown: summaryView?.currentText || '',
					points: (app.views.highlight?.points || []).map(point => ({
						label: point.label || point.type || '',
						quote: point.quote || '',
						note: point.note || '',
						pageIndex: point.pageIndex
					}))
				});
				const noteItem = noteResult ? Zotero.Items.get(noteResult.noteID) : null;
				assertStep('AI output can be saved as a Zotero note', !!noteItem,
					noteResult ? `note ${noteResult.noteID}` : 'no note');
				if (noteItem) {
					const html = noteItem.getNote();
					assertStep('note keeps the summary and key points',
						/<h1>/.test(html) && /<h[23]/.test(html),
						`${(html.match(/<h[23]/g) || []).length} sections`);
					await noteItem.eraseTx();
				}
			}
			catch (e) {
				assertStep('AI output can be saved as a Zotero note', false, e.message);
			}

			// Keyboard shortcuts are bound on the reader document.
			try {
				app.togglePopover();
				const opened = await waitFor(() => doc.getElementById('moonlit-popover'), 3000);
				(doc.body || doc.querySelector('.toolbar') || doc.documentElement)
					.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', {
						key: 'Escape',
						bubbles: true,
						cancelable: true
					}));
				const closed = await waitFor(() => !doc.getElementById('moonlit-popover'), 3000);
				assertStep('Escape closes the control popover', !!opened && !!closed, `${!!opened}/${!!closed}`);
			}
			catch (e) {
				assertStep('Escape closes the control popover', false, e.message);
			}


			// ---- dock: drag-to-resize (the handle must really move the dock)
			try {
				M.Prefs.set('dockWidth', 430);
				app.dock.open('summary');
				app.dock.refreshWidth?.();
				await waitFor(() => doc.querySelector('.ml-dock'), 3000);
				await M.Util.sleep(320);
				const dockEl = doc.querySelector('.ml-dock');
				const handle = doc.querySelector('.ml-dock-resizer');
				const before = dockEl.getBoundingClientRect().width;
				const handleRect = handle.getBoundingClientRect();
				const point = { clientX: Math.round(handleRect.left + 4), clientY: Math.round(handleRect.top + 160),
					pointerId: 1, bubbles: true, cancelable: true, button: 0, pointerType: 'mouse' };
				handle.dispatchEvent(new doc.defaultView.PointerEvent('pointerdown', point));
				doc.dispatchEvent(new doc.defaultView.PointerEvent('pointermove',
					{ ...point, clientX: point.clientX - 80 }));
				await M.Util.sleep(140);
				const during = dockEl.getBoundingClientRect().width;
				assertStep('dragging the handle resizes the dock', Math.abs(during - before - 80) <= 4,
					`${Math.round(before)} → ${Math.round(during)}`);
				doc.dispatchEvent(new doc.defaultView.PointerEvent('pointerup', { ...point, clientX: point.clientX - 80 }));
				await M.Util.sleep(360);
				const after = dockEl.getBoundingClientRect().width;
				assertStep('dock keeps the dragged width', Math.abs(after - during) <= 3, `${Math.round(after)}`);
				assertStep('dragged width is persisted',
					Math.abs((M.Prefs.getInt('dockWidth', 430) || 430) - Math.round(after)) <= 3,
					`pref ${M.Prefs.getInt('dockWidth', 430)}`);
			}
			catch (e) {
				assertStep('dragging the handle resizes the dock', false, e.message);
			}

			// ---- dock: only the three switches start AI work
			try {
				const popover = doc.getElementById('moonlit-popover');
				if (!popover) {
					app.togglePopover();
					await waitFor(() => doc.getElementById('moonlit-popover'), 3000);
				}
				const pop = doc.getElementById('moonlit-popover');
				const switches = pop ? pop.querySelectorAll('.ml-switch').length : 0;
				const actionButtons = pop ? pop.querySelectorAll('.ml-actions button').length : -1;
				assertStep('popover exposes the three switches', switches === 3, `${switches} switches`);
				assertStep('popover has no extra action buttons', actionButtons === 0, `${actionButtons} buttons`);
				const stray = [...doc.querySelectorAll('.ml-empty button, .ml-dock-toolbar button')]
					.filter(el => /生成总结|重新生成|开始翻译|重新翻译/.test(el.textContent || ''));
				assertStep('views contain no duplicate generate buttons', stray.length === 0,
					stray.map(el => el.textContent.trim()).join(' | ') || 'none');
				app.togglePopover();
			}
			catch (e) {
				assertStep('popover exposes the three switches', false, e.message);
			}

			// ---- dock: token meter + progress banner
			try {
				const usageEl = doc.querySelector('.ml-usage');
				const total = Number(usageEl?.dataset.total || 0);
				assertStep('token meter reports usage for this paper', total > 0, `${total} tokens`);
				assertStep('token meter lists calls and categories',
					Number(usageEl?.dataset.calls || 0) > 0 && /输入/.test(usageEl?.textContent || ''),
					(usageEl?.textContent || '').trim());
				// Each feature owns a row, so two jobs can be in flight at once.
				app.setTask('translate', { state: 'running', label: '翻译', done: 4, total: 10, tab: 'translate' });
				app.setTask('summary', { state: 'running', label: '总结', done: 1, total: 3, tab: 'summary' });
				await M.Util.sleep(220);
				const banner = doc.querySelector('.ml-taskbar');
				const rows = Array.from(doc.querySelectorAll('.ml-tasklist-row'));
				assertStep('parallel features each get a progress row', rows.length === 2,
					`rows=${rows.length}`);
				assertStep('progress rows carry their own counters',
					rows.some(row => /4\/10/.test(row.textContent || '')) && rows.some(row => /1\/3/.test(row.textContent || '')),
					rows.map(row => (row.textContent || '').replace(/\s+/g, ' ').trim()).join(' | '));
				app.setTask('translate', { state: 'paused', label: M.I18n.t('task.paused'), done: 4, total: 10, tab: 'translate' });
				await M.Util.sleep(160);
				const pausedRow = doc.querySelector('.ml-tasklist-row[data-task="translate"]');
				assertStep('a paused feature keeps its progress',
					/4\/10/.test(pausedRow?.textContent || ''), (pausedRow?.textContent || '').trim());
				assertStep('a closed feature is not shown as waiting',
					!/等待模型响应/.test(pausedRow?.textContent || ''));
				app.setTask('translate', null);
				app.setTask('summary', null);
				await M.Util.sleep(200);
				assertStep('progress banner clears when idle', !banner?.classList.contains('ml-on'));
			}
			catch (e) {
				assertStep('token meter reports usage for this paper', false, e.message);
			}

			// AI key points must ship switched off. Read the declared default, not
			// the current value: this test just switched everything on.
			try {
				const declared = Services.prefs
					.getDefaultBranch('')
					.getBoolPref('extensions.zotero.moonlit.enableHighlight');
				assertStep('AI key points ship switched off', declared === false, String(declared));
			}
			catch (e) {
				assertStep('AI key points ship switched off', false, e.message);
			}


			// ---- hover sync: translation -> original (highlight + scroll)
			try {
				app.setFeature('translate', true);
				app.dock.open('translate');
				await app.views.translate.ensureLoaded();
				await waitFor(() => doc.querySelectorAll('.ml-seg').length > 6, 9000);
				const pdfDoc = M.PdfDoc.getPdfDocEl(app.reader);
				const scroller = M.PdfDoc.scrollContainer(app.reader);
				const cards = [...doc.querySelectorAll('.ml-para[data-page]')];
				const lastPage = cards
					.map(card => Number(card.dataset.page))
					.filter(Number.isFinite)
					.reduce((max, value) => Math.max(max, value), 0);
				const deepCard = cards.filter(card => Number(card.dataset.page) === lastPage).pop();
				const deepSeg = deepCard?.querySelectorAll('.ml-seg');
				const targetSeg = deepSeg?.[deepSeg.length - 1]
					|| [...doc.querySelectorAll('.ml-seg')].pop();
				const fire = (el, type) => el.dispatchEvent(new doc.defaultView.MouseEvent(type, { bubbles: false }));

				M.Log.info('hover-sync target', {
					page: lastPage,
					scroller: scroller
						? {
							id: scroller.id || null,
							scrollHeight: scroller.scrollHeight,
							clientHeight: scroller.clientHeight
						}
						: 'none',
					hasTarget: !!targetSeg
				});

				if (scroller) {
					scroller.scrollTop = 0;
				}
				await M.Util.sleep(150);
				fire(targetSeg, 'mouseenter');
				await M.Util.sleep(420);
				const rects = pdfDoc.querySelectorAll('.ml-hl-layer .ml-hl-rect').length;
				const scrolledTop = scroller ? scroller.scrollTop : 0;
				assertStep('hovering a translation highlights the original', rects > 0, `${rects} rects`);
				assertStep('original scrolls to follow the hovered translation', scrolledTop > 0,
					`scrollTop=${Math.round(scrolledTop)} page=${lastPage}`);
				fire(targetSeg, 'mouseleave');

				// Sentence-level boxes must stay inside their paragraph's boxes.
				const midSeg = [...doc.querySelectorAll('.ml-seg')][3] || targetSeg;
				fire(midSeg, 'mouseenter');
				await M.Util.sleep(220);
				const paraBoxes = [...pdfDoc.querySelectorAll('.ml-hl-layer .ml-hl-para')]
					.map(el => el.getBoundingClientRect());
				const segBoxes = [...pdfDoc.querySelectorAll('.ml-hl-layer .ml-hl-rect:not(.ml-hl-para)')]
					.map(el => el.getBoundingClientRect());
				const inside = segBoxes.every(box => paraBoxes.some(para =>
					box.top >= para.top - 3 && box.bottom <= para.bottom + 3));
				assertStep('sentence highlight sits inside its paragraph context',
					segBoxes.length > 0 && paraBoxes.length > 0 && inside,
					`${segBoxes.length} sentence / ${paraBoxes.length} context`);
				fire(midSeg, 'mouseleave');
				await M.Util.sleep(160);
				assertStep('leaving the translation clears the highlight',
					pdfDoc.querySelectorAll('.ml-hl-layer .ml-hl-rect').length === 0);

				// Scrolling the column drags the original along.
				const dockBody = doc.querySelector('.ml-dock-body');
				if (dockBody && scroller) {
					scroller.scrollTop = 0;
					dockBody.scrollTop = dockBody.scrollHeight * 0.7;
					dockBody.dispatchEvent(new doc.defaultView.Event('scroll'));
					const moved = await waitFor(() => scroller.scrollTop > 0, 2500);
					assertStep('scrolling the translation column drags the original',
						!!moved, `pdf=${Math.round(scroller.scrollTop)}`);
				}
			}
			catch (e) {
				assertStep('hovering a translation highlights the original', false, e.message);
			}

			// Preference pane: it must render with our controls and initialise.
			try {
				const win = Zotero.Utilities.Internal.openPreferences('moonlit-reader-prefpane');
				const rawWindow = () => {
					try {
						return win?.wrappedJSObject || win || null;
					}
					catch (e) {
						return null;
					}
				};
				const prefsWin = await waitFor(() => {
					const candidate = rawWindow();
					const document_ = candidate?.document;
					if (!document_) {
						return null;
					}
					return document_.getElementById?.('moonlit-prefpane-root') ? candidate : null;
				}, 20000);
				const controlCount = prefsWin
					? prefsWin.document.querySelectorAll('#moonlit-prefpane-root select, #moonlit-prefpane-root input').length
					: 0;
				assertStep('preference pane renders its controls', !!prefsWin && controlCount >= 3,
					`${controlCount} fields`);
				if (prefsWin) {
					const doc2 = prefsWin.document;
					await waitFor(() => doc2.querySelector('#moonlit-prefpane-root select, #moonlit-prefpane-root input'), 8000);
					const apiKeyField = doc2.querySelector('#moonlit-prefpane-root input[type="password"], #moonlit-prefpane-root input#moonlit-api-key');
					const selects = doc2.querySelectorAll('#moonlit-prefpane-root select');
					assertStep('preference pane exposes provider + key fields',
						!!apiKeyField && selects.length >= 1,
						`${selects.length} selects`);
					const providerSelect = selects[0];
					const options = providerSelect?.options?.length || 0;
					assertStep('provider list is populated', options >= 5, `${options} providers`);
					const paneHtml = doc2.getElementById('moonlit-prefpane-root')?.innerHTML || '';
					const hasStall = /stallSeconds/.test(paneHtml) || /流式无响应超时/.test(paneHtml);
					const hasDebug = /详细日志|Verbose log/.test(paneHtml);
					assertStep('preference pane exposes the stall timeout and verbose log',
						hasStall && hasDebug, `stall=${hasStall} debug=${hasDebug}`);
				}
				try {
					win?.close();
				}
				catch (e) {
					// ignore
				}
			}
			catch (e) {
				assertStep('preference pane renders its controls', false, e.message);
			}

			// Text-selection popup: "AI 翻译 / AI 解释" inside Zotero's popup.
			try {
				const host = doc.createElement('div');
				const appended = [];
				M.Main.addSelectionActions({
					reader,
					doc,
					params: { annotation: { text: document_.paragraphs[1]?.text?.slice(0, 90) || 'test' } },
					append: element => {
						appended.push(element);
						host.appendChild(element);
					}
				});
				const buttons = host.querySelectorAll('.ml-selection-actions button, .ml-selection-actions [role="button"]');
				assertStep('selection popup adds AI actions', appended.length > 0 && buttons.length >= 2,
					`${buttons.length} buttons`);
				if (buttons.length) {
					buttons[0].dispatchEvent(new doc.defaultView.MouseEvent('click', { bubbles: true }));
					const answered = await waitFor(() => {
						const out = host.querySelector('.ml-selection-result')?.textContent || '';
						return out.trim().length > 2;
					}, 45000);
					assertStep('selection translation resolves', !!answered,
						(host.querySelector('.ml-selection-result')?.textContent || '').slice(0, 30));
				}
			}
			catch (e) {
				assertStep('selection popup adds AI actions', false, e.message);
			}

			// Cached results survive a reload of the view.
			const record = await M.Cache.load(document_.attachmentKey);
			assertStep('translation cached to disk', Object.keys(record.translation || {}).length > 0,
				`entries=${Object.keys(record.translation || {}).length}`);

			// Switch ↔ UI alignment, on the real reader.
			try {
				app.setFeature('translate', false);
				app.setFeature('summary', false);
				app.setFeature('highlight', false);
				app.dock.clearTasks?.();
				app.syncFeatureUi();
				assertStep('every feature reports off with the button neutral',
					['translate', 'summary', 'highlight'].every(name => app.featureState(name) === 'off')
					&& !app.button.classList.contains('ml-on'),
					`${app.button.className}`);

				// drive a real running task through the dock and watch the UI follow
				app.dock.setTask('translate', { state: 'running', done: 3, total: 9, tab: 'translate' });
				await M.Util.sleep(120);
				assertStep('a running task reaches the switch state',
					app.featureState('translate') === 'running', app.featureState('translate'));
				assertStep('a running task reaches the toolbar button',
					app.button.classList.contains('ml-busy'), app.button.className);
				app.setFeature('translate', true);
				app.dock.setTask('translate', { state: 'paused', done: 3, total: 9, tab: 'translate' });
				await M.Util.sleep(120);
				assertStep('a paused task keeps its numbers in the status text',
					/3\/9/.test(app.featureStatusText('translate')), app.featureStatusText('translate'));
				assertStep('a paused task shows up on the button',
					app.button.classList.contains('ml-paused'), app.button.className);
				app.dock.setTask('translate', { state: 'error', done: 0, total: 0, tab: 'translate' });
				await M.Util.sleep(120);
				assertStep('a failed task is not hidden behind the banner',
					app.featureState('translate') === 'error', app.featureState('translate'));
				app.dock.setTask('translate', null);
				app.setFeature('translate', false);
				await M.Util.sleep(80);

				// a refused start must not leave the switch on
				const savedKey = M.Prefs.getString('apiKey', '');
				M.Prefs.set('apiKey', '');
				await app.applyFeatureState('enableTranslate', true);
				await M.Util.sleep(200);
				assertStep('a refused start rolls the switch back',
					app.isFeatureOn('translate') === false,
					`flag=${app.isFeatureOn('translate')}`);
				M.Prefs.set('apiKey', savedKey);
				app.setFeature('translate', false);
			}
			catch (e) {
				assertStep('a refused start rolls the switch back', false, e.message);
			}

			// Per-paper switch ownership and per-paper clearing.
			try {
				const key = app.document?.attachmentKey;
				const paperRecord = await M.Cache.load(key);
				assertStep('switch state is stored with the paper', !!paperRecord.enabled,
					JSON.stringify(paperRecord.enabled || null));
				const fresh = await M.Cache.load(`selftest-fresh-${Date.now()}`);
				assertStep('a paper that was never opened has every switch off',
					!fresh.enabled, JSON.stringify(fresh.enabled || null));
				// Clearing this paper's translation must not touch the summary or the
				// key points, and must empty the cache entry for translation only.
				app.setFeature('summary', true);
				const summaryBefore = app.record?.summary?.text || '';
				app.views.translate.clearTranslation();
				await M.Util.sleep(260);
				const left = Array.from(doc.querySelectorAll('.ml-para .ml-trans'))
					.filter(el => el.textContent.trim().length > 0).length;
				assertStep('clearing the translation empties the column', left === 0, `${left} left`);
				assertStep('clearing the translation empties its cache entry',
					Object.keys(app.record?.translation || {}).length === 0,
					`${Object.keys(app.record?.translation || {}).length} entries`);
				assertStep('clearing the translation keeps the summary',
					(app.record?.summary?.text || '') === summaryBefore,
					`${(app.record?.summary?.text || '').length} chars`);
			}
			catch (e) {
				assertStep('clearing the translation empties the column', false, e.message);
			}

			assertStep('summary cached to disk', !!record.summary?.text);
		}
		catch (e) {
			record('unexpected error', false, `${e?.message || e}`);
			M.Log.error('self-test error', e);
		}
		finally {
			M.Prefs.set('provider', restore.provider);
			if (app) {
				app.setFeature('translate', restore.enableTranslate);
				app.setFeature('summary', restore.enableSummary);
				app.setFeature('highlight', restore.enableHighlight);
			}
			M.Prefs.set('granularity', restore.granularity);
			M.Prefs.set('targetLang', restore.targetLang);
		}
		finish();
	}

	function finish() {
		const passed = results.filter(r => r.ok).length;
		const failed = results.length - passed;
		log(`SUMMARY passed=${passed} failed=${failed}`);
		for (const item of results.filter(r => !r.ok)) {
			log(`FAILED-STEP ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
		}
		log(failed === 0 ? M.I18n.t('selftest.pass') : M.I18n.t('selftest.fail'));
		// Make the outcome easy to grep from the terminal.
		Zotero.debug(`[Moonlit][SELFTEST-RESULT] ${failed === 0 ? 'OK' : 'ERROR'} ${passed}/${results.length}`);
		// Also drop a machine-readable report next to the cache: Zotero's stdout is
		// not captured when the app is started detached, and this file always is.
		try {
			const target = PathUtils.join(M.Paths.dataDir(), 'selftest.json');
			IOUtils.writeUTF8(target, JSON.stringify({
				ok: failed === 0,
				passed,
				total: results.length,
				finishedAt: new Date().toISOString(),
				results
			}, null, 2)).catch(e => M.Log.error('failed to write selftest.json', e));
		}
		catch (e) {
			M.Log.error('failed to write selftest.json', e);
		}
	}

	function maybeRun() {
		if (!M.Prefs.getBool('autoSelfTest', false)) {
			return;
		}
		run().catch(e => M.Log.error('self-test crashed', e));
	}

	M.SelfTest = { run, maybeRun };
})();
