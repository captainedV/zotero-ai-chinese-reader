/* global Zotero */

/**
 * Per-reader integration: toolbar button, control popover, dock wiring and the
 * shared "app" object the feature views talk to.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});
	const t = (key, vars) => M.I18n.t(key, vars);

	const BUTTON_CLASS = 'ml-toolbar-button';
	const POPOVER_ID = 'moonlit-popover';
	const attached = new WeakMap();
	const pending = new Map();

	// ------------------------------------------------------------- utilities
	function readerDoc(reader) {
		try {
			const win = reader?._iframeWindow;
			return win?.document || null;
		}
		catch (e) {
			return null;
		}
	}

	async function waitForReader(reader, timeout = 15000) {
		const started = Date.now();
		for (;;) {
			const doc = readerDoc(reader);
			if (doc && doc.readyState !== 'loading' && M.PdfDoc.getViewer(reader)) {
				return doc;
			}
			if (Date.now() - started > timeout) {
				return null;
			}
			await M.Util.sleep(120);
		}
	}

	// --------------------------------------------------------------- popover
	function buildPopover(app) {
		const doc = app.doc;
		doc.getElementById(POPOVER_ID)?.remove();

		const provider = M.AI.describe();
		const pop = M.Dom.h(doc, 'div', {
			class: 'ml-popover ml-ui',
			id: POPOVER_ID,
			attrs: { role: 'dialog', 'aria-label': t('popover.title') }
		});

		const head = M.Dom.h(doc, 'div', { class: 'ml-pop-head' }, [
			M.Dom.h(doc, 'div', { class: 'ml-logo', html: M.Icons.get('moon') }),
			M.Dom.h(doc, 'div', { class: 'ml-pop-title' }, [
				M.Dom.h(doc, 'div', { class: 'ml-brand', text: t('popover.title') }),
				M.Dom.h(doc, 'div', { class: 'ml-sub', text: app.document?.meta?.title
					? M.Util.truncate(app.document.meta.title, 42)
					: t('popover.subtitle') })
			]),
			M.Dom.iconButton(doc, 'close', t('dock.close'), () => closePopover(app))
		]);

		const rows = [
			{
				key: 'enableTranslate',
				title: t('toggle.translate'),
				desc: t('toggle.translate.desc'),
				icon: 'translate'
			},
			{
				key: 'enableSummary',
				title: t('toggle.summary'),
				desc: t('toggle.summary.desc'),
				icon: 'summary'
			},
			{
				key: 'enableHighlight',
				title: t('toggle.highlight'),
				desc: t('toggle.highlight.desc'),
				icon: 'highlight'
			}
		];

		const features = M.Dom.h(doc, 'div');
		features.appendChild(M.Dom.h(doc, 'div', { class: 'ml-section-label', text: t('section.features') }));
		for (const row of rows) {
			const sw = M.Dom.switchControl(doc, M.Prefs.getBool(row.key, false), async (value) => {
				M.Prefs.set(row.key, value);
				await app.applyFeatureState(row.key, value);
			});
			features.appendChild(M.Dom.h(doc, 'div', { class: 'ml-row' }, [
				M.Dom.h(doc, 'div', { class: 'ml-row-text' }, [
					M.Dom.h(doc, 'div', { class: 'ml-row-title', text: row.title }),
					M.Dom.h(doc, 'div', { class: 'ml-row-desc', text: row.desc })
				]),
				sw
			]));
		}

		const status = M.Dom.h(doc, 'div', {
			class: `ml-status${provider.ready ? '' : ' ml-warn'}`
		}, [
			M.Dom.h(doc, 'span', { class: 'ml-dot' }),
			M.Dom.h(doc, 'span', {
				text: provider.isMock
					? t('status.mock')
					: `${t('status.model')} ${provider.model || '—'} · ${provider.ready ? t('status.ready') : t('status.noKey')}`
			}),
			M.Dom.h(doc, 'span', {
				class: 'ml-status-link',
				text: provider.ready ? t('action.settings') : t('status.configure'),
				on: {
					click: () => {
						closePopover(app);
						app.openSettings();
					}
				}
			})
		]);

		// The three switches are the single entry point for every AI feature;
		// no extra "generate" buttons live here.
		pop.append(head, features, M.Dom.h(doc, 'div', { class: 'ml-hint', text: t('section.features.hint') }), status);
		doc.body.appendChild(pop);

		const onOutside = (event) => {
			if (!pop.contains(event.target) && !event.target.closest?.(`.${BUTTON_CLASS}`)) {
				closePopover(app);
			}
		};
		const onKey = (event) => {
			if (event.key === 'Escape') {
				closePopover(app);
			}
		};
		setTimeout(() => {
			doc.addEventListener('pointerdown', onOutside, true);
			doc.addEventListener('keydown', onKey, true);
		}, 0);
		app.popoverCleanup = () => {
			doc.removeEventListener('pointerdown', onOutside, true);
			doc.removeEventListener('keydown', onKey, true);
			app.popoverCleanup = null;
		};
		return pop;
	}

	function closePopover(app) {
		const pop = app.doc?.getElementById?.(POPOVER_ID);
		app.popoverCleanup?.();
		if (!pop) {
			return;
		}
		pop.classList.add('ml-closing');
		setTimeout(() => pop.remove(), 140);
		app.setButtonState?.();
	}

	// ------------------------------------------------------------------- app
	function createApp(reader, doc) {
		const app = {
			reader,
			doc,
			document: null,
			_docPromise: null,
			busyCount: 0,
			overlay: null,
			dock: null,
			views: {},
			button: null
		};

		app.toast = (message, type) => M.Toast.show(doc, message, { type });
		app.copy = (text) => {
			Zotero.Utilities.Internal.copyTextToClipboard(String(text || ''));
		};
		app.openSettings = () => {
			try {
				Zotero.Utilities.Internal.openPreferences('moonlit-reader-prefpane');
			}
			catch (e) {
				M.Log.error('openPreferences failed', e);
			}
		};
		app.setBusy = (busy) => {
			app.busyCount = Math.max(0, app.busyCount + (busy ? 1 : -1));
			app.setButtonState?.();
		};
		app.scrollDockTo = (card, options) => {
			// Mark programmatic scrolls so the dock→PDF sync does not treat them as
			// the user browsing the translation column.
			app.views?.translate?.markDockScrollProgrammatic?.();
			app.dock?.scrollToCard(card, options);
		};
		app.onDockScroll = () => app.views.translate?.onDockScroll?.();

		/**
		 * A failed AI job has to stay visible: a toast is gone in three seconds,
		 * which looks exactly like "nothing happened".
		 */
		app.setError = (message, detail = {}) => {
			if (!message) {
				app.dock?.setError?.(null);
				return;
			}
			const parts = [];
			if (detail.endpoint) {
				parts.push(t('error.endpoint', { url: detail.endpoint }));
			}
			if (detail.hint) {
				parts.push(detail.hint);
			}
			app.dock?.setError?.({
				title: t('toast.errorTitle'),
				message: String(message),
				hint: parts.join('\n')
			});
			app.toast(t('toast.error', { msg: message }), 'error');
		};
		app.onDockStateChange = () => app.setButtonState?.();

		app.ensureDocument = async (progress) => {
			if (app.document) {
				return app.document;
			}
			if (app._docPromise) {
				return app._docPromise;
			}
			app.setBusy(true);
			app._docPromise = (async () => {
				try {
					const maxPages = M.Prefs.getInt('extractMaxPages', 0);
					const document_ = await M.PdfDoc.extract(reader, {
						onProgress: (info) => {
							app.setTask('extract', {
								state: 'running',
								label: M.I18n.t('progress.extract'),
								done: info?.page || 0,
								total: info?.total || 0
							});
							progress?.(info);
						},
						stopAtReferences: true,
						maxPages: maxPages > 0 ? maxPages : undefined
					});
					// Scanned PDFs have no text layer: treat as "nothing to read"
					// and let the views explain it instead of failing hard.
					if (!document_.paragraphs?.length) {
						app.emptyDocument = true;
						M.Log.info('no text layer found in this attachment');
						return null;
					}
					app.document = document_;
					// Bind the token meter to this attachment's cache record so the
					// figure survives closing the reader and is shared by all views.
					try {
						app.record = await M.Cache.load(document_.attachmentKey);
						M.Usage.attach(document_.attachmentKey, app.record);
					}
					catch (e) {
						M.Log.debug('usage attach failed', e);
					}
					app.views.summary?.refresh?.();
					return document_;
				}
				catch (e) {
					app._docPromise = null;
					throw e;
				}
				finally {
					app.setBusy(false);
					app.setTask('extract', null);
				}
			})();
			return app._docPromise;
		};

		app.overlay = M.Overlay.create(reader);

		// ---- views + dock
		app.views.summary = M.SummaryView.create(app);
		app.views.translate = M.TranslateView.create(app);
		app.views.highlight = M.HighlightView.create(app);
		app.dock = M.Dock.create(app, app.views);

		/**
		 * Publish a running-job banner in the dock. Views call this on every tick;
		 * `null` clears it.
		 */
		app.setProgress = (next) => {
			app.dock?.setProgress?.(next || null);
		};

		/**
		 * Report a feature's own progress. Each feature keeps its own row, so a
		 * running summary never overwrites the translation count (and a paused
		 * feature keeps showing where it stopped instead of "waiting").
		 */
		app.setTask = (id, patch) => {
			app.dock?.setTask?.(id, patch ?? null);
		};
		app.taskOf = id => app.dock?.getTask?.(id) || null;

		// Persist the token meter alongside the rest of the cache, debounced by
		// the cache writer itself.
		app.saveUsage = M.Util.debounce(() => {
			const key = M.Usage.key;
			if (key && app.record) {
				M.Cache.save(key, app.record);
			}
		}, 900);
		M.Usage.onChange(() => app.saveUsage());

		app.applyFeatureState = async (key, value) => {
			const map = {
				enableTranslate: { tab: 'translate', view: app.views.translate },
				enableSummary: { tab: 'summary', view: app.views.summary },
				enableHighlight: { tab: 'highlight', view: app.views.highlight }
			};
			const entry = map[key];
			if (!entry) {
				return;
			}
			if (value) {
				// Turning a switch on is the entry point for the feature, so it has to
				// start the work: opening an empty tab and waiting for a second click is
				// exactly what looks like "nothing happens".
				await app.runFeature(entry.tab);
				app.setButtonState();
			}
			else {
				entry.view?.deactivate?.();
				const anyOn = M.Prefs.getBool('enableTranslate', false)
					|| M.Prefs.getBool('enableSummary', false)
					|| M.Prefs.getBool('enableHighlight', false);
				if (!anyOn) {
					app.dock.close();
				}
				app.setButtonState();
			}
		};

		app.runFeature = async (name) => {
			if (name === 'summary') {
				M.Prefs.set('enableSummary', true);
				app.dock.open('summary');
				// A cached summary for the same language is reused; `force` stays off so
				// flipping the switch does not burn tokens again.
				await app.views.summary.generate({ force: false });
			}
			else if (name === 'translate') {
				M.Prefs.set('enableTranslate', true);
				app.dock.open('translate');
				await app.views.translate.activate();
				app.views.translate.start();
			}
			else if (name === 'highlight') {
				M.Prefs.set('enableHighlight', true);
				app.dock.open('highlight');
				await app.views.highlight.activate();
				if (!app.views.highlight.points?.length) {
					await app.views.highlight.run();
				}
			}
			app.setButtonState?.();
		};

		/**
		 * Resume whichever feature the saved switches say is on. Only cached work is
		 * reused (nothing is regenerated), and only the visible tab actually talks to
		 * the model — the other views start when their tab is opened.
		 */
		app.resumeFeature = async (tab) => {
			try {
				if (tab === 'translate' && M.Prefs.getBool('enableTranslate', false)) {
					await app.views.translate.activate();
					app.views.translate.start();
				}
				else if (tab === 'summary' && M.Prefs.getBool('enableSummary', false)) {
					await app.views.summary.generate({ force: false });
				}
				else if (tab === 'highlight' && M.Prefs.getBool('enableHighlight', false)) {
					await app.views.highlight.activate();
					// Never re-run on every open: only when nothing was cached.
					if (!app.views.highlight.points?.length) {
						await app.views.highlight.run();
					}
				}
			}
			catch (e) {
				M.Log.error('resume failed', e);
			}
		};

		/**
		 * Start a feature that is already switched on but not running, e.g. after the
		 * user turned it off and on again. Work already done is kept.
		 */
		app.continueFeature = (tab) => {
			app.resumeFeature(tab);
		};

		// ---- hover linking: PDF -> translation column
		app.overlay.bindPointer((hit) => {
			app.views.translate?.onPdfHover?.(hit);
		});

		app.setButtonState = () => {
			const button = app.button;
			if (!button) {
				return;
			}
			const anyOn = M.Prefs.getBool('enableTranslate', false)
				|| M.Prefs.getBool('enableSummary', false)
				|| M.Prefs.getBool('enableHighlight', false);
			button.classList.toggle('ml-on', anyOn);
			button.classList.toggle('ml-busy', app.busyCount > 0);
			button.classList.toggle('ml-open', !!doc.getElementById(POPOVER_ID));
		};

		app.togglePopover = () => {
			if (doc.getElementById(POPOVER_ID)) {
				closePopover(app);
				return;
			}
			buildPopover(app);
			app.setButtonState();
		};

		// ------------------------------------------------------------ shortcuts
		const onKeyDown = (event) => {
			try {
				if (event.defaultPrevented || event.altKey) {
					return;
				}
				const key = String(event.key || '');
				if (key === 'Escape') {
					if (doc.getElementById(POPOVER_ID)) {
						app.togglePopover();
						event.preventDefault();
					}
					return;
				}
				if ((event.metaKey || event.ctrlKey) && event.shiftKey && key.toLowerCase() === 'm') {
					event.preventDefault();
					event.stopPropagation();
					app.dock.toggle();
					app.setButtonState();
				}
			}
			catch (e) {
				M.Log.debug('shortcut failed', e);
			}
		};
		const bindShortcuts = () => {
			for (const target of [doc, M.PdfDoc.getPdfDocEl(reader)]) {
				try {
					target?.addEventListener?.('keydown', onKeyDown, true);
				}
				catch (e) {
					// the pdf frame may not be ready yet
				}
			}
		};
		app.unbindShortcuts = () => {
			for (const target of [doc, M.PdfDoc.getPdfDocEl(reader)]) {
				try {
					target?.removeEventListener?.('keydown', onKeyDown, true);
				}
				catch (e) {
					// ignore
				}
			}
		};
		try {
			bindShortcuts();
		}
		catch (e) {
			M.Log.debug('bindShortcuts failed', e);
		}

		app.destroy = () => {
			try {
				app.unbindShortcuts?.();
				closePopover(app);
				app.overlay.dispose();
				app.views.translate?.destroy?.();
				app.dock.destroy();
				app.button?.remove();
				M.Styles.remove(doc);
			}
			catch (e) {
				M.Log.debug('app destroy failed', e);
			}
		};

		return app;
	}

	// --------------------------------------------------------------- toolbar
	function ensureToolbarButton(app) {
		const doc = app.doc;
		const toolbar = doc.querySelector('.toolbar');
		if (!toolbar) {
			return null;
		}
		let button = doc.getElementById('moonlit-toolbar-button');
		if (button) {
			app.button = button;
			app.setButtonState();
			return button;
		}
		button = doc.createElement('button');
		button.id = 'moonlit-toolbar-button';
		button.className = BUTTON_CLASS;
		button.type = 'button';
		button.title = t('toolbar.tooltip');
		button.setAttribute('aria-label', t('toolbar.tooltip'));
		button.innerHTML = `${M.Icons.get('moon')}<span class="ml-toolbar-dot"></span>`;
		button.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			app.togglePopover();
		});

		const host = toolbar.querySelector('.end .custom-sections') || toolbar.querySelector('.end');
		if (!host) {
			return null;
		}
		if (host.classList.contains('custom-sections')) {
			const section = doc.createElement('div');
			section.className = 'section';
			section.appendChild(button);
			host.appendChild(section);
		}
		else {
			const slot = doc.createElement('div');
			slot.className = 'ml-toolbar-slot';
			slot.appendChild(button);
			host.prepend(slot);
		}
		app.button = button;
		app.setButtonState();
		return button;
	}

	// ---------------------------------------------------------------- attach
	async function attach(reader) {
		if (!reader) {
			return null;
		}
		// Only PDF views get the AI toolbox; EPUB/HTML readers are left alone.
		try {
			if (reader._type && reader._type !== 'pdf') {
				return null;
			}
		}
		catch (e) {
			// fall through and try
		}
		if (attached.has(reader)) {
			return attached.get(reader);
		}
		if (pending.has(reader)) {
			return pending.get(reader);
		}
		const promise = (async () => {
			const doc = await waitForReader(reader);
			if (!doc) {
				M.Log.debug('reader document never became ready');
				return null;
			}
			M.Styles.inject(doc);
			const app = createApp(reader, doc);
			attached.set(reader, app);
			ensureToolbarButton(app);

			// Apply persisted toggles once the reader is ready.
			try {
				const nodes = await Zotero.Items.getAsync(reader.itemID);
				app.meta = nodes;
			}
			catch (e) {
				// ignore
			}
			const anyOn = M.Prefs.getBool('enableTranslate', false)
				|| M.Prefs.getBool('enableSummary', false)
				|| M.Prefs.getBool('enableHighlight', false);
			if (anyOn) {
				const tab = M.Prefs.getString('dockTab', 'summary');
				app.dock.open(tab);
				// The switch is still on, so the feature has to keep working after the
				// reader was reopened: resume it instead of showing an empty column.
				app.resumeFeature(tab);
			}

			// Tear down when the reader tab goes away.
			try {
				reader._iframeWindow.addEventListener('unload', () => {
					app.destroy();
					attached.delete(reader);
				});
			}
			catch (e) {
				// ignore
			}

			M.Log.debug('attached to reader', reader.itemID);
			return app;
		})();
		pending.set(reader, promise);
		const result = await promise;
		pending.delete(reader);
		return result;
	}

	/** Attach to every reader that is currently open. */
	function attachAll() {
		let readers = [];
		try {
			readers = Zotero.Reader?._readers || [];
		}
		catch (e) {
			readers = [];
		}
		for (const reader of readers) {
			attach(reader).catch(e => M.Log.error('attach failed', e));
		}
	}

	function detachAll() {
		try {
			for (const reader of Zotero.Reader?._readers || []) {
				const app = attached.get(reader);
				app?.destroy();
				attached.delete(reader);
			}
		}
		catch (e) {
			M.Log.debug('detachAll failed', e);
		}
	}

	/**
	 * Keep the toolbar button alive if the reader re-renders its toolbar.
	 * Called from the `renderToolbar` plugin event.
	 */
	async function onRenderToolbar(reader) {
		const app = await attach(reader);
		if (app) {
			ensureToolbarButton(app);
		}
	}

	M.ReaderUI = {
		attach,
		attachAll,
		detachAll,
		ensureToolbarButton,
		onRenderToolbar,
		readerDoc,
		attached
	};
})();
