/* global Zotero */

/**
 * Plugin entry point: registers the preference pane, hooks the reader, keeps
 * state in sync and tears everything down on shutdown.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	const observers = [];
	let selectionPopupWired = false;

	const RESULT_KEYS = new Set(['targetLang', 'provider', 'model', 'baseURL', 'granularity']);

	function prefChanged(changedKey) {
		M.Log.init();
		if (['provider', 'model', 'baseURL', 'apiKey'].includes(changedKey)) {
			M.ConfigBackup.save().catch(e => M.Log.debug('config backup save failed', e));
		}
		try {
			for (const reader of Zotero.Reader?._readers || []) {
				const app = M.ReaderUI.attached.get(reader);
				app?.setButtonState?.();
				// A different language/model invalidates cached AI output, so kick
				// the affected feature instead of leaving stale results on screen.
				if (changedKey && RESULT_KEYS.has(changedKey)) {
					if (app?.isFeatureOn?.('summary')) {
						app?.views?.summary?.generate?.({ force: true });
					}
					if (app?.isFeatureOn?.('translate')) {
						app?.views?.translate?.retranslate?.();
					}
				}
			}
		}
		catch (e) {
			M.Log.debug('prefChanged failed', e);
		}
	}

	async function registerPane() {
		try {
			await Zotero.PreferencePanes.register({
				pluginID: M.id,
				id: 'moonlit-reader-prefpane',
				label: 'Moonlit Reader',
				image: `${M.rootURI}content/icons/moonlit.svg`,
				src: `${M.rootURI}content/preferences.xhtml`,
				scripts: [`${M.rootURI}content/scripts/preferences.js`],
				stylesheets: [`${M.rootURI}content/preferences.css`]
			});
		}
		catch (e) {
			Zotero.logError(e);
		}
	}

	function wireReaderEvents() {
		Zotero.Reader.registerEventListener('renderToolbar', (event) => {
			const { reader } = event;
			M.ReaderUI.attach(reader)
				.then(app => {
					if (app) {
						M.ReaderUI.ensureToolbarButton(app);
					}
				})
				.catch(e => M.Log.error('renderToolbar hook failed', e));
		}, M.id);

		if (selectionPopupWired) {
			return;
		}
		selectionPopupWired = true;
		Zotero.Reader.registerEventListener('renderTextSelectionPopup', (event) => {
			try {
				addSelectionActions(event);
			}
			catch (e) {
				M.Log.debug('selection popup failed', e);
			}
		}, M.id);
	}

	/** "AI 翻译 / 解释" buttons inside the reader's text-selection popup. */
	function addSelectionActions(event) {
		const { reader, doc, params, append } = event;
		const text = String(params?.annotation?.text || '').trim();
		if (!text || text.length < 2) {
			return;
		}
		const container = doc.createElement('div');
		container.className = 'ml-selection-actions ml-ui';

		const result = doc.createElement('div');
		result.className = 'ml-selection-result';

		const runTranslate = async (button) => {
			if (!M.AI.isConfigured()) {
				M.Toast.show(doc, M.I18n.t('toast.noKey'), { type: 'error' });
				return false;
			}
			button.disabled = true;
			button.textContent = M.I18n.t('selection.translating');
			result.textContent = '';
			try {
				const request = M.Prompts.buildTranslatePrompt({
					sentences: [{ id: 'sel', text }],
					paragraphText: text,
					index: 0,
					total: 1
				});
				const raw = await M.AI.complete({
					kind: 'selection',
					system: request.system,
					prompt: request.prompt,
					json: true
				});
				const parsed = M.AI.parseJson(raw);
				result.textContent = parsed?.translations?.[0]?.text || raw;
			}
			catch (e) {
				result.textContent = M.I18n.t('toast.error', { msg: e.message });
			}
			button.disabled = false;
			button.textContent = M.I18n.t('selection.translate');
			return true;
		};

		const translateButton = M.Dom.button(doc, {
			label: M.I18n.t('selection.translate'),
			icon: 'translate',
			onClick: () => runTranslate(translateButton)
		});

		const explainButton = M.Dom.button(doc, {
			label: M.I18n.t('selection.explain'),
			icon: 'sparkle',
			onClick: async () => {
				if (!M.AI.isConfigured()) {
					M.Toast.show(doc, M.I18n.t('toast.noKey'), { type: 'error' });
					return;
				}
				explainButton.disabled = true;
				result.textContent = '';
				try {
					const title = M.PdfDoc.getViewer(reader) ? '' : '';
					void title;
					const raw = await M.AI.complete({
					kind: 'selection',
						system: M.Prompts.isChinese(M.Prompts.targetLanguage())
							? '你是一位耐心的论文讲解者，用简体中文、3 句以内解释用户选中的内容，必要时补充背景，不要编造事实。'
							: 'You are a patient paper explainer. Explain the selected passage in at most 3 sentences, without inventing facts.',
						prompt: text
					});
					result.textContent = raw.trim();
				}
				catch (e) {
					result.textContent = M.I18n.t('toast.error', { msg: e.message });
				}
				explainButton.disabled = false;
			}
		});

		container.append(translateButton, explainButton);
		append(container);
		append(result);
	}

	/**
	 * Developer probe: hand each XPI in a directory to the real AddonManager and
	 * log what it says, so we verify the packaged artifact passes the same
	 * validation as a manual "Install Plugin From File…".
	 */
	async function checkPackages() {
		// Reading this from a file keeps the probe usable even when the test
		// profile rewrites prefs.js while Zotero is running.
		let dir = M.Prefs.getString('devCheckDir', '');
		let installMode = M.Prefs.getBool('devCheckInstall', false);
		try {
			const marker = PathUtils.join(M.Paths.dataDir(), 'check.txt');
			const raw = await IOUtils.readUTF8(marker);
			const lines = String(raw).split('\n').map(line => line.trim()).filter(Boolean);
			dir = lines.find(line => line.startsWith('/')) || dir;
			installMode = lines.includes('install') || installMode;
		}
		catch (e) {
			// no marker file: fall back to the pref
		}
		if (!dir) {
			return;
		}
		try {
			const { AddonManager } = ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
			const entries = await IOUtils.getChildren(dir);
			for (const entry of entries) {
				const path = String(entry);
				if (!path.endsWith('.xpi')) {
					continue;
				}
				const name = path.split('/').pop();
				try {
					const install = await AddonManager.getInstallForFile(
						Zotero.File.pathToFile(path),
						'application/x-xpinstall'
					);
					M.Log.info('package check', {
						file: name,
						state: install.state,
						error: AddonManager.errorToString(install.error) || 'OK',
						addon: install.addon
							? {
								id: install.addon.id,
								version: install.addon.version,
								appDisabled: install.addon.appDisabled,
								isCompatible: install.addon.isCompatible
							}
							: null
					});
					if (installMode && install.state === AddonManager.STATE_DOWNLOADED) {
						// Exercise the full path a manual install takes, including
						// the download → verify → install → enable steps.
						const done = new Promise(resolve => {
							install.addListener({
								onInstallEnded: (installation, addon) => resolve({
									ok: true,
									id: addon.id,
									version: addon.version,
									needsRestart: installation.state === AddonManager.STATE_INSTALLED
								}),
								onInstallFailed: installation => resolve({
									ok: false,
									error: AddonManager.errorToString(installation.error) || installation.error
								}),
								onInstallCancelled: () => resolve({ ok: false, error: 'cancelled' })
							});
							install.install();
						});
						const outcome = await done;
						M.Log.info('package install', { file: name, ...outcome });
						continue;
					}
					try {
						install.cancel();
					}
					catch (e) {
						// ignore
					}
				}
				catch (e) {
					M.Log.info('package check threw', { file: name, message: e.message });
				}
			}
		}
		catch (e) {
			M.Log.error('checkPackages failed', e);
		}
	}

	M.Main = {
		async startup() {
			M.I18n.init(Zotero.locale);
			M.Log.init();
			M.Log.info(`starting v${M.version}`);
			try {
				const restored = await M.ConfigBackup.restore();
				if (restored.length) {
					M.Log.info('restored settings from backup', restored);
				}
				else if (await M.ConfigBackup.saveIfMissing()) {
					M.Log.debug('seeded config backup');
				}
			}
			catch (e) {
				M.Log.debug('config backup restore failed', e);
			}
			try {
				const provider = M.Prefs.provider();
				M.Log.info('config', {
					provider: provider.id,
					model: provider.model,
					baseURL: provider.baseURL,
					endpoint: M.AI.endpoint(provider.baseURL),
					stream: M.Prefs.getBool('stream', true),
					maxTokens: M.Prefs.getInt('maxTokens', 8192),
					stallSeconds: M.Prefs.getInt('stallSeconds', 15),
					hasKey: !!M.Prefs.getString('apiKey', ''),
					...M.AI.describeTransport()
				});
				if (!M.Prefs.getString('apiKey', '')) {
					M.Log.info('no API key configured: AI features stay idle until 设置 → Moonlit Reader is filled in');
				}
			}
			catch (e) {
				M.Log.debug('config log failed', e);
			}

			await registerPane();
			wireReaderEvents();

			// The preferences pane runs in its own sandbox (no IOUtils, no plugin
			// globals), so file work is delegated back to the plugin through Zotero.
			try {
				Zotero.__moonlitBridge = {
					version: M.version,
					clearCache: () => M.Cache.clearAll()
				};
			}
			catch (e) {
				M.Log.debug('bridge registration failed', e);
			}

			// Toggles are shared between the popover and the pref pane.
			for (const key of ['debug', 'targetLang', 'granularity', 'apiKey', 'provider', 'model', 'baseURL']) {
				try {
					observers.push(M.Prefs.registerObserver(key, () => prefChanged(key)));
				}
				catch (e) {
					M.Log.debug('observer registration failed', key, e);
				}
			}

			// Attach to readers that were already open before the plugin loaded.
			setTimeout(() => {
				try {
					M.ReaderUI.attachAll();
				}
				catch (e) {
					M.Log.error('attachAll failed', e);
				}
			}, 1200);

			// A reader can also be opened later from another window.
			setTimeout(() => {
				try {
					checkPackages();
					M.SelfTest.maybeRun();
				}
				catch (e) {
					M.Log.error('self-test failed', e);
				}
			}, 3500);
		},

		async shutdown() {
			M.Log.info('shutting down');
			M.AI.abortAll();
			for (const symbol of observers) {
				try {
					M.Prefs.unregisterObserver(symbol);
				}
				catch (e) {
					// ignore
				}
			}
			observers.length = 0;
			M.ReaderUI.detachAll();
		},

		addSelectionActions
	};
})();
