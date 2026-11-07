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
		// One row per feature: switch on the right, live status underneath. The status
		// line is the thing that keeps "what the switch says" and "what is happening"
		// visibly identical instead of leaving the user to guess.
		app.popoverRows = [];
		for (const row of rows) {
			const name = FEATURE_BY_KEY[row.key] || 'translate';
			const title = M.Dom.h(doc, 'div', { class: 'ml-row-title', text: row.title });
			const desc = M.Dom.h(doc, 'div', { class: 'ml-row-desc', text: row.desc });
			const statusEl = M.Dom.h(doc, 'div', { class: 'ml-row-status', text: '' });
			const resumeBtn = M.Dom.button(doc, {
				class: 'ml-mini ml-row-resume',
				label: t('feature.resume'),
				onClick: () => {
					app.applyFeatureState(row.key, app.isFeatureOn(name) ? false : true);
				}
			});
			resumeBtn.hidden = true;
			const sw = M.Dom.switchControl(doc, app.isFeatureOn(name), async (value) => {
				await app.applyFeatureState(row.key, value);
			});
			const rowEl = M.Dom.h(doc, 'div', { class: 'ml-row', attrs: { 'data-feature': name } }, [
				M.Dom.h(doc, 'div', { class: 'ml-row-text' }, [title, desc, statusEl]),
				M.Dom.h(doc, 'div', { class: 'ml-row-side' }, [resumeBtn, sw])
			]);
			features.appendChild(rowEl);
			app.popoverRows.push({ key: row.key, name, sw, statusEl, desc, resumeBtn, rowEl });
		}

		/**
		 * Re-paint the switch and the status line from the model. Called on every
		 * task change and every toggle, so the popover cannot drift while it is open.
		 */
		app.refreshPopoverRows = () => {
			const rowsInDom = app.popoverRows || [];
			for (const row of rowsInDom) {
				if (!row.sw || !row.sw.isConnected) {
					continue;
				}
				const on = app.isFeatureOn(row.name);
				row.sw.setAttribute('aria-checked', on ? 'true' : 'false');
				const state = app.featureState(row.name);
				row.rowEl.setAttribute('data-state', state);
				row.rowEl.classList.toggle('ml-row-on', on);
				row.statusEl.textContent = app.featureStatusText(row.name);
				row.statusEl.className = `ml-row-status ml-row-status-${state}`;
				row.desc.style.display = state === 'off' ? '' : 'none';
				row.resumeBtn.hidden = !(state === 'paused' || (state === 'off' && on));
				row.resumeBtn.textContent = state === 'paused' ? t('feature.resume') : t('feature.start');
			}
		};
		app.popoverRows = app.popoverRows || [];

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
		// Only now are the rows in the document: refresh checks `isConnected`.
		app.refreshPopoverRows();

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
		// Debug breadcrumb: which code path dismissed the popover.
		app.lastPopoverClose = (new Error().stack || '').split('\n').slice(1, 4).join(' | ');
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

		/**
		 * Feature switches are per paper, not global.
		 *
		 * Keeping them in one pref meant the next paper opened with the previous
		 * paper's switches already on — nothing had run for that paper, so the user
		 * had to toggle off and on to make it work. Each paper stores its own three
		 * flags in its cache record; a paper that has never been used starts off.
		 */
		app.featureFlags = { translate: false, summary: false, highlight: false };
		/** Bumped on every user toggle, so a slow flag load cannot undo a click. */
		app.flagEpoch = 0;
		app.flagsLoaded = false;

		app.isFeatureOn = name => !!app.featureFlags?.[name];

		app.anyFeatureOn = () => Object.values(app.featureFlags || {}).some(Boolean);

		app.loadFeatureFlags = async () => {
			const epochAtStart = app.flagEpoch;
			let flags = { translate: false, summary: false, highlight: false };
			try {
				const attachment = Zotero.Items.get(reader.itemID);
				const key = attachment?.key || `${reader.itemID}`;
				app.recordKey = key;
				const record = await M.Cache.load(key);
				app.record = record;
				if (record?.enabled) {
					flags = {
						translate: !!record.enabled.translate,
						summary: !!record.enabled.summary,
						highlight: !!record.enabled.highlight
					};
				}
			}
			catch (e) {
				M.Log.debug('feature flags load failed', e);
			}
			// The user may have clicked a switch while the record was loading: their
			// choice wins, otherwise the switch would silently flip back.
			if (app.flagEpoch === epochAtStart) {
				app.featureFlags = flags;
			}
			else {
				M.Log.debug('feature flags: keeping the user choice made during load');
			}
			app.flagsLoaded = true;
			app.syncFeatureUi();
			return app.featureFlags;
		};

		app.saveFeatureFlags = async () => {
			try {
				const key = app.document?.attachmentKey || app.recordKey;
				if (!key) {
					return;
				}
				const record = app.record || await M.Cache.load(key);
				record.enabled = { ...app.featureFlags };
				app.record = record;
				// Flush quickly: a switch flipped right before Zotero closes must survive.
				M.Cache.save(key, record);
				setTimeout(() => M.Cache.flush(key).catch(() => {}), 250);
			}
			catch (e) {
				M.Log.debug('feature flags save failed', e);
			}
		};

		/**
		 * What the UI should show for one feature.
		 *
		 * The switch is the user's intent; the dock task is what is actually
		 * happening. Deriving a single state from both is what keeps them aligned.
		 */
		app.featureState = (name) => {
			const on = app.isFeatureOn(name);
			const task = app.dock?.getTask?.(name) || null;
			const running = task?.state === 'running';
			if (running) {
				return 'running';
			}
			if (task?.state === 'error') {
				return 'error';
			}
			if (!on) {
				return task?.state === 'paused' ? 'paused' : 'off';
			}
			if (task?.state === 'paused') {
				return 'paused';
			}
			if (task?.state === 'done') {
				return 'done';
			}
			return 'ready';
		};

		/** Human-readable status line for one feature row. */
		app.featureStatusText = (name) => {
			const state = app.featureState(name);
			const task = app.dock?.getTask?.(name) || null;
			const progress = task && task.total
				? ` · ${Math.min(task.done || 0, task.total)}/${task.total}`
				: '';
			switch (state) {
				case 'running': return t('feature.running') + progress;
				case 'paused': return t('feature.paused') + progress;
				case 'done': return t('feature.done') + progress;
				case 'error': return t('feature.error') + progress;
				case 'ready': return t('feature.ready');
				default: return t('feature.off');
			}
		};

		/** Push the model to every place that displays it. */
		app.syncFeatureUi = () => {
			try {
				app.setButtonState?.();
				app.refreshPopoverRows?.();
			}
			catch (e) {
				M.Log.debug('syncFeatureUi failed', e);
			}
		};

		/** Set one paper's switch without running anything (tests, restore). */
		app.setFeature = (name, value, { user = false } = {}) => {
			const next = !!value;
			if (app.featureFlags?.[name] === next) {
				app.syncFeatureUi();
				return next;
			}
			app.featureFlags = { ...(app.featureFlags || {}), [name]: next };
			if (user) {
				app.flagEpoch += 1;
			}
			app.syncFeatureUi();
			app.saveFeatureFlags();
			return next;
		};

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
			const featureName = FEATURE_BY_KEY[key] || entry.tab;
			app.setFeature(featureName, !!value, { user: true });
			if (value) {
				// Turning a switch on is the entry point for the feature, so it has to
				// start the work: opening an empty tab and waiting for a second click is
				// exactly what looks like "nothing happens".
				const started = await app.runFeature(entry.tab);
				if (!started) {
					// Refused (no key / no text): do not leave the switch lying about it.
					app.setFeature(featureName, false);
					entry.view?.deactivate?.();
				}
				app.syncFeatureUi();
			}
			else {
				entry.view?.deactivate?.();
				if (!app.anyFeatureOn()) {
					app.dock.close();
				}
				app.setButtonState();
			}
		};

		/**
		 * Start a feature. Returns true when it is running (or already complete).
		 *
		 * A switch that flips on but cannot run — no API key, scanned PDF — used to
		 * stay on forever, which is exactly the "switch says on, nothing happens"
		 * mismatch. The caller rolls the switch back when this returns false.
		 */
		app.runFeature = async (name) => {
			let started = false;
			if (name === 'summary') {
				app.setFeature('summary', true);
				app.dock.open('summary');
				// A cached summary for the same language is reused; `force` stays off so
				// flipping the switch does not burn tokens again.
				started = await app.views.summary.generate({ force: false });
			}
			else if (name === 'translate') {
				app.setFeature('translate', true);
				app.dock.open('translate');
				await app.views.translate.activate();
				started = await app.views.translate.start();
			}
			else if (name === 'highlight') {
				app.setFeature('highlight', true);
				app.dock.open('highlight');
				await app.views.highlight.activate();
				started = app.views.highlight.points?.length
					? true
					: await app.views.highlight.run();
			}
			app.syncFeatureUi();
			return started !== false;
		};

		/**
		 * Resume whichever feature the saved switches say is on. Only cached work is
		 * reused (nothing is regenerated), and only the visible tab actually talks to
		 * the model — the other views start when their tab is opened.
		 */
		app.resumeFeature = async (tab) => {
			try {
				if (tab === 'translate' && app.isFeatureOn('translate')) {
					await app.views.translate.activate();
					app.views.translate.start();
				}
				else if (tab === 'summary' && app.isFeatureOn('summary')) {
					await app.views.summary.generate({ force: false });
				}
				else if (tab === 'highlight' && app.isFeatureOn('highlight')) {
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
			const anyOn = app.anyFeatureOn();
			const states = ['translate', 'summary', 'highlight'].map(name => app.featureState?.(name) || 'off');
			const running = states.includes('running') || app.busyCount > 0;
			const paused = states.includes('paused');
			const failed = states.includes('error');
			button.classList.toggle('ml-on', anyOn);
			button.classList.toggle('ml-busy', running);
			button.classList.toggle('ml-paused', paused && !running);
			button.classList.toggle('ml-error', failed);
			button.classList.toggle('ml-open', !!doc.getElementById(POPOVER_ID));
			const label = failed
				? t('button.state.error')
				: running
					? t('button.state.running')
					: paused
						? t('button.state.paused')
						: anyOn ? t('button.state.on') : t('button.state.off');
			button.setAttribute('aria-label', label);
			button.setAttribute('title', label);
		};

		/**
		 * The dock is the source of truth for what is running; mirror it into the
		 * button and the popover the moment it changes.
		 */
		app.onTaskChange = () => {
			app.syncFeatureUi();
		};

		app.togglePopover = () => {
			const existing = doc.getElementById(POPOVER_ID);
			if (existing && !existing.classList.contains('ml-closing')) {
				closePopover(app);
				return;
			}
			// A popover that is fading out must not block reopening it: the close
			// animation leaves the element in the DOM for 140 ms.
			existing?.remove();
			app.popoverCleanup?.();
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
			await app.loadFeatureFlags();
			app.setButtonState();
			if (app.anyFeatureOn()) {
				const tab = app.isFeatureOn(M.Prefs.getString('dockTab', 'summary'))
					? M.Prefs.getString('dockTab', 'summary')
					: ['translate', 'summary', 'highlight'].find(name => app.isFeatureOn(name));
				app.dock.open(tab);
				// Only resume what this paper had switched on; a paper that has never
				// been translated opens with the switches off.
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

	/** Pref-style switch key → feature name used by the per-paper flags. */
	const FEATURE_BY_KEY = {
		enableTranslate: 'translate',
		enableSummary: 'summary',
		enableHighlight: 'highlight'
	};

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
