/**
 * Cross-highlight overlay between the PDF page and the translation column.
 *
 * Rects live in a per-page overlay layer inside the pdf.js page element, so they
 * scroll and zoom with the page for free. A rAF-throttled pointer listener turns
 * "mouse over the paper" into "which paragraph is under the cursor".
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	const LAYER_CLASS = 'ml-hl-layer';

	function create(reader) {
		const state = {
			reader,
			doc: null,
			layers: new Map(),
			activeKey: null,
			hoverHandler: null,
			lastHover: null,
			scaleListener: null,
			pointerBound: false
		};

		function pdfDoc() {
			const doc = M.PdfDoc.getPdfDocEl(reader);
			if (doc && doc !== state.doc) {
				state.doc = doc;
				M.Styles.injectOverlay(doc);
			}
			return doc;
		}

		function ensureLayer(pageIndex) {
			const mapping = M.PdfDoc.pageMapping(reader, pageIndex);
			if (!mapping) {
				return null;
			}
			const doc = pdfDoc();
			if (!doc) {
				return null;
			}
			const pageEl = mapping.pageEl;
			let layer = pageEl.querySelector(`:scope > .${LAYER_CLASS}`);
			if (!layer) {
				layer = doc.createElement('div');
				layer.className = LAYER_CLASS;
				pageEl.appendChild(layer);
			}
			const offset = mapping.offset;
			layer.style.left = `${offset.left}px`;
			layer.style.top = `${offset.top}px`;
			layer.style.width = `${offset.width}px`;
			layer.style.height = `${offset.height}px`;
			state.layers.set(pageIndex, { layer, mapping });
			return { layer, mapping };
		}

		function clear() {
			for (const { layer } of state.layers.values()) {
				layer.replaceChildren();
			}
			state.layers.clear();
			state.activeKey = null;
		}

		/**
		 * Highlight a set of PDF-space rects on one page.
		 * @param {{pageIndex:number, rects:number[][], key?:string}} target
		 */
		function show(target) {
			if (target?.rects?.length) {
				remember([target], target.key ?? null);
			}
			const key = target.key ?? null;
			if (key !== null && state.activeKey === key) {
				return;
			}
			clear();
			state.activeKey = key;
			if (!target || !target.rects || !target.rects.length) {
				return;
			}
			const entry = ensureLayer(target.pageIndex);
			if (!entry) {
				return;
			}
			const { layer, mapping } = entry;
			for (const rect of target.rects) {
				const box = mapping.toLocalRect(rect);
				if (!Number.isFinite(box.left) || !Number.isFinite(box.top)) {
					continue;
				}
				const el = state.doc.createElement('div');
				el.className = 'ml-hl-rect';
				el.style.left = `${box.left}px`;
				el.style.top = `${box.top}px`;
				el.style.width = `${Math.max(box.width, 1)}px`;
				el.style.height = `${Math.max(box.height, 0.5)}px`;
				layer.appendChild(el);
			}
		}

		/** Highlight several (pageIndex, rects, tone?) groups at once. */
		function showMany(groups, key = null) {
			if (key !== null && state.activeKey === key) {
				return;
			}
			clear();
			state.activeKey = key;
			for (const group of groups) {
				if (!group || !group.rects?.length) {
					continue;
				}
				const entry = ensureLayer(group.pageIndex);
				if (!entry) {
					continue;
				}
				const { layer, mapping } = entry;
				for (const rect of group.rects) {
					const box = mapping.toLocalRect(rect);
					const el = state.doc.createElement('div');
					el.className = group.tone === 'para' ? 'ml-hl-rect ml-hl-para' : 'ml-hl-rect';
					el.style.left = `${box.left}px`;
					el.style.top = `${box.top}px`;
					el.style.width = `${Math.max(box.width, 1)}px`;
					el.style.height = `${Math.max(box.height, 0.5)}px`;
					layer.appendChild(el);
				}
			}
		}

		/** Re-draw the current highlight after zoom changes. */
		function refresh() {
			if (!state.rects) {
				return;
			}
			const rects = state.rects;
			state.activeKey = null;
			showMany(rects.groups, rects.key);
		}

		function remember(groups, key) {
			state.rects = { groups, key };
		}

		function bindPointer(onParagraph) {
			const doc = pdfDoc();
			if (!doc || state.pointerBound) {
				return;
			}
			state.pointerBound = true;
			state.hoverHandler = onParagraph;
			const handle = M.Util.throttleRaf((event) => {
				if (!state.hoverHandler) {
					return;
				}
				// `nearest` resolves points that land between lines or in a word gap,
				// which is most of the paragraph area in a real PDF.
				const hit = M.PdfDoc.paragraphAt(reader, event.clientX, event.clientY, { nearest: true });
				const key = hit ? hit.paragraph.id : null;
				if (key === state.lastHover) {
					return;
				}
				state.lastHover = key;
				state.hoverHandler(hit);
			});
			state.onMove = (event) => {
				if (event.buttons !== 0) {
					return; // don't fight with text selection
				}
				handle(event);
			};
			state.onLeave = () => {
				state.lastHover = null;
				state.hoverHandler?.(null);
			};
			doc.addEventListener('pointermove', state.onMove, true);
			doc.addEventListener('pointerleave', state.onLeave, true);
		}

		function watchScale() {
			try {
				const viewer = M.PdfDoc.getViewer(reader);
				if (!viewer?.app?.eventBus || state.scaleListener) {
					return;
				}
				state.scaleListener = () => {
					// Rects are derived from the page viewport, so just redraw.
					setTimeout(() => refresh(), 30);
				};
				viewer.app.eventBus.on('scalechanging', state.scaleListener);
				viewer.app.eventBus.on('rotationchanging', state.scaleListener);
			}
			catch (e) {
				M.Log.debug('watchScale failed', e);
			}
		}

		function dispose() {
			clear();
			const doc = state.doc || M.PdfDoc.getPdfDocEl(reader);
			if (doc && state.onMove) {
				doc.removeEventListener('pointermove', state.onMove, true);
				doc.removeEventListener('pointerleave', state.onLeave, true);
			}
			try {
				const viewer = M.PdfDoc.getViewer(reader);
				if (state.scaleListener && viewer?.app?.eventBus) {
					viewer.app.eventBus.off('scalechanging', state.scaleListener);
					viewer.app.eventBus.off('rotationchanging', state.scaleListener);
				}
			}
			catch (e) {
				// ignore
			}
			state.hoverHandler = null;
			state.pointerBound = false;
			state.layers.clear();
		}

		watchScale();

		return { show, showMany, clear, remember, refresh, bindPointer, dispose, state };
	}

	M.Overlay = { create };
})();
