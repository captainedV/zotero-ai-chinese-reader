/* global Zotero, ChromeUtils, document */

/**
 * Preference pane logic. Runs in the preferences window's sandbox (no access to
 * the plugin sandbox globals), so it is deliberately self-contained.
 */
var MoonlitPreferences = {
	PREFIX: 'extensions.zotero.moonlit.',
	PROVIDERS: {
		deepseek: { label: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
		openai: { label: 'OpenAI', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
		moonshot: { label: 'Moonshot / Kimi', baseURL: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
		zhipu: { label: '智谱 GLM', baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
		dashscope: { label: '阿里云百炼 / Qwen', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
		siliconflow: { label: 'SiliconFlow', baseURL: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct' },
		ollama: { label: 'Ollama (本地)', baseURL: 'http://localhost:11434/v1', model: 'qwen2.5:7b' },
		custom: { label: '自定义 (OpenAI 兼容)', baseURL: '', model: '' },
		mock: { label: '演示模式 (无需 API)', baseURL: 'mock://', model: 'moonlit-demo' }
	},

	/** Idempotent boot: render into the host once it exists. */
	ready: false,

	boot() {
		if (this.ready) {
			return this.ready;
		}
		const doc = this.doc || document;
		const host = doc.getElementById('moonlit-prefs-host') || doc.getElementById('moonlit-prefpane-root');
		if (!host) {
			return null;
		}
		try {
			this.init();
			this.ready = true;
		}
		catch (e) {
			this.ready = false;
			if (!this.failed) {
				this.failed = true;
				try {
					Zotero.logError(e);
				}
				catch (error) {
					// logging must never break the pane
				}
			}
		}
		return this.ready;
	},

	/** Zotero loads the scripts before the markup, so watch for both signals. */
	watch() {
		// The same file is also evaluated by our static analyser, without a DOM.
		if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
			return;
		}
		this.doc = document;
		const observer = new MutationObserver(() => {
			if (this.ready) {
				observer.disconnect();
				return;
			}
			// Never boot from inside a mutation callback while one is pending:
			// disconnect first so our own DOM writes cannot re-enter.
			if (this.host && this.host.isConnected && this.boot()) {
				observer.disconnect();
			}
		});
		const tryBoot = () => {
			if (this.ready) {
				return true;
			}
			const ok = this.boot();
			if (ok) {
				observer.disconnect();
			}
			return ok;
		};
		try {
			// Non-bubbling, dispatched on the pane container's children.
			document.addEventListener('showing', () => this.boot(), true);
		}
		catch (e) {
			// ignore
		}
		if (!tryBoot()) {
			let tries = 0;
			const timer = setInterval(() => {
				if (tryBoot() || ++tries > 40) {
					clearInterval(timer);
				}
			}, 250);
			try {
				observer.observe(document.documentElement, { childList: true, subtree: true });
			}
			catch (e) {
				// ignore
			}
		}
	},

	init() {
		this.doc = document;
		this.host = document.querySelector('#moonlit-prefs-host');
		if (!this.host) {
			this.host = document.getElementById('moonlit-prefpane-root');
		}
		this.host.replaceChildren();
		const root = this.el('div', { class: 'moonlit-prefs' });
		this.root = root;
		this.host.appendChild(root);
		try {
			this.build();
		}
		catch (e) {
			// Never leave the preferences window half-built or hanging: show the
			// failure inline instead.
			Zotero.logError(e);
			try {
				root.appendChild(this.el('div', {
					class: 'ml-result ml-bad',
					text: `Moonlit Reader: ${e.message}`
				}));
			}
			catch (ignored) {
				// nothing else to do
			}
		}
	},

	// ---------------------------------------------------------------- helpers
	t(zh, en) {
		const locale = (Zotero.locale || 'en-US').toLowerCase();
		return locale.startsWith('zh') ? zh : en;
	},

	el(tag, props = {}, children = []) {
		const el = this.doc.createElement(tag);
		for (const [key, value] of Object.entries(props)) {
			if (key === 'text') {
				el.textContent = value;
			}
			else if (key === 'html') {
				el.innerHTML = value;
			}
			else if (key === 'class') {
				el.className = value;
			}
			else if (key === 'style') {
				el.setAttribute('style', value);
			}
			else if (key.startsWith('on') && typeof value === 'function') {
				el.addEventListener(key.slice(2), value);
			}
			else if (key === 'dataset') {
				for (const [k, v] of Object.entries(value)) {
					el.dataset[k] = v;
				}
			}
			else {
				el.setAttribute(key, value);
			}
		}
		for (const child of [].concat(children)) {
			if (child === null || child === undefined || child === false) {
				continue;
			}
			el.append(child.nodeType ? child : this.doc.createTextNode(String(child)));
		}
		return el;
	},

	get(key, fallback) {
		try {
			const value = Zotero.Prefs.get(this.PREFIX + key, true);
			return value === undefined || value === null ? fallback : value;
		}
		catch (e) {
			return fallback;
		}
	},

	set(key, value) {
		Zotero.Prefs.set(this.PREFIX + key, value, true);
	},

	field(labelZh, labelEn, control, hintZh, hintEn) {
		const wrap = this.el('div', { class: 'ml-control' }, [control]);
		const label = this.el('div', { class: 'ml-label' }, [
			this.el('div', { text: this.t(labelZh, labelEn) }),
			hintZh || hintEn ? this.el('small', { text: this.t(hintZh || '', hintEn || '') }) : null
		]);
		return this.el('div', { class: 'ml-field' }, [label, wrap]);
	},

	textInput(key, { placeholder = '', type = 'text' } = {}) {
		const input = this.el('input', { type, placeholder, style: 'flex:1 1 auto' });
		input.value = this.get(key, '') ?? '';
		input.addEventListener('change', () => this.set(key, input.value.trim()));
		input.addEventListener('input', () => {
			// Keep prefs in sync immediately so the reader UI never reads a stale key.
			this.set(key, input.value.trim());
		});
		return input;
	},

	select(key, options, { onchange } = {}) {
		const select = this.el('select');
		for (const [value, label] of options) {
			const option = this.el('option', { value, text: label });
			select.appendChild(option);
		}
		const current = String(this.get(key, options[0]?.[0] ?? ''));
		select.value = current;
		select.addEventListener('change', () => {
			this.set(key, select.value);
			onchange?.(select.value);
		});
		return select;
	},

	numberInput(key, { min = 0, max = 100, step = 1, fallback = 0 } = {}) {
		const input = this.el('input', {
			type: 'number',
			min: String(min),
			max: String(max),
			step: String(step),
			style: 'flex:0 0 96px'
		});
		input.value = String(this.get(key, fallback));
		input.addEventListener('change', () => {
			let value = Number(input.value);
			if (!Number.isFinite(value)) {
				value = fallback;
			}
			value = Math.min(max, Math.max(min, value));
			input.value = String(value);
			this.set(key, value);
		});
		return input;
	},

	checkbox(key, fallback = false) {
		const input = this.el('input', { type: 'checkbox', style: 'flex:none' });
		input.checked = !!this.get(key, fallback);
		input.addEventListener('change', () => this.set(key, !!input.checked));
		return input;
	},

	// ------------------------------------------------------------------ build
	build() {
		const moonIcon = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8 8.5 8.5 0 1 0 20.2 14.6Z" fill="currentColor"/>
			<path d="M17.6 3.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" fill="currentColor" opacity=".85"/>
		</svg>`;

		this.root.append(
			this.el('div', { class: 'ml-hero' }, [
				this.el('div', { class: 'ml-hero-mark', html: moonIcon }),
				this.el('div', {}, [
					this.el('div', {
						class: 'ml-hero-title',
						text: this.t('Moonlit Reader · AI 论文阅读助手', 'Moonlit Reader · AI paper companion')
					}),
					this.el('div', {
						class: 'ml-hero-sub',
						text: this.t(
							'在 Zotero 阅读器里完成全文对照翻译、论文总结与 AI 重点标注。填入任意 OpenAI 兼容服务的 API Key 即可使用。',
							'Side-by-side translation, paper summaries and AI highlights inside the Zotero reader. Fill in any OpenAI-compatible API key to start.'
						)
					})
				])
			])
		);

		this.buildServiceCard();
		this.buildFeatureCard();
		this.buildPromptCard();
		this.buildDataCard();
	},

	buildServiceCard() {
		const providerSelect = this.select('provider', Object.entries(this.PROVIDERS).map(([id, p]) => [id, p.label]), {
			onchange: (value) => {
				const preset = this.PROVIDERS[value];
				if (preset && preset.baseURL) {
					this.baseURLInput.value = '';
					this.baseURLInput.placeholder = preset.baseURL;
				}
				if (preset && preset.model) {
					this.modelInput.value = '';
					this.modelInput.placeholder = preset.model;
				}
			}
		});

		const apiKeyInput = this.textInput('apiKey', { type: 'password', placeholder: 'sk-...' });
		const revealButton = this.el('button', {
			text: this.t('显示', 'Show'),
			onclick: () => {
				const hidden = apiKeyInput.type === 'password';
				apiKeyInput.type = hidden ? 'text' : 'password';
				revealButton.textContent = hidden ? this.t('隐藏', 'Hide') : this.t('显示', 'Show');
			}
		});

		const preset = this.PROVIDERS[String(this.get('provider', 'deepseek'))] || this.PROVIDERS.deepseek;
		this.baseURLInput = this.textInput('baseURL', { placeholder: preset.baseURL });
		this.modelInput = this.textInput('model', { placeholder: preset.model });

		// Which URL is really going to be called? A silently wrong endpoint is the
		// most confusing failure there is, so show the resolved one. This pane runs
		// in its own sandbox without the plugin globals, so resolve it locally.
		const resolvedEndpoint = () => {
			const id = String(this.get('provider', 'deepseek'));
			const preset = this.PROVIDERS[id] || this.PROVIDERS.deepseek;
			let base = String(this.get('baseURL', '') || preset.baseURL || '').trim().replace(/\/+$/, '');
			if (!base) {
				return '';
			}
			if (/\/chat\/completions$/.test(base)) {
				return base;
			}
			if (/\/v\d+$/.test(base) || /\/compatible-mode\/v\d+$/.test(base) || /\/paas\/v\d+$/.test(base)) {
				return `${base}/chat/completions`;
			}
			return `${base}/v1/chat/completions`;
		};
		const endpointHint = this.el('div', { class: 'ml-endpoint-hint' });
		const refreshEndpoint = () => {
			try {
				const url = resolvedEndpoint();
				endpointHint.textContent = url
					? this.t(`实际请求地址：${url}`, `Requests go to: ${url}`)
					: '';
			}
			catch (e) {
				endpointHint.textContent = '';
			}
		};
		for (const input of [this.baseURLInput, providerSelect]) {
			input?.addEventListener?.('change', refreshEndpoint);
			input?.addEventListener?.('input', refreshEndpoint);
		}
		refreshEndpoint();

		const result = this.el('div', { class: 'ml-result' });
		const testButton = this.el('button', {
			class: 'ml-primary',
			text: this.t('测试连接', 'Test connection'),
			onclick: async () => {
				testButton.disabled = true;
				result.className = 'ml-result';
				result.textContent = '';
				const outcome = await this.testConnection();
				result.className = `ml-result ${outcome.ok ? 'ml-ok' : 'ml-bad'}`;
				result.textContent = outcome.ok
					? this.t(`连接成功（${outcome.latency} ms）：`, `Connected (${outcome.latency} ms): `) + outcome.message
					: outcome.message;
				testButton.disabled = false;
			}
		});

		const card = this.el('div', { class: 'ml-card' }, [
			this.el('div', { class: 'ml-card-title', text: this.t('AI 服务', 'AI service') }),
			this.el('div', {
				class: 'ml-card-desc',
				text: this.t(
					'支持 DeepSeek、OpenAI、Kimi、智谱、通义千问、SiliconFlow、Ollama 以及任何 OpenAI 兼容端点。API Key 保存在本机 Zotero 配置中，不会上传到第三方。',
					'Works with DeepSeek, OpenAI, Moonshot, Zhipu, Qwen, SiliconFlow, Ollama and any OpenAI-compatible endpoint. The key is stored locally in Zotero preferences.'
				)
			}),
			this.field('服务商', 'Provider', providerSelect),
			this.field('API Key', 'API Key', this.el('div', { style: 'display:flex;gap:8px;flex:1 1 auto;align-items:center' }, [apiKeyInput, revealButton]),
				'必填（Ollama 与演示模式除外）', 'Required except for Ollama/demo mode'),
			this.field('Base URL', 'Base URL', this.baseURLInput, '留空使用所选服务商的默认地址', 'Leave empty to use the provider default'),
			endpointHint,
			this.field('模型', 'Model', this.modelInput, '留空使用默认模型', 'Leave empty to use the default model'),
			this.field('温度', 'Temperature', this.numberInput('temperature', { min: 0, max: 2, step: 0.1, fallback: 0.3 }),
				'建议 0.2–0.4，越低越稳定', '0.2–0.4 recommended'),
			this.field('最大输出 tokens', 'Max output tokens', this.numberInput('maxTokens', { min: 256, max: 32000, step: 256, fallback: 8192 }),
				'推理型模型会先“思考”，数值太小会导致没有答案', 'Reasoning models need room to think before answering'),
			this.field('每分钟请求上限', 'Requests per minute', this.numberInput('maxRpm', { min: 0, max: 600, step: 5, fallback: 45 }),
				'超过网关的每分钟上限会返回 429；默认 45 留有余量，0 表示不限制',
				'Gateways reject requests above their per-minute cap (429); 45 leaves headroom, 0 disables the budget'),
			this.field('每次请求的原文上限（字符）', 'Source chars per request', this.numberInput('batchChars', { min: 400, max: 8000, step: 200, fallback: 2200 }),
				'连续段落会合并进同一次请求，既能带上上下文，也减少往返与开销；太大时模型容易漏条目',
				'Consecutive paragraphs share one request for context and fewer round trips; too large and the model starts dropping items'),
			this.field('每次请求的最大段数', 'Paragraphs per request', this.numberInput('batchUnits', { min: 1, max: 20, step: 1, fallback: 6 }),
				'与字符上限共同决定批量大小', 'Combined with the character cap'),
			this.field('上下文长度（字符）', 'Context chars', this.numberInput('contextChars', { min: 0, max: 3000, step: 100, fallback: 900 }),
				'每段前后各带多少原文作为参考，用于统一术语与指代', 'How much neighbouring source text is sent as reference'),
			this.field('并发请求数', 'Concurrent requests', this.numberInput('concurrency', { min: 1, max: 8, step: 1, fallback: 3 }),
				'翻译全文时同时发出的请求数量', 'Parallel requests while translating'),
			this.field('网络传输', 'Transport', this.select('transport', [
				['fetch', 'fetch（推荐，同 1.0.1）'],
				['xhr', 'XMLHttpRequest（旧版）']
			]), 'fetch 流式读取最稳定；个别环境 fetch 不可用时插件会自动回退到 XHR',
				'fetch streams most reliably; the plugin falls back to XHR automatically'),
			this.field('流式输出', 'Streaming output', this.checkbox('stream', true), '总结实时显示逐字结果；代理拦截流式时会自动退回非流式', 'Stream summary text; falls back automatically if a proxy blocks streaming'),
			this.field('流式无响应超时（秒）', 'Stream stall timeout (s)', this.numberInput('stallSeconds', { min: 5, max: 120, step: 5, fallback: 15 }),
				'超过该时间没有收到任何数据就改用非流式请求', 'Retry without streaming after this much silence'),
			this.field('详细日志', 'Verbose log', this.checkbox('debug', false),
				'排查问题时打开，日志写到数据目录的 moonlit.log', 'Write detailed logs to moonlit.log in the data directory'),
			this.el('div', { style: 'display:flex;gap:8px;margin-top:12px' }, [testButton, result])
		]);
		this.root.appendChild(card);
	},

	buildFeatureCard() {
		const langs = [
			['zh-CN', '简体中文'],
			['zh-TW', '繁體中文'],
			['en-US', 'English'],
			['ja-JP', '日本語'],
			['ko-KR', '한국어'],
			['de-DE', 'Deutsch'],
			['fr-FR', 'Français']
		];
		const card = this.el('div', { class: 'ml-card' }, [
			this.el('div', { class: 'ml-card-title', text: this.t('阅读增强', 'Reading enhancements') }),
			this.el('div', { class: 'ml-card-desc', text: this.t('这些开关也可以在阅读器顶部工具栏的 Moonlit 图标中随时切换。', 'These can also be toggled from the Moonlit icon in the reader toolbar.') }),
			this.field('译文语言', 'Target language', this.select('targetLang', langs)),
			this.field('翻译粒度', 'Translation granularity', this.select('granularity', [
				['paragraph', this.t('整段（推荐）', 'Paragraph (recommended)')],
				['sentence', this.t('逐句', 'Sentence')]
			]), this.t('整段翻译质量最好；逐句能与原文逐句对应高亮', 'Paragraph reads best; sentence mode gives per-sentence cross-highlighting')),
			this.field('显示原文', 'Show original text', this.checkbox('showOriginalInTranslation', true), this.t('在译文下方显示对应原文', 'Show the source sentence under each translation')),
			this.field('默认开启翻译', 'Translate on open', this.checkbox('autoTranslateOnOpen', false), this.t('打开 PDF 时自动开始全文翻译', 'Start translating as soon as a PDF opens')),
			this.field('默认开启总结', 'Summarize on open', this.checkbox('autoSummaryOnOpen', false), this.t('打开 PDF 时自动生成总结', 'Generate a summary as soon as a PDF opens')),
			this.field('调试日志', 'Debug logging', this.checkbox('debug', false), this.t('在帮助 → 调试输出中记录详细日志', 'Log verbose output to Help → Debug Output'))
		]);
		this.root.appendChild(card);
	},

	buildPromptCard() {
		const area = (key, placeholderZh, placeholderEn) => {
			const input = this.el('textarea', { placeholder: this.t(placeholderZh, placeholderEn) });
			input.value = this.get(key, '') || '';
			input.addEventListener('change', () => this.set(key, input.value));
			return input;
		};
		const card = this.el('div', { class: 'ml-card' }, [
			this.el('div', { class: 'ml-card-title', text: this.t('自定义提示词（高级）', 'Custom prompts (advanced)') }),
			this.el('div', { class: 'ml-card-desc', text: this.t('留空使用内置提示词。若填写，将作为系统提示词覆盖内置版本。', 'Leave empty to use the built-in prompts. Filled-in values replace the built-in system prompt.') }),
			this.field('翻译提示词', 'Translation prompt', area('promptTranslate', '例如：你是学术翻译……', 'e.g. You are an academic translator...')),
			this.field('总结提示词', 'Summary prompt', area('promptSummary', '例如：请用中文输出以下小节……', 'e.g. Output the following sections in Chinese...')),
			this.field('标注提示词', 'Highlight prompt', area('promptHighlight', '例如：挑选 12 条最重要的句子……', 'e.g. Pick the 12 most important sentences...'))
		]);
		this.root.appendChild(card);
	},

	buildDataCard() {
		const output = this.el('div', { class: 'ml-hint' });
		const clearButton = this.el('button', {
			text: this.t('清空本地缓存', 'Clear local cache'),
			onclick: async () => {
				clearButton.disabled = true;
				output.textContent = this.t('正在清理…', 'Clearing…');
				try {
					const io = ChromeUtils.importESModule('resource://gre/modules/IOUtils.sys.mjs').IOUtils;
					const paths = ChromeUtils.importESModule('resource://gre/modules/PathUtils.sys.mjs').PathUtils;
					const dir = paths.join(Zotero.DataDirectory.dir, 'moonlit');
					const children = await io.getChildren(dir).catch(() => []);
					for (const child of children) {
						await io.remove(child, { recursive: true, ignoreAbsent: true });
					}
					output.textContent = this.t(`已清理 ${children.length} 个缓存文件。`, `Removed ${children.length} cache files.`);
				}
				catch (e) {
					output.textContent = String(e);
				}
				clearButton.disabled = false;
			}
		});
		const card = this.el('div', { class: 'ml-card' }, [
			this.el('div', { class: 'ml-card-title', text: this.t('缓存与数据', 'Cache & data') }),
			this.el('div', { class: 'ml-card-desc', text: this.t('译文、总结与标注结果会缓存到 Zotero 数据目录下的 moonlit 文件夹，重新打开论文时无需再次请求 AI。', 'Translations, summaries and highlights are cached under the moonlit folder in your Zotero data directory, so reopening a paper is instant.') }),
			this.el('div', { class: 'ml-row-inline' }, [clearButton, output])
		]);
		this.root.appendChild(card);
	},

	// ------------------------------------------------------------------ test
	async testConnection() {
		const provider = String(this.get('provider', 'deepseek'));
		const preset = this.PROVIDERS[provider] || {};
		const baseURL = String(this.get('baseURL', '') || preset.baseURL || '');
		const model = String(this.get('model', '') || preset.model || '');
		const apiKey = String(this.get('apiKey', '') || '');
		if (provider === 'mock') {
			return { ok: true, latency: 0, message: this.t('演示模式可用', 'Demo mode ready') };
		}
		if (!apiKey && provider !== 'ollama') {
			return { ok: false, message: this.t('请先填写 API Key', 'Please fill in the API key first') };
		}
		if (!baseURL) {
			return { ok: false, message: this.t('请填写 Base URL', 'Please fill in the Base URL') };
		}
		let endpoint = baseURL.replace(/\/+$/, '');
		if (!/\/chat\/completions$/.test(endpoint)) {
			endpoint += /\/v\d+$|\/compatible-mode\/v\d+$|\/paas\/v\d+$/.test(endpoint)
				? '/chat/completions'
				: '/v1/chat/completions';
		}
		const started = Date.now();
		try {
			const response = await Zotero.HTTP.request('POST', endpoint, {
				headers: {
					'Content-Type': 'application/json',
					...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
				},
				body: JSON.stringify({
					model,
					messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
					max_tokens: 16,
					temperature: 0
				}),
				responseType: 'json',
				timeout: 30000
			});
			const content = response.response?.choices?.[0]?.message?.content ?? '';
			return {
				ok: true,
				latency: Date.now() - started,
				message: String(content).trim().slice(0, 80) || 'OK'
			};
		}
		catch (e) {
			const status = e?.xmlHttpRequest?.status;
			const body = e?.xmlHttpRequest?.responseText?.slice(0, 200) || '';
			return {
				ok: false,
				message: this.t(
					`请求失败${status ? `（HTTP ${status}）` : ''} ${body}`,
					`Request failed${status ? ` (HTTP ${status})` : ''} ${body}`
				).trim()
			};
		}
	}
};

// The pane script is evaluated inside the preferences window scope, before the
// pane markup is inserted, so boot from whichever signal arrives first.
try {
	MoonlitPreferences.watch();
}
catch (e) {
	Zotero.logError(e);
}
