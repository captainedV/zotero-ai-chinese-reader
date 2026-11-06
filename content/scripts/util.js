/* global Zotero, PathUtils, IOUtils */

/**
 * Shared helpers: preference access, logging, small async utilities.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});
	const PREFIX = 'extensions.zotero.moonlit.';

	const PROVIDERS = {
		deepseek: {
			label: 'DeepSeek',
			baseURL: 'https://api.deepseek.com/v1',
			model: 'deepseek-chat'
		},
		openai: {
			label: 'OpenAI',
			baseURL: 'https://api.openai.com/v1',
			model: 'gpt-4o-mini'
		},
		moonshot: {
			label: 'Moonshot / Kimi',
			baseURL: 'https://api.moonshot.cn/v1',
			model: 'moonshot-v1-8k'
		},
		zhipu: {
			label: '智谱 GLM',
			baseURL: 'https://open.bigmodel.cn/api/paas/v4',
			model: 'glm-4-flash'
		},
		dashscope: {
			label: '阿里云百炼 / Qwen',
			baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
			model: 'qwen-plus'
		},
		siliconflow: {
			label: 'SiliconFlow',
			baseURL: 'https://api.siliconflow.cn/v1',
			model: 'Qwen/Qwen2.5-7B-Instruct'
		},
		ollama: {
			label: 'Ollama (本地)',
			baseURL: 'http://localhost:11434/v1',
			model: 'qwen2.5:7b'
		},
		custom: {
			label: '自定义 (OpenAI 兼容)',
			baseURL: '',
			model: ''
		},
		mock: {
			label: '演示模式 (无需 API)',
			baseURL: 'mock://',
			model: 'moonlit-demo'
		}
	};

	M.Prefs = {
		get(key, fallback = undefined) {
			try {
				const value = Zotero.Prefs.get(PREFIX + key, true);
				return value === undefined || value === null ? fallback : value;
			}
			catch (e) {
				return fallback;
			}
		},
		getBool(key, fallback = false) {
			const value = this.get(key);
			return value === undefined || value === null ? fallback : !!value;
		},
		getInt(key, fallback = 0) {
			const value = parseInt(this.get(key), 10);
			return Number.isFinite(value) ? value : fallback;
		},
		getFloat(key, fallback = 0) {
			const value = parseFloat(this.get(key));
			return Number.isFinite(value) ? value : fallback;
		},
		getString(key, fallback = '') {
			const value = this.get(key);
			return typeof value === 'string' ? value : (value === undefined || value === null ? fallback : String(value));
		},
		set(key, value) {
			try {
				Zotero.Prefs.set(PREFIX + key, value, true);
			}
			catch (e) {
				Zotero.logError(e);
			}
		},
		clear(key) {
			try {
				Zotero.Prefs.clear(PREFIX + key, true);
			}
			catch (e) {
				Zotero.logError(e);
			}
		},
		/**
		 * Observe one plugin preference.
		 * @returns {Symbol} symbol for `unregisterObserver()`
		 */
		registerObserver(key, handler) {
			return Zotero.Prefs.registerObserver(PREFIX + key, handler, true);
		},
		unregisterObserver(symbol) {
			if (symbol) {
				Zotero.Prefs.unregisterObserver(symbol);
			}
		},
		/** Resolved provider descriptor for the current settings. */
		provider() {
			const id = M.Prefs.getString('provider', 'deepseek') || 'deepseek';
			const base = PROVIDERS[id] || PROVIDERS.custom;
			return {
				id,
				label: base.label,
				baseURL: M.Prefs.getString('baseURL', '') || base.baseURL,
				model: M.Prefs.getString('model', '') || base.model
			};
		},
		providers: PROVIDERS
	};

	/**
	 * The plugin sandbox does not expose `AbortController`, so borrow it from a
	 * privileged window and fall back to a minimal implementation.
	 */
	const AbortControllerImpl = (() => {
		if (typeof AbortController !== 'undefined') {
			return AbortController;
		}
		for (const getWindow of [
			() => Zotero.getMainWindow(),
			() => Services.appShell.hiddenDOMWindow
		]) {
			try {
				const win = getWindow();
				if (win?.AbortController) {
					return win.AbortController;
				}
			}
			catch (e) {
				// try the next candidate
			}
		}
		return class SimpleAbortController {
			constructor() {
				const listeners = new Set();
				this.signal = {
					aborted: false,
					reason: undefined,
					addEventListener(type, handler) {
						if (type === 'abort') {
							listeners.add(handler);
						}
					},
					removeEventListener(type, handler) {
						listeners.delete(handler);
					},
					throwIfAborted() {
						if (this.aborted) {
							throw new Error('aborted');
						}
					}
				};
				this.abort = (reason) => {
					if (this.signal.aborted) {
						return;
					}
					this.signal.aborted = true;
					this.signal.reason = reason;
					for (const handler of listeners) {
						try {
							handler({ type: 'abort', target: this.signal });
						}
						catch (e) {
							// ignore listener errors
						}
					}
				};
			}
		};
	})();

	const LOG_MAX_BYTES = 400 * 1024;
	let logQueue = Promise.resolve();

	function line(level, args) {
		const text = args.map(a => (typeof a === 'string' ? a : safeString(a))).join(' ');
		return `${new Date().toISOString()} [${level}] ${text}`;
	}

	function appendToFile(message) {
		if (typeof IOUtils === 'undefined') {
			return;
		}
		logQueue = logQueue.then(async () => {
			try {
				await M.Paths.ensureDataDir();
				const path = PathUtils.join(M.Paths.dataDir(), 'moonlit.log');
				let previous = '';
				try {
					const info = await IOUtils.stat(path);
					previous = info.size > LOG_MAX_BYTES ? '' : await IOUtils.readUTF8(path);
				}
				catch (e) {
					previous = '';
				}
				await IOUtils.writeUTF8(path, `${previous}${message}\n`);
			}
			catch (e) {
				// Logging must never break the feature.
			}
		});
	}

	M.Log = {
		enabled: false,
		init() {
			this.enabled = M.Prefs.getBool('debug', false);
		},
		debug(...args) {
			if (!this.enabled) {
				return;
			}
			const message = line('debug', args);
			Zotero.debug(`[Moonlit] ${args.map(a => (typeof a === 'string' ? a : safeString(a))).join(' ')}`);
			appendToFile(message);
		},
		info(...args) {
			const message = line('info', args);
			Zotero.debug(`[Moonlit] ${args.map(a => (typeof a === 'string' ? a : safeString(a))).join(' ')}`);
			appendToFile(message);
		},
		error(...args) {
			const message = line('error', args);
			const err = args.find(a => a instanceof Error);
			if (err) {
				Zotero.logError(err);
			}
			Zotero.debug(`[Moonlit] ${message}`);
			appendToFile(message);
		},
		path() {
			return PathUtils.join(M.Paths.dataDir(), 'moonlit.log');
		}
	};

	function safeString(value) {
		try {
			if (value instanceof Error) {
				return `${value.name}: ${value.message}`;
			}
			return JSON.stringify(value);
		}
		catch (e) {
			return String(value);
		}
	}

	M.Util = {
		AbortController: AbortControllerImpl,
		sleep(ms) {
			return new Promise(resolve => setTimeout(resolve, ms));
		},
		/** Run `worker` over `items` with at most `limit` in flight, preserving order. */
		async mapLimit(items, limit, worker) {
			const results = new Array(items.length);
			let cursor = 0;
			const size = Math.max(1, Math.min(limit || 1, items.length || 1));
			const runners = new Array(size).fill(0).map(async () => {
				for (;;) {
					const index = cursor++;
					if (index >= items.length) {
						return;
					}
					try {
						results[index] = await worker(items[index], index);
					}
					catch (e) {
						results[index] = { __error: e };
					}
				}
			});
			await Promise.all(runners);
			return results;
		},
		debounce(fn, wait) {
			let timer = null;
			return function (...args) {
				if (timer) {
					clearTimeout(timer);
				}
				timer = setTimeout(() => {
					timer = null;
					fn.apply(this, args);
				}, wait);
			};
		},
		/**
		 * Leading-edge throttle that always runs the newest call at the end of the
		 * window. Scroll synchronisation needs this: firing on every pointer move
		 * makes the page judder, dropping the last one leaves it misaligned.
		 */
		throttle(fn, wait) {
			let last = 0;
			let timer = null;
			let pending = null;
			const run = (args) => {
				last = Date.now();
				fn(...args);
			};
			return function (...args) {
				const now = Date.now();
				pending = args;
				if (now - last >= wait) {
					if (timer) {
						clearTimeout(timer);
						timer = null;
					}
					pending = null;
					run(args);
					return;
				}
				if (timer) {
					return;
				}
				timer = setTimeout(() => {
					timer = null;
					if (pending) {
						const final = pending;
						pending = null;
						run(final);
					}
				}, Math.max(16, wait - (now - last)));
			};
		},
		throttleRaf(fn) {
			let scheduled = false;
			let lastArgs = null;
			return function (...args) {
				lastArgs = args;
				if (scheduled) {
					return;
				}
				scheduled = true;
				const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb => setTimeout(cb, 16));
				raf(() => {
					scheduled = false;
					fn(...lastArgs);
				});
			};
		},
		hashString(text) {
			// FNV-1a, 32 bit — good enough for cache fingerprints.
			let hash = 0x811c9dc5;
			for (let i = 0; i < text.length; i++) {
				hash ^= text.charCodeAt(i);
				hash = Math.imul(hash, 0x01000193) >>> 0;
			}
			return hash.toString(16).padStart(8, '0');
		},
		escapeHtml(text) {
			return String(text)
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;');
		},
		collapseWhitespace(text) {
			return String(text || '').replace(/\s+/g, ' ').trim();
		},
		/** Collapse whitespace and unify quotes/dashes so AI quotes match PDF text. */
		normalizeForMatch(text) {
			return String(text || '')
				.replace(/[\u2018\u2019\u201B]/g, "'")
				.replace(/[\u201C\u201D\u201F]/g, '"')
				.replace(/[\u2010-\u2015\u2212]/g, '-')
				.replace(/\uFB01/g, 'fi')
				.replace(/\uFB02/g, 'fl')
				.replace(/\u00AD/g, '')
				.replace(/\s+/g, ' ')
				.trim()
				.toLowerCase();
		},
		truncate(text, max) {
			const value = String(text || '');
			return value.length > max ? `${value.slice(0, max - 1)}…` : value;
		},
		toInt(value, fallback) {
			const parsed = parseInt(value, 10);
			return Number.isFinite(parsed) ? parsed : fallback;
		}
	};

	/**
	 * The connection settings are the one thing that makes the whole plugin look
	 * broken when it goes missing: with no provider/model/key the AI calls fail
	 * before they start and nothing on screen explains why. Zotero rewrites
	 * `prefs.js` from memory, and a profile can lose these keys (another add-on
	 * writing the file, a crashed session, a manual edit). Keep a private copy in
	 * the data directory and restore from it when the prefs come back empty.
	 */
	const CONFIG_KEYS = ['provider', 'model', 'baseURL', 'apiKey'];
	const CONFIG_BACKUP = 'config.json';

	M.ConfigBackup = {
		async read() {
			try {
				const path = PathUtils.join(M.Paths.dataDir(), CONFIG_BACKUP);
				const text = await IOUtils.readUTF8(path);
				const data = JSON.parse(text);
				return data && typeof data === 'object' ? data : null;
			}
			catch (e) {
				return null;
			}
		},
		async write(values) {
			try {
				await M.Paths.ensureDataDir();
				const path = PathUtils.join(M.Paths.dataDir(), CONFIG_BACKUP);
				await IOUtils.writeUTF8(path, JSON.stringify(values, null, 2));
				try {
					// The file holds an API key: keep it user-only where supported.
					await IOUtils.setPermissions(path, 0o600);
				}
				catch (e) {
					// best effort
				}
			}
			catch (e) {
				M.Log.debug('config backup write failed', e);
			}
		},
		snapshot() {
			const values = {};
			for (const key of CONFIG_KEYS) {
				values[key] = M.Prefs.getString(key, '');
			}
			return values;
		},
		/** Seed the backup on the first complete configuration, never overwrite it. */
		async saveIfMissing() {
			const existing = await this.read();
			if (existing && existing.apiKey) {
				return false;
			}
			await this.save();
			return true;
		},
		/** Persist the current settings if they are complete enough to be useful. */
		async save(force = false) {
			const values = this.snapshot();
			if (!force && (!values.apiKey || !values.provider)) {
				return;
			}
			await this.write(values);
		},
		/**
		 * Restore any setting that is missing from the prefs but known from the
		 * backup. Returns the list of restored keys.
		 */
		async restore() {
			const backup = await this.read();
			if (!backup) {
				return [];
			}
			const saved = {};
			for (const key of CONFIG_KEYS) {
				saved[key] = typeof backup[key] === 'string' ? backup[key] : '';
			}
			// No key at all means the settings were lost, not that the user removed
			// them one by one: in that case restore the whole group, including the
			// provider (which otherwise reads as the built-in default).
			const lost = !M.Prefs.getString('apiKey', '') && !!saved.apiKey;
			const restored = [];
			for (const key of CONFIG_KEYS) {
				if (!saved[key]) {
					continue;
				}
				const current = M.Prefs.getString(key, '');
				if (lost || !current) {
					if (current === saved[key]) {
						continue;
					}
					M.Prefs.set(key, saved[key]);
					restored.push(key);
				}
			}
			return restored;
		}
	};

	M.Paths = {
		dataDir() {
			return PathUtils.join(Zotero.DataDirectory.dir, 'moonlit');
		},
		async ensureDataDir() {
			const dir = this.dataDir();
			await IOUtils.makeDirectory(dir, { createAncestors: true, ignoreExisting: true });
			return dir;
		}
	};
})();
