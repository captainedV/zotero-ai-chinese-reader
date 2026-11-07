/**
 * AI key-point view: asks the model for the most important passages, maps the
 * quotes back to PDF geometry, then creates real Zotero highlight annotations.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});
	const t = (key, vars) => M.I18n.t(key, vars);

	const MAX_ITEMS = 14;

	function create(app) {
		const doc = app.doc;
		const state = {
			enabled: false,
			running: false,
			abort: null,
			points: [],
			record: null,
			activeId: null
		};

		const root = M.Dom.h(doc, 'div', { class: 'ml-view ml-view-highlight' });
		const toolbar = M.Dom.h(doc, 'div', { class: 'ml-toolrow' });
		const statusLabel = M.Dom.h(doc, 'div', { class: 'ml-mutelabel', text: '' });
		const list = M.Dom.h(doc, 'div', { style: { display: 'flex', 'flex-direction': 'column', gap: '7px' } });
		const empty = M.Dom.h(doc, 'div', { class: 'ml-empty' }, [
			M.Dom.h(doc, 'div', { class: 'ml-empty-icon', html: M.Icons.get('highlight') }),
			M.Dom.h(doc, 'div', { class: 'ml-empty-title', text: t('highlight.empty.title') }),
			M.Dom.h(doc, 'div', { class: 'ml-empty-desc', text: t('highlight.empty.desc') }),
			M.Dom.h(doc, 'div', { class: 'ml-empty-hint', text: t('empty.useSwitch') })
		]);

		let btnClear;

		function buildToolbar() {
			btnClear = M.Dom.iconButton(doc, 'trash', t('highlight.clear'), async () => {
				const removed = await M.Annotations.removeOurs(app.reader);
				state.points = [];
				render();
				app.toast(t('highlight.cleared', { n: removed }), 'success');
			});
			toolbar.append(statusLabel, M.Dom.h(doc, 'div', { class: 'ml-grow' }), btnClear);
			syncToolbar();
		}

		function syncToolbar() {
			btnClear.style.display = state.points.length ? 'inline-flex' : 'none';
			empty.style.display = state.points.length ? 'none' : 'flex';
		}

		function render() {
			M.Dom.clear(list);
			for (const point of state.points) {
				const typeMeta = M.Prompts.HIGHLIGHT_TYPES[point.type] || M.Prompts.HIGHLIGHT_TYPES.claim;
				const el = M.Dom.h(doc, 'button', {
					class: 'ml-point',
					attrs: { type: 'button' },
					dataset: { pointId: point.id },
					on: {
						click: () => jump(point),
						mouseenter: () => {
							app.overlay.show({
								pageIndex: point.pageIndex,
								rects: point.rects,
								key: `point:${point.id}`
							});
							el.classList.add('ml-active');
						},
						mouseleave: () => {
							app.overlay.clear();
							el.classList.remove('ml-active');
						}
					}
				}, [
					M.Dom.h(doc, 'span', {
						class: 'ml-swatch',
						style: { background: point.color || typeMeta.color }
					}),
					M.Dom.h(doc, 'span', { class: 'ml-point-quote', text: `“${M.Util.truncate(point.quote, 240)}”` }),
					point.note ? M.Dom.h(doc, 'span', { class: 'ml-point-note', text: point.note }) : null,
					M.Dom.h(doc, 'span', { class: 'ml-point-foot' }, [
						M.Dom.h(doc, 'span', {
							class: 'ml-badge',
							text: t(`type.${point.type}`) === `type.${point.type}` ? typeMeta.label : t(`type.${point.type}`)
						}),
						M.Dom.h(doc, 'span', { text: t('translate.page', { page: point.pageIndex + 1 }) }),
						point.saved === false
							? M.Dom.h(doc, 'span', { text: '· 未定位' })
							: null
					])
				]);
				list.appendChild(el);
			}
			syncToolbar();
		}

		function jump(point) {
			M.PdfDoc.scrollToParagraph(app.reader, {
				pageIndex: point.pageIndex,
				rect: [
					Math.min(...point.rects.map(r => r[0])),
					Math.min(...point.rects.map(r => r[1])),
					Math.max(...point.rects.map(r => r[2])),
					Math.max(...point.rects.map(r => r[3]))
				]
			});
		}

		async function run() {
			if (state.running) {
				return true;
			}
			if (!M.AI.isConfigured()) {
				app.toast(t('toast.noKey'), 'error');
				app.openSettings();
				return false;
			}
			state.running = true;
			state.aborted = false;
			let started = false;
			syncToolbar();
			statusLabel.textContent = t('highlight.running');
			app.setError?.(null);
			app.setTask('highlight', {
				state: 'running',
				label: t('progress.highlight'),
				done: 0,
				total: 0,
				tab: 'highlight'
			});
			try {
				await app.ensureDocument();
				if (!app.document) {
					throw new Error(t('toast.noText'));
				}
				state.abort = new M.Util.AbortController();
				const request = M.Prompts.buildHighlightPrompt({
					text: M.PdfDoc.textForHighlight(app.document, 60000),
					meta: M.PdfDoc.metaSummary(app.document),
					targetLang: M.Prompts.targetLanguage(),
					maxItems: MAX_ITEMS
				});
				const raw = await M.AI.complete({
					kind: 'highlight',
					system: request.system,
					prompt: request.prompt,
					json: true,
					signal: state.abort.signal
				});
				const parsed = M.AI.parseJson(raw);
				const items = Array.isArray(parsed) ? parsed : (parsed?.items || []);
				const resolved = [];
				let index = 0;
				for (const item of items) {
					const quote = String(item.quote || '').trim();
					if (!quote) {
						continue;
					}
					const hit = M.Quotes.findQuote(app.document, quote);
					const type = M.Prompts.HIGHLIGHT_TYPES[item.type] ? item.type : 'claim';
					resolved.push({
						id: `pt${index++}`,
						quote,
						note: String(item.note || '').trim(),
						type,
						color: item.color || M.Prompts.HIGHLIGHT_TYPES[type].color,
						pageIndex: hit ? hit.pageIndex : (item.pageIndex ?? 0),
						rects: hit ? hit.rects : [],
						saved: false
					});
				}
				const locatable = resolved.filter(point => point.rects.length);
				M.Log.debug('key points resolved', { total: resolved.length, locatable: locatable.length });
				if (!locatable.length) {
					app.toast(t('highlight.none'), 'error');
					state.points = resolved;
					render();
					return;
				}
				const result = await M.Annotations.createHighlights(app.reader, locatable);
				locatable.forEach(point => {
					point.saved = true;
				});
				state.points = resolved;
				state.record = await M.Cache.load(app.document.attachmentKey);
				state.record.highlights = resolved.map(point => ({
					quote: point.quote,
					note: point.note,
					type: point.type,
					color: point.color,
					pageIndex: point.pageIndex
				}));
				M.Cache.save(app.document.attachmentKey, state.record);
				render();
				statusLabel.textContent = '';
				app.toast(t('highlight.done', { n: result.created }), 'success');
				started = true;
			}
			catch (e) {
				M.Log.error('highlight failed', e);
				statusLabel.textContent = '';
				if (e.code !== 'aborted') {
					app.setError?.(e.message, { endpoint: e.endpoint, hint: t('error.hint') });
				}
			}
			finally {
				state.running = false;
				// Keep the row: "done" with the number of key points, or "paused" when
				// the switch was turned off mid-run.
				app.setTask('highlight', {
					state: state.aborted ? 'paused' : (state.points.length ? 'done' : 'idle'),
					label: state.aborted ? t('task.paused') : t('task.done'),
					done: state.points.length ? 1 : 0,
					total: 1,
					tab: 'highlight'
				});
				syncToolbar();
				app.syncFeatureUi?.();
			}
			return started;
		}

		buildToolbar();
		root.append(toolbar, empty, list);

		return {
			el: root,
			async activate() {
				state.enabled = true;
				if (!state.points.length) {
					try {
						const record = await M.Cache.load(app.document?.attachmentKey
							|| `${app.reader.itemID}`);
						if (record?.highlights?.length) {
							state.points = record.highlights.map((point, index) => {
								const hit = app.document
									? M.Quotes.findQuote(app.document, point.quote)
									: null;
								return {
									...point,
									id: `pt${index}`,
									rects: hit?.rects || [],
									pageIndex: hit?.pageIndex ?? point.pageIndex ?? 0,
									saved: true
								};
							}).filter(point => point.rects.length);
						}
					}
					catch (e) {
						M.Log.debug('highlight activate failed', e);
					}
				}
				render();
			},
			deactivate() {
				const wasRunning = !!state.running;
				state.enabled = false;
				state.aborted = wasRunning;
				state.abort?.abort();
				if (wasRunning && state.points.length) {
					app.setTask('highlight', {
						state: 'paused',
						label: t('task.paused'),
						done: state.points.length,
						total: 0,
						tab: 'highlight'
					});
				}
			},
			/** Current key points, used by the note exporter. */
			get points() {
				return state.points;
			},
			run
		};
	}

	M.HighlightView = { create };
})();
