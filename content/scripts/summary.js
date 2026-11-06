/**
 * Right-sidebar paper summary: metadata card + streaming structured markdown.
 *
 * Long papers are summarised map-reduce style (per-chunk notes, then a final
 * synthesis) so quality does not depend on the model's context window.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});
	const t = (key, vars) => M.I18n.t(key, vars);

	const CHUNK_SIZE = 9000;
	const MAP_CONCURRENCY = 3;

	function create(app) {
		const doc = app.doc;
		const state = {
			enabled: false,
			running: false,
			abort: null,
			text: '',
			record: null,
			renderedAt: 0,
			progress: null,
			nonStream: false
		};

		const root = M.Dom.h(doc, 'div', { class: 'ml-view ml-view-summary' });
		const metaCard = M.Dom.h(doc, 'div', { class: 'ml-meta-card' });
		const toolbar = M.Dom.h(doc, 'div', { class: 'ml-toolrow' });
		const statusLabel = M.Dom.h(doc, 'div', { class: 'ml-mutelabel', text: '' });
		const body = M.Dom.h(doc, 'div', { class: 'ml-summary' });
		const empty = M.Dom.h(doc, 'div', { class: 'ml-empty' }, [
			M.Dom.h(doc, 'div', { class: 'ml-empty-icon', html: M.Icons.get('summary') }),
			M.Dom.h(doc, 'div', { class: 'ml-empty-title', text: t('summary.empty.title') }),
			M.Dom.h(doc, 'div', { class: 'ml-empty-desc', text: t('summary.empty.desc') }),
			M.Dom.h(doc, 'div', { class: 'ml-empty-hint', text: t('empty.useSwitch') })
		]);

		let btnCopy;
		let btnNote;
		let btnClear;

		function buildToolbar() {
			btnCopy = M.Dom.iconButton(doc, 'copy', t('action.copy'), () => {
				app.copy(M.Markdown.toPlainText(state.text));
				app.toast(t('action.copied'), 'success');
			});
			btnNote = M.Dom.iconButton(doc, 'book', t('action.saveNote'), async () => {
				if (!state.text && !app.views.highlight?.points?.length) {
					return;
				}
				btnNote.disabled = true;
				try {
					const result = await M.Notes.save(app.reader, {
						title: app.document?.meta?.title,
						meta: [app.document?.meta?.authors, app.document?.meta?.venue, app.document?.meta?.year]
							.filter(Boolean)
							.join(' · '),
						summaryMarkdown: state.text,
						points: pointsForNote()
					});
					if (result) {
						app.toast(t('action.noteSaved'), 'success');
					}
					else {
						app.toast(t('action.noteFailed'), 'error');
					}
				}
				catch (e) {
					M.Log.error('save note failed', e);
					app.toast(t('action.noteFailed'), 'error');
				}
				btnNote.disabled = false;
			});
			// Clearing is per paper: the summary of this PDF only.
			btnClear = M.Dom.iconButton(doc, 'trash', t('action.clearSummary'), () => {
				if (!state.text) {
					return;
				}
				if (!btnClear.classList.contains('ml-armed')) {
					btnClear.classList.add('ml-armed');
					btnClear.title = t('action.confirmClear');
					setTimeout(() => {
						btnClear.classList.remove('ml-armed');
						btnClear.title = t('action.clearSummary');
					}, 3200);
					return;
				}
				btnClear.classList.remove('ml-armed');
				btnClear.title = t('action.clearSummary');
				clearSummary();
			});
			toolbar.append(statusLabel, M.Dom.h(doc, 'div', { class: 'ml-grow' }), btnClear, btnNote, btnCopy);
			syncToolbar();
		}

		/** Drop this paper's summary (screen + cache), leaving translation alone. */
		function clearSummary() {
			state.text = '';
			state.nonStream = false;
			if (state.record) {
				state.record.summary = null;
				M.Cache.save(state.record.attachmentKey, state.record);
			}
			paint();
			syncToolbar();
			renderMeta();
			app.setTask('summary', null);
			app.toast(t('action.summaryCleared'));
		}

		/** Key points from the highlight view, shaped for the note exporter. */
		function pointsForNote() {
			const points = app.views.highlight?.points || [];
			return points.map(point => ({
				label: point.label || point.type || '',
				quote: point.quote || '',
				note: point.note || '',
				pageIndex: point.pageIndex
			}));
		}

		function syncToolbar() {
			btnCopy.style.display = state.text ? 'inline-flex' : 'none';
			btnClear.style.display = state.text ? 'inline-flex' : 'none';
			btnNote.style.display = (state.text || pointsForNote().length) ? 'inline-flex' : 'none';
		}

		function renderMeta() {
			const meta = app.document?.meta || {};
			M.Dom.clear(metaCard);
			if (!meta.title && !meta.authors) {
				metaCard.style.display = 'none';
				return;
			}
			metaCard.style.display = 'flex';
			metaCard.append(
				M.Dom.h(doc, 'div', { class: 'ml-meta-title', text: meta.title || '' }),
				M.Dom.h(doc, 'div', {
					class: 'ml-meta-sub',
					text: [meta.authors, meta.venue, meta.year].filter(Boolean).join(' · ')
				})
			);
		}

		function paint({ streaming = false } = {}) {
			body.innerHTML = M.Markdown.render(state.text);
			if (streaming) {
				const caret = doc.createElement('span');
				caret.className = 'ml-caret';
				body.appendChild(caret);
			}
			empty.style.display = state.text ? 'none' : 'flex';
			body.style.display = state.text ? 'block' : 'none';
		}

		const throttledPaint = M.Util.debounce(() => paint({ streaming: state.running }), 60);

		async function generate({ force = false } = {}) {
			if (state.running) {
				return;
			}
			if (!M.AI.isConfigured()) {
				app.toast(t('toast.noKey'), 'error');
				app.openSettings();
				return;
			}
			state.running = true;
			state.aborted = false;
			syncToolbar();
			statusLabel.textContent = t('summary.generating');
			try {
				await app.ensureDocument();
				if (!app.document || !app.document.fullText) {
					throw new Error(t('toast.noText'));
				}
				renderMeta();
				const record = await M.Cache.load(app.document.attachmentKey);
				state.record = record;
				if (!force && record.summary?.text) {
					state.text = record.summary.text;
					paint();
					statusLabel.textContent = '';
					state.running = false;
					syncToolbar();
					return;
				}
				state.text = '';
				paint({ streaming: true });

				state.abort = new M.Util.AbortController();
				const text = await runPipeline(state.abort.signal);
				state.text = text;
				paint();
				record.summary = {
					text,
					ts: Date.now(),
					model: M.AI.describe().model,
					lang: M.Prompts.targetLanguage()
				};
				M.Cache.save(app.document.attachmentKey, record);
				statusLabel.textContent = '';
				app.toast(t('summary.done'), 'success');
			}
			catch (e) {
				M.Log.error('summary failed', e);
				if (e.code !== 'aborted') {
					app.setError?.(e.message, { endpoint: e.endpoint, hint: t('error.hint') });
					app.setTask('summary', { state: 'error', label: t('task.error'), done: 0, total: 0 });
				}
				statusLabel.textContent = '';
				paint();
			}
			finally {
				state.running = false;
				syncToolbar();
				// A finished summary keeps its row as "done"; an aborted one is paused
				// so switching the feature back on shows it instead of restarting.
				app.setTask('summary', {
					state: state.aborted ? 'paused' : (state.text ? 'done' : 'idle'),
					label: state.aborted ? t('task.paused') : t('task.done'),
					done: state.text ? 1 : 0,
					total: 1,
					tab: 'summary'
				});
			}
		}

		async function runPipeline(signal) {
			const text = M.PdfDoc.textForSummary(app.document, 52000);
			const meta = M.PdfDoc.metaSummary(app.document);
			const targetLang = M.Prompts.targetLanguage();

			if (text.length <= CHUNK_SIZE * 1.4) {
				const request = M.Prompts.buildSummaryFinalPrompt({
					notes: text,
					meta,
					targetLang
				});
				state.nonStream = false;
				state.progress = { label: t('progress.waiting'), done: 0, total: 0 };
				app.setError?.(null);
				app.setTask('summary', {
					state: 'running',
					label: t('progress.summary'),
					done: 0,
					total: 0,
					tab: 'summary'
				});
				const result = await M.AI.complete({
					system: request.system,
					prompt: request.prompt,
					signal,
					kind: 'summary',
					onDelta: (_piece, full) => {
						state.text = full;
						throttledPaint();
					},
					onState: (next, info) => {
						if (next === 'rateLimited') {
							app.setTask('summary', {
								state: 'running',
								label: t('progress.rateLimited', { seconds: info?.seconds ?? 3 }),
								done: 0,
								total: 0,
								tab: 'summary'
							});
							return;
						}
						if (next === 'fallback' || next === 'bigger') {
							state.nonStream = true;
							app.setTask('summary', {
								state: 'running',
								label: t('progress.nonStream'),
								done: 0,
								total: 0,
								tab: 'summary'
							});
						}
					}
				});
				return result.trim();
			}

			// Map: notes per chunk
			const chunks = [];
			for (let i = 0; i < text.length; i += CHUNK_SIZE) {
				chunks.push(text.slice(i, i + CHUNK_SIZE));
			}
			let done = 0;
			const notes = await M.Util.mapLimit(chunks, MAP_CONCURRENCY, async (chunk, index) => {
				if (signal.aborted) {
					return '';
				}
				const request = M.Prompts.buildSummaryChunkPrompt({
					chunk,
					meta,
					chunkIndex: index,
					chunkCount: chunks.length,
					targetLang
				});
				try {
					const result = await M.AI.complete({
						system: request.system,
						prompt: request.prompt,
						signal,
						kind: 'summary'
					});
					return result.trim();
				}
				catch (e) {
					if (e.code === 'aborted') {
						return '';
					}
					M.Log.debug('chunk failed', e);
					return '';
				}
				finally {
					done++;
					statusLabel.textContent = `${t('summary.generating')} ${done}/${chunks.length}`;
					state.progress = {
						label: state.nonStream ? t('progress.nonStream') : t('progress.summary'),
						done,
						total: chunks.length
					};
					app.setTask('summary', {
						state: signal?.aborted ? 'paused' : 'running',
						label: state.progress.label,
						done,
						total: chunks.length,
						tab: 'summary'
					});
				}
			});
			const merged = notes.filter(Boolean).join('\n\n');
			if (!merged) {
				throw new Error(t('error.empty'));
			}
			const request = M.Prompts.buildSummaryFinalPrompt({
				notes: merged,
				meta,
				targetLang
			});
			const result = await M.AI.complete({
				system: request.system,
				prompt: request.prompt,
				signal,
				onDelta: (_piece, full) => {
					state.text = full;
					throttledPaint();
				}
			});
			return result.trim();
		}

		buildToolbar();
		root.append(metaCard, toolbar, empty, body);
		paint();

		return {
			el: root,
			get running() {
				return state.running;
			},
			get currentText() {
				return state.text;
			},
			async activate() {
				state.enabled = true;
				renderMeta();
				if (!state.text) {
					try {
						await app.ensureDocument();
						renderMeta();
					}
					catch (e) {
						M.Log.debug('summary activate ensureDocument failed', e);
					}
					const key = app.document?.attachmentKey;
					if (key) {
						const record = await M.Cache.load(key);
						if (record.summary?.text && record.summary.lang === M.Prompts.targetLanguage()) {
							state.text = record.summary.text;
							state.record = record;
							paint();
						}
					}
				}
				if (M.Prefs.getBool('autoSummaryOnOpen', false) && !state.text) {
					generate();
				}
			},
			deactivate() {
				const wasRunning = !!state.running;
				state.enabled = false;
				state.aborted = wasRunning;
				state.abort?.abort();
				// Only an interrupted run stays on screen as "paused" (with its partial
				// text kept); a finished summary just leaves its text in place.
				if (wasRunning && state.text) {
					app.setTask('summary', {
						state: 'paused',
						label: t('task.paused'),
						done: 1,
						total: 1,
						tab: 'summary'
					});
				}
			},
			generate,
			clearSummary,
			get text() {
				return state.text;
			},
			refresh() {
				renderMeta();
				syncToolbar();
			}
		};
	}

	M.SummaryView = { create };
})();
