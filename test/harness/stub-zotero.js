/* Browser stand-in for the Zotero globals the plugin touches. */
(function () {
	const PREFIX = 'extensions.zotero.moonlit.';
	const DEFAULTS = {
		provider: 'mock',
		model: 'moonlit-demo',
		baseURL: 'mock://',
		apiKey: '',
		temperature: '0.3',
		maxTokens: 4096,
		concurrency: 3,
		stream: true,
		targetLang: 'zh-CN',
		enableTranslate: false,
		enableSummary: false,
		enableHighlight: false,
		granularity: 'sentence',
		dockWidth: 430,
		dockTab: 'summary',
		showOriginalInTranslation: true,
		autoTranslateOnOpen: false,
		autoSummaryOnOpen: false,
		debug: false
	};

	const params = new URLSearchParams(location.search);
	const store = new Map();
	for (const [key, value] of Object.entries(DEFAULTS)) {
		store.set(key, value);
	}
	for (const [key, value] of params.entries()) {
		if (key === 'scenario' || key === 'theme') {
			continue;
		}
		store.set(key, value === 'true' ? true : value === 'false' ? false : value);
	}

	const observers = new Map();

	// --- fake file system (backed by localStorage) so cache.js runs unmodified
	const FS = {
		read() {
			try {
				return JSON.parse(localStorage.getItem('moonlit-fs') || '{}');
			}
			catch (e) {
				return {};
			}
		},
		write(files) {
			localStorage.setItem('moonlit-fs', JSON.stringify(files));
		}
	};

	window.PathUtils = {
		join: (...parts) => parts.filter(Boolean).join('/').replace(/\/+/g, '/')
	};

	window.IOUtils = {
		async readUTF8(path) {
			const files = FS.read();
			if (!(path in files)) {
				throw new Error(`ENOENT ${path}`);
			}
			return files[path];
		},
		async writeUTF8(path, data) {
			const files = FS.read();
			files[path] = String(data);
			FS.write(files);
		},
		async exists(path) {
			return path in FS.read();
		},
		async remove(path) {
			const files = FS.read();
			delete files[path];
			FS.write(files);
		},
		async makeDirectory() {},
		async getChildren(dir) {
			const files = FS.read();
			return Object.keys(files).filter(path => path.startsWith(`${dir}/`));
		}
	};

	// --- annotations store
	const annotations = [];
	let nextAnnotationID = 100;

	class FakeItem {
		constructor(type) {
			this.itemType = type;
			this.tags = [];
			this.id = nextAnnotationID++;
		}

		addTag(tag) {
			this.tags.push({ tag });
		}

		getTags() {
			return this.tags;
		}

		isAnnotation() {
			return this.itemType === 'annotation';
		}

		isPDFAttachment() {
			return this.itemType === 'attachment';
		}

		isRegularItem() {
			return this.itemType === 'attachment';
		}

		addRelatedItem() {}

		setNote(html) {
			this.note = html;
		}

		getNote() {
			return this.note || '';
		}

		getField(field) {
			if (field === 'title') {
				return 'Deterministic Image-to-Image Translation';
			}
			return '';
		}

		async saveTx() {
			if (this.itemType === 'note') {
				Zotero.__notes.push(this);
				this.saved = true;
				return this.id;
			}
			annotations.push(this);
		}

		async erase() {
			const index = annotations.indexOf(this);
			if (index !== -1) {
				annotations.splice(index, 1);
			}
		}

		getAnnotations() {
			return annotations.filter(a => a.parentID === this.id).map(a => a.id);
		}
	}

	const attachment = new FakeItem('attachment');
	attachment.id = 1;
	attachment.key = 'HARNESS0000';
	attachment.libraryID = 1;

	window.Zotero = {
		locale: params.get('locale') || 'zh-CN',
		DataDirectory: { dir: '/zotero-data' },
		debug: (...args) => console.log('[zotero]', ...args),
		logError: (e) => console.error('[zotero error]', e),
		Prefs: {
			get(key) {
				const short = key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key;
				return store.get(short);
			},
			set(key, value) {
				const short = key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key;
				store.set(short, value);
				observers.get(short)?.forEach(callback => callback(value));
			},
			clear(key) {
				const short = key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key;
				store.delete(short);
			},
			registerObserver(name, callback) {
				const short = name.startsWith(PREFIX) ? name.slice(PREFIX.length) : name;
				if (!observers.has(short)) {
					observers.set(short, []);
				}
				observers.get(short).push(callback);
				return Symbol(short);
			},
			unregisterObserver() {}
		},
		Utilities: {
			Internal: {
				copyTextToClipboard: (text) => {
					window.__copied = text;
				},
				openPreferences: (pane) => {
					window.__openedPreferences = pane;
				}
			}
		},
		Items: {
			get(id) {
				if (Array.isArray(id)) {
					return id.map(itemID => this.get(itemID));
				}
				if (id === attachment.id) {
					return attachment;
				}
				return annotations.find(a => a.id === id) || null;
			},
			async getAsync(id) {
				return this.get(id);
			}
		},
		Item: FakeItem,
		__notes: [],
		DB: {
			executeTransaction: async (fn) => fn(),
			async columnQueryAsync(sql, params = []) {
				if (/FROM itemAnnotations WHERE parentItemID/.test(sql)) {
					const [parentID] = params;
					return annotations.filter(a => a.parentID === parentID).map(a => a.id);
				}
				return [];
			}
		},
		Reader: { _readers: [], registerEventListener() {}, unregisterEventListener() {} },
		__store: store,
		__annotations: annotations
	};

	globalThis.__moonlitParams = params;
})();
