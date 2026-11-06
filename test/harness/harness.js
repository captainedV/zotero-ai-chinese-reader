/* Browser harness: fakes the Zotero PDF reader around the plugin UI. */
(function () {
	const M = window.Moonlit;
	const fixture = window.MOONLIT_FIXTURE;
	const params = globalThis.__moonlitParams;
	const SCALE = Number(params.get('scale') || 1.15);
	const pageViews = [];

	if (params.get('theme') === 'dark') {
		document.body.dataset.theme = 'dark';
		document.documentElement.dataset.colorScheme = 'dark';
	}

	M.I18n.init(window.Zotero.locale);
	M.Log.init();

	// ---------------------------------------------------------------- render
	const viewer = document.getElementById('viewer');

	function renderPage(pageData, index) {
		const view = pageData.view || [0, 0, 612, 792];
		const width = (view[2] - view[0]) * SCALE;
		const height = (view[3] - view[1]) * SCALE;
		const pageEl = document.createElement('div');
		pageEl.className = 'page';
		pageEl.dataset.pageNumber = String(index + 1);
		pageEl.style.width = `${width}px`;
		pageEl.style.height = `${height}px`;

		const wrapper = document.createElement('div');
		wrapper.className = 'canvasWrapper';
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(width);
		canvas.height = Math.round(height);
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		wrapper.appendChild(canvas);
		pageEl.appendChild(wrapper);

		for (const paragraph of pageData.paragraphs || []) {
			for (const line of paragraph.lines || []) {
				const [x0, y0, x1, y1] = line.rect;
				const top = (view[3] - y1) * SCALE;
				const height_ = (y1 - y0) * SCALE;
				const el = document.createElement('div');
				el.className = 'ml-paper-line';
				el.textContent = line.text;
				el.style.left = `${(x0 - view[0]) * SCALE}px`;
				el.style.top = `${top}px`;
				el.style.width = `${(x1 - x0) * SCALE}px`;
				el.style.height = `${height_}px`;
				el.style.fontSize = `${Math.max(6, height_ * 0.86)}px`;
				el.style.overflow = 'hidden';
				pageEl.appendChild(el);
			}
		}
		viewer.appendChild(pageEl);

		pageViews[index] = {
			div: pageEl,
			viewport: M.Layout.makeViewport({ view, rotation: 0, scale: SCALE }),
			pdfPage: { view }
		};
	}

	for (let i = 0; i < fixture.pages.length; i++) {
		renderPage(fixture.pages[i], i);
	}

	// ------------------------------------------------------------- fake viewer
	const fakePdfViewer = {
		pagesRotation: 0,
		currentScaleValue: 'auto',
		_pages: pageViews,
		getPageView: (index) => pageViews[index],
		get pagesCount() {
			return pageViews.length;
		},
		eventBus: {
			on() {},
			off() {}
		}
	};

	window.PDFViewerApplication = {
		pdfDocument: {
			numPages: fixture.numPages,
			getPage: async (number) => ({
				pageNumber: number,
				view: fixture.pages[number - 1]?.view || [0, 0, 612, 792],
				rotate: 0,
				getTextContent: async () => ({ items: [] })
			})
		},
		pdfViewer: fakePdfViewer
	};

	const reader = {
		itemID: 1,
		_type: 'pdf',
		title: fixture.meta.title,
		_internalReader: { _primaryView: { _iframeWindow: window } },
		_iframeWindow: window
	};

	window.__reader = reader;

	// Extraction is pre-computed by make-fixture.mjs, so just clone it.
	const documentModel = JSON.parse(JSON.stringify(fixture));
	M.PdfDoc.extract = async (r, options = {}) => {
		options.onProgress?.({ page: documentModel.numPages, total: documentModel.numPages, textBytes: documentModel.textLength });
		await new Promise(resolve => setTimeout(resolve, 120));
		r._moonlitDoc = documentModel;
		return documentModel;
	};

	// --------------------------------------------------------------- scenario
	window.__ready = (async () => {
		// Snapshot the switch defaults before any scenario flips them, so the
		// "AI key points stay off by default" assertion is meaningful.
		window.__prefsAtBoot = {
			enableTranslate: M.Prefs.getBool('enableTranslate', false),
			enableSummary: M.Prefs.getBool('enableSummary', false),
			enableHighlight: M.Prefs.getBool('enableHighlight', false)
		};
		const app = await M.ReaderUI.attach(reader);
		window.__app = app;
		if (!app) {
			throw new Error('attach failed');
		}
		const scenario = params.get('scenario') || 'idle';

		if (scenario === 'popover') {
			app.togglePopover();
		}
		else if (scenario === 'popover-on') {
			M.Prefs.set('enableTranslate', true);
			M.Prefs.set('enableSummary', true);
			app.togglePopover();
		}
		else if (scenario === 'translate') {
			M.Prefs.set('enableTranslate', true);
			app.dock.open('translate');
			await app.views.translate.ensureLoaded();
			await app.views.translate.start();
			await waitFor(() => document.querySelectorAll('.ml-para .ml-trans').length > 3
				&& Array.from(document.querySelectorAll('.ml-para .ml-trans')).every(el => el.textContent.trim()));
			markSegments();
		}
		else if (scenario === 'translate-hover') {
			M.Prefs.set('enableTranslate', true);
			app.dock.open('translate');
			await app.views.translate.ensureLoaded();
			await app.views.translate.start();
			await waitFor(() => document.querySelectorAll('.ml-para .ml-trans').length > 3);
			const seg = document.querySelectorAll('.ml-para .ml-seg')[4];
			seg?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
			seg?.classList.add('ml-hover');
			await waitFor(() => document.querySelectorAll('.ml-hl-rect').length > 0, 3000);
		}
		else if (scenario === 'summary') {
			M.Prefs.set('enableSummary', true);
			app.dock.open('summary');
			await app.views.summary.activate();
			await app.views.summary.generate();
			await waitFor(() => document.querySelector('.ml-view-summary .ml-summary h2, .ml-view-summary .ml-summary h3'), 20000);
		}
		else if (scenario === 'highlight') {
			M.Prefs.set('enableHighlight', true);
			app.dock.open('highlight');
			await app.views.highlight.activate();
			await app.views.highlight.run();
			await waitFor(() => document.querySelectorAll('.ml-point').length > 0, 20000);
		}
		else if (scenario === 'dock-empty') {
			app.dock.open('summary');
		}
		else if (scenario === 'verify') {
			window.__verify = await window.__runChecks();
		}
		else if (scenario === 'dock-narrow') {
			M.Prefs.set('enableTranslate', true);
			M.Prefs.set('dockWidth', 360);
			app.dock.open('translate');
			await app.views.translate.ensureLoaded();
		}

		// Let fonts/animations settle before the screenshot.
		await new Promise(resolve => setTimeout(resolve, 450));
		document.body.classList.add('ml-ready');
		return true;
	})();

	function markSegments() {
		const segs = document.querySelectorAll('.ml-para .ml-seg');
		segs.forEach((seg, index) => {
			if (index === 3) {
				seg.classList.add('ml-hover');
			}
		});
	}

	async function waitFor(predicate, timeout = 15000, interval = 100) {
		const started = Date.now();
		for (;;) {
			try {
				if (await predicate()) {
					return true;
				}
			}
			catch (e) {
				// keep waiting
			}
			if (Date.now() - started > timeout) {
				return false;
			}
			await new Promise(resolve => setTimeout(resolve, interval));
		}
	}

	window.__waitFor = waitFor;
})();
