/**
 * The right-hand dock: brand bar, tab switcher, view host and resize handle.
 *
 * The dock is injected into the reader document and makes room for itself by
 * insetting the reader's split view, so the PDF page and the translation column
 * sit side by side instead of overlapping.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});
	const t = (key, vars) => M.I18n.t(key, vars);

	const TABS = [
		{ id: 'summary', icon: 'summary', label: 'tab.summary' },
		{ id: 'translate', icon: 'translate', label: 'tab.translate' },
		{ id: 'highlight', icon: 'highlight', label: 'tab.highlight' }
	];

	const MIN_WIDTH = 320;
	const MAX_WIDTH = 760;
	const DEFAULT_WIDTH = 430;

	function create(app, views) {
		const doc = app.doc;
		const state = {
			open: false,
			tab: M.Prefs.getString('dockTab', 'summary') || 'summary',
			width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, M.Prefs.getInt('dockWidth', 430) || 430)),
			closing: false,
			progress: null,
			error: null,
			tasks: new Map()
		};
		if (!TABS.some(tab => tab.id === state.tab)) {
			state.tab = 'summary';
		}

		const el = M.Dom.h(doc, 'aside', {
			class: 'ml-dock',
			attrs: { 'aria-label': t('brand') },
			style: { '--ml-dock-width': `${state.width}px` }
		});

		const resizer = M.Dom.h(doc, 'div', {
			class: 'ml-dock-resizer',
			attrs: {
				title: t('dock.resize'),
				role: 'separator',
				'aria-orientation': 'vertical',
				'aria-label': t('dock.resize'),
				tabindex: '0',
				'aria-valuemin': String(MIN_WIDTH),
				'aria-valuemax': String(MAX_WIDTH)
			}
		});

		const header = M.Dom.h(doc, 'div', { class: 'ml-dock-head' });
		const brandbar = M.Dom.h(doc, 'div', { class: 'ml-brandbar' }, [
			M.Dom.h(doc, 'div', { class: 'ml-logo', html: M.Icons.get('moon') }),
			M.Dom.h(doc, 'div', { class: 'ml-title' }, [
				doc.createTextNode(t('brand')),
				M.Dom.h(doc, 'span', { class: 'ml-chip', text: 'AI' })
			]),
			M.Dom.h(doc, 'div', { class: 'ml-spacer' }),
			M.Dom.iconButton(doc, 'settings', t('action.settings'), () => app.openSettings()),
			M.Dom.iconButton(doc, 'close', t('dock.close'), () => close())
		]);

		const tabbar = M.Dom.h(doc, 'div', { class: 'ml-tabs', attrs: { role: 'tablist' } });
		const tabButtons = new Map();
		for (const tab of TABS) {
			const button = M.Dom.h(doc, 'button', {
				class: `ml-tab${tab.id === state.tab ? ' ml-active' : ''}`,
				attrs: { type: 'button', role: 'tab', 'aria-selected': tab.id === state.tab ? 'true' : 'false' },
				dataset: { tab: tab.id },
				on: {
					click: (event) => {
						event.preventDefault();
						setTab(tab.id);
					}
				}
			}, [
				M.Dom.h(doc, 'span', { html: M.Icons.get(tab.icon), style: { display: 'inline-flex' } }),
				doc.createTextNode(t(tab.label))
			]);
			tabButtons.set(tab.id, button);
			tabbar.appendChild(button);
		}

		// ------------------------------------------------------------- progress
		// One sticky banner for every AI job on this paper, so the user always
		// sees that something is running (and how far along it is).
		const progressLabel = M.Dom.h(doc, 'div', { class: 'ml-taskbar-label', text: '' });
		const progressCount = M.Dom.h(doc, 'div', { class: 'ml-taskbar-count', text: '' });
		const progressFill = M.Dom.h(doc, 'div', { class: 'ml-taskbar-fill' });
		const progressTrack = M.Dom.h(doc, 'div', { class: 'ml-taskbar-track' }, [progressFill]);
		const errorDetail = M.Dom.h(doc, 'div', { class: 'ml-taskbar-detail', text: '' });
		const errorClose = M.Dom.h(doc, 'button', {
			class: 'ml-taskbar-close',
			text: '×',
			title: t('common.close'),
			attrs: { 'aria-label': t('common.close') }
		});
		errorClose.hidden = true;
		errorClose.addEventListener('click', () => renderError(null));
		const progressText = M.Dom.h(doc, 'div', { class: 'ml-taskbar-text' }, [progressLabel, progressCount]);
		/** Container for one row per AI feature that is running or paused. */
		const taskList = M.Dom.h(doc, 'div', { class: 'ml-tasklist' });
		const progress = M.Dom.h(doc, 'div', {
			class: 'ml-taskbar',
			attrs: { role: 'status', 'aria-live': 'polite' }
		}, [
			M.Dom.h(doc, 'div', { class: 'ml-taskbar-row' }, [
				M.Dom.h(doc, 'div', { class: 'ml-taskbar-spinner' }),
				progressText,
				errorClose
			]),
			progressTrack,
			taskList,
			errorDetail
		]);

		// ---------------------------------------------------------------- usage
		// Persistent token meter for the paper currently open.
		const usageValue = M.Dom.h(doc, 'span', { class: 'ml-usage-value', text: '' });
		const usageDetail = M.Dom.h(doc, 'span', { class: 'ml-usage-detail', text: '' });
		const usageBar = M.Dom.h(doc, 'div', { class: 'ml-usage-in', title: t('usage.title') }, [
			usageValue,
			usageDetail
		]);
		const usage = M.Dom.h(doc, 'div', {
			class: 'ml-usage',
			attrs: { title: t('usage.title') }
		}, [
			M.Dom.h(doc, 'span', { class: 'ml-usage-icon', html: M.Icons.get('sparkle') }),
			usageBar
		]);

		header.append(brandbar, tabbar);
		const body = M.Dom.h(doc, 'div', { class: 'ml-dock-body' });
		el.append(resizer, header, progress, body, usage);

		for (const tab of TABS) {
			const view = views[tab.id];
			if (view) {
				body.appendChild(view.el);
			}
		}

		// ------------------------------------------------------------ behaviour
		function applyWidth(width, { persist = false, live = false } = {}) {
			const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(Number(width) || state.width)));
			state.width = next;
			el.style.setProperty('--ml-dock-width', `${next}px`);
			doc.body.style.setProperty('--ml-dock-width', `${next}px`);
			el.dataset.width = String(next);
			resizer.setAttribute('aria-valuenow', String(next));
			if (live) {
				// let the PDF re-fit after the drag settles, not on every move
				refit();
			}
			if (persist) {
				M.Prefs.set('dockWidth', next);
			}
		}

		const refit = M.Util.debounce(() => {
			M.PdfDoc.refit(app.reader);
			// The page geometry just changed; repaint whatever highlight is active.
			setTimeout(() => app.overlay?.refresh?.(), 220);
		}, 180);

		function setTab(tabId, { silent = false } = {}) {
			if (!TABS.some(tab => tab.id === tabId)) {
				return;
			}
			state.tab = tabId;
			for (const [id, button] of tabButtons) {
				const isActive = id === tabId;
				button.classList.toggle('ml-active', isActive);
				button.setAttribute('aria-selected', isActive ? 'true' : 'false');
			}
			for (const tab of TABS) {
				const view = views[tab.id];
				if (!view) {
					continue;
				}
				view.el.classList.toggle('ml-active', tab.id === tabId);
			}
			const view = views[tabId];
			if (view && state.open) {
				Promise.resolve(view.activate?.()).catch(e => M.Log.error('view activate failed', e));
			}
			const others = TABS.filter(tab => tab.id !== tabId);
			for (const tab of others) {
				views[tab.id]?.deactivate?.();
			}
			if (!silent) {
				M.Prefs.set('dockTab', tabId);
			}
			body.scrollTop = state.scrollMemory?.[tabId] || 0;
		}

		function rememberScroll() {
			state.scrollMemory = state.scrollMemory || {};
			state.scrollMemory[state.tab] = body.scrollTop;
		}

		function open(tabId) {
			if (state.closing) {
				return;
			}
			const wasOpen = state.open;
			state.open = true;
			if (!wasOpen) {
				doc.body.classList.add('ml-dock-open');
				doc.body.appendChild(el);

		applyWidth(state.width);
				refit();
			}
			if (tabId) {
				setTab(tabId);
			}
			else if (!wasOpen) {
				setTab(state.tab);
			}
			app.onDockStateChange?.(true);
		}

		function close() {
			if (!state.open) {
				return;
			}
			rememberScroll();
			state.open = false;
			state.closing = true;
			for (const tab of TABS) {
				views[tab.id]?.deactivate?.();
			}
			doc.body.classList.remove('ml-dock-open');
			el.classList.add('ml-closing');
			refit();
			app.onDockStateChange?.(false);
			setTimeout(() => {
				el.classList.remove('ml-closing');
				el.remove();
				state.closing = false;
			}, 160);
		}

		function toggle(tabId) {
			if (state.open) {
				close();
			}
			else {
				open(tabId);
			}
		}

		/**
		 * Bring a card into view.
		 *
		 * Hovering the PDF walks across cards quickly; starting a fresh smooth scroll
		 * per event makes the column stutter. Calls are coalesced so only the newest
		 * target is animated, and the card is parked at a stable height (a third of
		 * the way down) instead of wherever it happened to land.
		 */
		let pendingScroll = null;
		const flushScrollToCard = M.Util.throttle(() => {
			const job = pendingScroll;
			pendingScroll = null;
			if (!job || !state.open) {
				return;
			}
			const { card, smooth } = job;
			const bodyRect = body.getBoundingClientRect();
			const cardRect = card.getBoundingClientRect();
			const inView = cardRect.top >= bodyRect.top + 6 && cardRect.bottom <= bodyRect.bottom - 6;
			if (inView) {
				return;
			}
			const fromTop = cardRect.top - bodyRect.top;
			const anchor = bodyRect.height * 0.3;
			const delta = fromTop - anchor;
			if (Math.abs(delta) < 3) {
				return;
			}
			body.scrollTo({
				top: Math.max(0, body.scrollTop + delta),
				behavior: smooth ? 'smooth' : 'auto'
			});
		}, 90);

		function scrollToCard(card, { smooth = true } = {}) {
			if (!card || !state.open) {
				return;
			}
			pendingScroll = { card, smooth };
			flushScrollToCard();
		}

		// ------------------------------------------------------------ resizing
		//
		// The PDF viewer lives in a nested frame, so as soon as the pointer crosses
		// into the page area the reader document stops receiving pointermove and a
		// plain document-level drag freezes. Pointer capture keeps the events
		// retargeted to the handle; the window listeners are a safety net for
		// browsers that refuse capture on an untrusted event.
		let drag = null;

		function onDragMove(event) {
			if (!drag) {
				return;
			}
			if (event.pointerId != null && drag.pointerId != null && event.pointerId !== drag.pointerId) {
				return;
			}
			const delta = drag.startX - event.clientX;
			applyWidth(drag.startWidth + delta, { live: true });
			event.preventDefault?.();
		}

		function endDrag() {
			if (!drag) {
				return;
			}
			const { pointerId } = drag;
			drag = null;
			resizer.classList.remove('ml-dragging');
			doc.body.classList.remove('ml-resizing');
			try {
				if (pointerId != null && resizer.hasPointerCapture?.(pointerId)) {
					resizer.releasePointerCapture(pointerId);
				}
			}
			catch (e) {
				// ignore
			}
			resizer.removeEventListener('pointermove', onDragMove);
			resizer.removeEventListener('pointerup', endDrag);
			resizer.removeEventListener('pointercancel', endDrag);
			const win = doc.defaultView;
			win?.removeEventListener?.('pointermove', onDragMove, true);
			win?.removeEventListener?.('pointerup', endDrag, true);
			win?.removeEventListener?.('pointercancel', endDrag, true);
			M.Prefs.set('dockWidth', state.width);
			refit();
		}

		resizer.addEventListener('pointerdown', (event) => {
			if (event.button !== 0 && event.pointerType === 'mouse') {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			drag = {
				startX: event.clientX,
				startWidth: state.width,
				pointerId: event.pointerId ?? null
			};
			resizer.classList.add('ml-dragging');
			doc.body.classList.add('ml-resizing');
			// Capture may be unavailable (untrusted event, old Gecko): never let it
			// abort the drag setup.
			try {
				resizer.setPointerCapture?.(event.pointerId);
			}
			catch (e) {
				// ignore - the window listeners below still drive the drag
			}
			resizer.addEventListener('pointermove', onDragMove);
			resizer.addEventListener('pointerup', endDrag);
			resizer.addEventListener('pointercancel', endDrag);
			const win = doc.defaultView;
			win?.addEventListener?.('pointermove', onDragMove, true);
			win?.addEventListener?.('pointerup', endDrag, true);
			win?.addEventListener?.('pointercancel', endDrag, true);
		});

		resizer.addEventListener('dblclick', (event) => {
			event.preventDefault();
			applyWidth(DEFAULT_WIDTH, { persist: true });
			refit();
		});

		resizer.addEventListener('keydown', (event) => {
			const step = event.shiftKey ? 48 : 16;
			if (event.key === 'ArrowLeft') {
				applyWidth(state.width + step, { persist: true });
			}
			else if (event.key === 'ArrowRight') {
				applyWidth(state.width - step, { persist: true });
			}
			else if (event.key === 'Home') {
				applyWidth(DEFAULT_WIDTH, { persist: true });
			}
			else {
				return;
			}
			event.preventDefault();
			refit();
		});


		body.addEventListener('scroll', () => {
			app.onDockScroll?.();
		}, { passive: true });

		/**
		 * Show a failure in the same sticky banner the progress uses. A toast
		 * disappears in seconds, which is why "nothing happened" was the report:
		 * the reason has to stay on screen until the user dismisses it.
		 */
		function renderError(next) {
			if (next !== undefined) {
				state.error = next;
			}
			const current = state.error || null;
			if (!current) {
				progress.classList.remove('ml-error');
				errorDetail.textContent = '';
				errorDetail.hidden = true;
				errorClose.hidden = true;
				renderTasks();
				return;
			}
			progress.classList.add('ml-on', 'ml-error');
			progress.classList.remove('ml-indeterminate');
			progressFill.style.width = '100%';
			progressLabel.textContent = current.title || t('toast.errorTitle');
			progressCount.textContent = '';
			const parts = [current.message, current.hint].filter(Boolean);
			errorDetail.textContent = parts.join('\n');
			errorDetail.hidden = !parts.length;
			errorClose.hidden = false;
		}

		/**
		 * Compatibility shim: single-job callers still work, they just become one
		 * more task row. Everything real goes through `setTask`.
		 */
		function setProgress(next) {
			if (next === undefined) {
				return;
			}
			if (next === null) {
				setTask('current', null);
				return;
			}
			setTask(next.id || 'current', {
				state: next.state || 'running',
				label: next.label,
				done: next.done,
				total: next.total,
				tab: next.tab || state.tab
			});
		}

		function renderProgress(next) {
			if (next !== undefined) {
				state.progress = next;
			}
			if (state.error) {
				// A failure owns the banner until dismissed or the next run starts.
				return;
			}
			const current = state.progress || null;
			if (!current) {
				progress.classList.remove('ml-on');
				progressFill.style.width = '0%';
				return;
			}
			const total = Number(current.total) || 0;
			const done = Number(current.done) || 0;
			errorClose.hidden = true;
			errorDetail.hidden = true;
			progress.classList.add('ml-on');
			progress.classList.toggle('ml-indeterminate', !total);
			progressLabel.textContent = current.label || t('progress.working');
			progressCount.textContent = total ? `${Math.min(done, total)}/${total}` : '';
			const percent = total ? Math.max(4, Math.min(100, Math.round((done / total) * 100))) : 100;
			progressFill.style.width = `${percent}%`;
		}

		/**
		 * Per-feature progress.
		 *
		 * The three features run independently and can be on at the same time, so a
		 * single global percentage was misleading: the bar showed whichever view
		 * reported last and stayed in "waiting" after a feature was switched off.
		 * Every feature now owns a task record — label, done/total, state — and the
		 * bar renders all of them, keeping a paused feature's numbers on screen.
		 */
		function shortLabel(task) {
			if (task.label) {
				return task.label;
			}
			const names = { translate: 'translate', summary: 'summary', highlight: 'highlight', extract: 'extract' };
			return t(`progress.${names[task.id] || task.id}`);
		}

		function renderTasks() {
			if (!taskList) {
				return;
			}
			const tasks = [...state.tasks.values()].filter(task => task.state !== 'idle');
			if (!tasks.length) {
				taskList.hidden = true;
				progress.classList.remove('ml-on');
				progress.classList.remove('ml-indeterminate');
				progressFill.style.width = '0%';
				progressLabel.textContent = '';
				progressCount.textContent = '';
				return;
			}
			if (state.error) {
				// The failure owns the banner until it is dismissed.
				return;
			}
			taskList.hidden = tasks.length <= 1;
			const running = tasks.filter(task => task.state === 'running');
			const shown = running.length ? running : tasks;
			progress.classList.add('ml-on');
			progress.classList.toggle('ml-error', false);
			const total = shown.reduce((sum, task) => sum + (Number(task.total) || 0), 0);
			const done = shown.reduce((sum, task) => sum + (Number(task.done) || 0), 0);
			const anyIndeterminate = shown.some(task => !Number(task.total));
			progress.classList.toggle('ml-indeterminate', anyIndeterminate && !done);
			progressLabel.textContent = shown.length === 1
				? shortLabel(shown[0])
				: t('progress.working');
			progressCount.textContent = total ? `${Math.min(done, total)}/${total}` : '';
			const percent = total ? Math.max(4, Math.min(100, Math.round((done / total) * 100))) : 100;
			progressFill.style.width = `${percent}%`;

			M.Dom.clear(taskList);
			for (const task of tasks) {
				const rowTotal = Number(task.total) || 0;
				const rowDone = Number(task.done) || 0;
				const ratio = rowTotal ? Math.max(0, Math.min(1, rowDone / rowTotal)) : 0;
				const fill = M.Dom.h(doc, 'div', {
					class: 'ml-tasklist-fill',
					style: { width: `${rowTotal ? Math.max(4, Math.round(ratio * 100)) : 100}%` }
				});
				const stateText = task.state === 'paused'
					? t('task.paused')
					: task.state === 'done'
						? t('task.done')
						: task.state === 'error'
							? t('task.error')
							: null;
				const row = M.Dom.h(doc, 'div', {
					class: `ml-tasklist-row ml-tasklist-${task.state}`,
					attrs: { 'data-task': task.id }
				}, [
					M.Dom.h(doc, 'div', { class: 'ml-tasklist-label', text: shortLabel(task) }),
					M.Dom.h(doc, 'div', { class: 'ml-tasklist-track' }, [fill]),
					M.Dom.h(doc, 'div', {
						class: 'ml-tasklist-count',
						text: rowTotal ? `${rowDone}/${rowTotal}` : (stateText || t('task.working'))
					})
				]);
				row.addEventListener('click', () => {
					const tab = tasks.find(item => item.id === task.id)?.tab || task.id;
					if (['translate', 'summary', 'highlight'].includes(tab)) {
						open(tab);
					}
				});
				taskList.appendChild(row);
			}
		}

		/**
		 * Merge one feature's progress. `null` clears it; `state: 'idle'` removes it.
		 * @param {string} id translate|summary|highlight|extract
		 * @param {Object|null} patch
		 */
		function setTask(id, patch) {
			if (!id) {
				return;
			}
			if (patch === null) {
				state.tasks.delete(id);
				renderTasks();
				return;
			}
			const previous = state.tasks.get(id) || { id, done: 0, total: 0, state: 'idle' };
			const next = { ...previous, ...patch, id };
			if (previous.doneTimer) {
				clearTimeout(previous.doneTimer);
			}
			if (next.state === 'idle' || next.state === 'error') {
				state.tasks.delete(id);
			}
			else {
				if (next.state === 'done') {
					// Show "已完成" briefly, then get out of the way: a bar that stays on
					// screen forever is what made the old one look stuck.
					next.doneTimer = setTimeout(() => {
						const current = state.tasks.get(id);
						if (current && current.state === 'done') {
							state.tasks.delete(id);
							renderTasks();
						}
					}, 900);
				}
				state.tasks.set(id, next);
			}
			renderTasks();
		}

		function renderUsage(next) {
			const info = next || M.Usage?.summary?.() || null;
			if (!info || !info.calls) {
				usage.classList.remove('ml-on');
				return;
			}
			usage.classList.add('ml-on');
			usageValue.textContent = t('usage.bar', {
				in: M.Usage.formatTokens(info.prompt),
				out: M.Usage.formatTokens(info.completion)
			});
			usageDetail.textContent = info.estimated ? t('usage.estimated') : '';
			usage.dataset.total = String(info.total);
			usage.dataset.calls = String(info.calls);
		}

		const unsubscribeUsage = M.Usage ? M.Usage.onChange(() => renderUsage()) : () => {};
		renderUsage();

		app.onDockUsage = () => renderUsage();

		applyWidth(state.width);

		return {
			el,
			open,
			close,
			toggle,
			setTab,
			setTask,
			renderTasks,
			clearTasks: () => {
				state.tasks.clear();
				renderTasks();
			},
			getTask: id => state.tasks.get(id) || null,
			listTasks: () => [...state.tasks.values()].map(task => ({ id: task.id, state: task.state, done: task.done, total: task.total })),
			setProgress: (next) => {
				if (next) {
					state.error = null;
					progress.classList.remove('ml-error');
					errorDetail.textContent = '';
					errorDetail.hidden = true;
					errorClose.hidden = true;
				}
				setProgress(next);
			},
			setError: renderError,
			renderUsage,
			scrollToCard,
			get isOpen() {
				return state.open;
			},
			get tab() {
				return state.tab;
			},
			get width() {
				return state.width;
			},
			/** The scrolling host for the view content (used for sync math). */
			get scrollHost() {
				return body;
			},
			refreshWidth() {
				// Re-read the pref: the width can change elsewhere (pref pane,
				// another reader window), and re-applying stale state ignored it.
				applyWidth(M.Prefs.getInt('dockWidth', DEFAULT_WIDTH) || DEFAULT_WIDTH);
			},
			destroy() {
				unsubscribeUsage();
				el.remove();
				doc.body.classList.remove('ml-dock-open');
				doc.body.style.removeProperty('--ml-dock-width');
			}
		};
	}

	M.Dock = { create, TABS };
})();
