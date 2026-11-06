/* global Zotero, XMLHttpRequest */

/**
 * OpenAI-compatible chat client.
 *
 * Works with DeepSeek / OpenAI / Moonshot / 智谱 / 通义 / SiliconFlow / Ollama and
 * any other endpoint that speaks `/chat/completions`. Streaming is supported via
 * SSE, plus a built-in demo provider (`mock`) so the whole UI can be exercised
 * without an API key.
 *
 * Transport: plain sandbox `fetch` with `response.body` streaming — the same
 * implementation 1.0.1 shipped and the one that works against the gateways this
 * plugin is actually used with. The privileged XMLHttpRequest stack is kept only
 * as an automatic fallback (and selectable in settings) because its
 * `onprogress`-based streaming depends on a proxy forwarding partial bodies.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	const ACTIVE = new Set();

	function t(key, vars) {
		return M.I18n.t(key, vars);
	}

	function describe() {
		const provider = M.Prefs.provider();
		const apiKey = M.Prefs.getString('apiKey', '');
		const isMock = provider.id === 'mock';
		return {
			...provider,
			isMock,
			hasKey: !!apiKey || isMock || (provider.id === 'ollama' && !apiKey),
			ready: (!!apiKey || isMock || provider.id === 'ollama') && !!provider.baseURL,
			stream: M.Prefs.getBool('stream', true)
		};
	}

	function isConfigured() {
		return describe().ready;
	}

	function endpoint(baseURL) {
		let base = String(baseURL || '').trim().replace(/\/+$/, '');
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
	}

	class AIError extends Error {
		constructor(message, options = {}) {
			super(message);
			this.name = 'AIError';
			this.status = options.status;
			this.code = options.code;
			this.retryable = options.retryable ?? false;
			this.retryAfter = options.retryAfter ?? 0;
			this.body = options.body;
			// Diagnostics the retry logic needs: a reply that stopped because the
			// output budget ran out mid-reasoning is not the same as an empty reply.
			this.reasoning = options.reasoning;
			this.lengthStopped = options.lengthStopped;
			this.usage = options.usage;
			this.endpoint = options.endpoint;
		}
	}

	/**
	 * Parse an SSE chunk buffer, emitting deltas and collecting usage.
	 * @returns {{done:boolean}}
	 */
	function makeSseParser(onDelta, state) {
		let buffer = '';
		const handleLine = (line) => {
			const trimmed = line.trim();
			if (!trimmed) {
				return false;
			}
			if (!trimmed.startsWith('data:')) {
				return false;
			}
			const payload = trimmed.slice(5).trim();
			if (payload === '[DONE]') {
				return true;
			}
			let json;
			try {
				json = JSON.parse(payload);
			}
			catch (e) {
				return false;
			}
			if (json.usage) {
				state.usage = json.usage;
			}
			if (json.error) {
				state.error = json.error.message || JSON.stringify(json.error).slice(0, 300);
			}
			const choice = json.choices?.[0] ?? {};
			const delta = choice.delta ?? {};
			if (choice.finish_reason) {
				state.finishReason = choice.finish_reason;
			}
			const piece = delta.content ?? '';
			if (delta.reasoning_content) {
				state.reasoning += delta.reasoning_content;
			}
			if (piece) {
				state.text += piece;
				onDelta?.(piece, state.text);
			}
			// Some providers put the final text in `message` on the last chunk.
			const final = choice.message?.content;
			if (!piece && final) {
				state.text += final;
				onDelta?.(final, state.text);
			}
			return false;
		};

		return {
			push(chunk) {
				if (!chunk) {
					return false;
				}
				buffer += chunk;
				const lines = buffer.split(/\r?\n/);
				buffer = lines.pop() ?? '';
				for (const line of lines) {
					if (handleLine(line)) {
						return true;
					}
				}
				return false;
			},
			flush() {
				if (buffer) {
					handleLine(buffer);
					buffer = '';
				}
			}
		};
	}

	/**
	 * Gateways cap requests per minute (the one this plugin was tested against
	 * allows 50/min per key) and answer 429 when they are pushed harder. Firing a
	 * whole paper's batches as fast as the pool allows guarantees a wall of 429s,
	 * so keep a rolling one-minute budget and a shared cooldown that a 429 sets for
	 * every caller, then let the retry ladder recover instead of failing the batch.
	 */
	let recentCalls = [];

	/** The rolling budget window; a pref so tests can use a short one. */
	function rpmWindow() {
		const value = M.Prefs.getInt('rpmWindowMs', 60000);
		return Number.isFinite(value) && value > 0 ? value : 60000;
	}
	let cooldownUntil = 0;

	function rpmLimit() {
		const value = M.Prefs.getInt('maxRpm', 45);
		return Number.isFinite(value) && value >= 0 ? value : 45;
	}

	async function respectRateLimit() {
		const until = cooldownUntil - Date.now();
		if (until > 0) {
			await M.Util.sleep(until);
		}
		const limit = rpmLimit();
		if (limit > 0) {
			const window = rpmWindow();
			const now = Date.now();
			recentCalls = recentCalls.filter(stamp => now - stamp < window);
			if (recentCalls.length >= limit) {
				const wait = window - (now - recentCalls[0]) + 50;
				if (wait > 0) {
					M.Log.info('request budget spent, waiting', { wait, limit });
					await M.Util.sleep(wait);
				}
			}
		}
		recentCalls.push(Date.now());
	}

	/** Pull the wait the server asked for out of the headers or the message. */
	function retryAfterFrom(xhr, detail) {
		let header = 0;
		try {
			header = xhr ? Number(xhr.getResponseHeader('Retry-After')) : 0;
		}
		catch (e) {
			header = 0;
		}
		if (Number.isFinite(header) && header > 0) {
			return Math.min(60000, header * 1000);
		}
		const text = String(detail || '');
		const match = /(\d+(?:\.\d+)?)\s*(?:秒后重试|seconds?|secs?|s\b)/i.exec(text)
			|| /retry[- ]after[:\s]*(\d+(?:\.\d+)?)/i.exec(text);
		if (match) {
			return Math.min(60000, Math.max(500, parseFloat(match[1]) * 1000));
		}
		return 0;
	}

	/**
	 * Transport. 1.0.1 talked to the API with plain `fetch` from the plugin sandbox
	 * and that is what ships again: `fetch` streams `response.body` reliably, while
	 * the privileged XMLHttpRequest stack only exposes partial bodies through
	 * `onprogress`, which some proxies/gateways never deliver (the request then sits
	 * at 0 % forever). XHR stays as an automatic fallback for environments without
	 * `fetch`, and `transport` forces one or the other.
	 */
	function transportName() {
		const preferred = M.Prefs.getString('transport', 'fetch');
		if (preferred === 'xhr') {
			return 'xhr';
		}
		return typeof fetch === 'function' ? 'fetch' : 'xhr';
	}

	function request(options) {
		return transportName() === 'fetch' ? requestFetch(options) : requestXhr(options);
	}

	/** `fetch` implementation: streams `response.body`, honours the watchdog. */
	async function requestFetch({ url, headers, body, onDelta, controller, watch = false }) {
		const state = { text: '', reasoning: '', usage: null, error: null, finishReason: '' };
		const parser = makeSseParser(onDelta, state);
		const stallMs = Math.max(5, M.Prefs.getInt('stallSeconds', 15)) * 1000;

		let stallTimer = null;
		let stalled = false;
		const clearStall = () => {
			if (stallTimer) {
				clearTimeout(stallTimer);
				stallTimer = null;
			}
		};
		let onStall = null;
		const armStall = () => {
			clearStall();
			stallTimer = setTimeout(() => {
				stalled = true;
				M.Log.info('stream stalled, will retry without streaming', { url, stallMs });
				onStall?.();
			}, stallMs);
		};

		const init = { method: 'POST', headers, body };
		const signal = controller?.signal;
		const signalIsUsable = signal && typeof AbortSignal !== 'undefined'
			&& typeof AbortSignal === 'function'
			&& (signal instanceof AbortSignal || typeof signal.addEventListener === 'function'
				&& typeof signal.throwIfAborted === 'function');
		if (signalIsUsable) {
			init.signal = signal;
		}

		let response;
		try {
			response = await fetch(url, init);
		}
		catch (e) {
			clearStall();
			if (signal?.aborted) {
				throw new AIError(t('error.aborted'), { code: 'aborted' });
			}
			throw new AIError(t('error.networkDetail', { url, msg: e?.message || String(e) }), {
				code: 'network',
				retryable: true
			});
		}

		const status = response.status;
		if (status >= 400) {
			const detail = String(await response.text().catch(() => '')).slice(0, 600);
			const retryAfter = status === 429 ? retryAfterFrom(null, detail) : 0;
			if (retryAfter > 0) {
				cooldownUntil = Math.max(cooldownUntil, Date.now() + retryAfter);
			}
			throw new AIError(t('error.http', { status }) + (detail ? ` — ${detail}` : ''), {
				status,
				code: 'http',
				retryable: status === 429 || status >= 500,
				body: detail,
				retryAfter
			});
		}

		const readable = watch && response.body && typeof response.body.getReader === 'function';
		if (!readable) {
			const raw = await response.text().catch(() => '');
			clearStall();
			if (state.error) {
				throw new AIError(String(state.error).slice(0, 300), { status, code: 'http', body: state.error });
			}
			parser.push(raw);
			parser.flush();
			return { status, raw, ...state };
		}

		const reader = response.body.getReader();
		const decoder = typeof TextDecoder === 'function' ? new TextDecoder() : null;
		const stall = new Promise((_, reject) => {
			onStall = () => {
				try {
					reader.cancel().catch(() => {});
				}
				catch (e) {
					// ignore
				}
				reject(new AIError(t('error.stall', { seconds: Math.round(stallMs / 1000) }), {
					code: 'stall',
					retryable: true
				}));
			};
		});

		armStall();
		const pump = (async () => {
			for (;;) {
				const chunk = await reader.read();
				if (chunk.done) {
					break;
				}
				if (!chunk.value) {
					continue;
				}
				const piece = decoder
					? decoder.decode(chunk.value, { stream: true })
					: String.fromCharCode.apply(null, chunk.value);
				if (piece) {
					parser.push(piece);
					armStall();
				}
			}
		})();

		try {
			await Promise.race([pump, stall]);
		}
		catch (e) {
			clearStall();
			if (stalled) {
				throw e;
			}
			if (signal?.aborted) {
				throw new AIError(t('error.aborted'), { code: 'aborted' });
			}
			throw new AIError(t('error.networkDetail', { url, msg: e?.message || String(e) }), {
				code: 'network',
				retryable: true
			});
		}
		clearStall();
		parser.flush();
		if (state.error) {
			throw new AIError(String(state.error).slice(0, 300), { status, code: 'http', body: state.error });
		}
		return { status, raw: '', ...state };
	}

	/**
	 * Legacy transport: the privileged XMLHttpRequest stack. Only used when `fetch`
	 * is unavailable or when `transport` is set to `xhr`.
	 */
	function requestXhr({ url, headers, body, onDelta, controller, watch = false }) {
		return new Promise((resolve, reject) => {
			let xhr;
			try {
				xhr = new XMLHttpRequest();
			}
			catch (e) {
				reject(new AIError(t('error.networkDetail', { url, msg: e.message }), { code: 'network' }));
				return;
			}
			const state = { text: '', reasoning: '', usage: null, error: null, finishReason: '' };
			const parser = makeSseParser(onDelta, state);
			let seen = 0;
			let aborted = false;
			let stalled = false;
			let stallTimer = null;

			// A gateway that buffers or black-holes the *stream* never fires
			// `onerror` and never sends bytes: without a watchdog the caller just
			// sits at 0% until the long timeout. Bail out early and let the caller
			// retry without streaming, which every OpenAI-compatible endpoint
			// supports. A non-streaming request has no partial output by design, so
			// it must not be watched — a slow-but-healthy reply would be killed.
			const stallMs = Math.max(5, M.Prefs.getInt('stallSeconds', 15)) * 1000;
			const clearStall = () => {
				if (stallTimer) {
					clearTimeout(stallTimer);
					stallTimer = null;
				}
			};
			const armStall = () => {
				clearStall();
				stallTimer = setTimeout(() => {
					if (aborted) {
						return;
					}
					stalled = true;
					M.Log.info('stream stalled, will retry without streaming', { url, seen, stallMs });
					reject(new AIError(t('error.stall', { seconds: Math.round(stallMs / 1000) }), {
						code: 'stall',
						retryable: true
					}));
					try {
						xhr.abort();
					}
					catch (e) {
						// ignore
					}
				}, stallMs);
			};
			if (watch) {
				armStall();
			}

			const onAbort = () => {
				aborted = true;
				try {
					xhr.abort();
				}
				catch (e) {
					// ignore
				}
			};
			if (controller?.signal) {
				if (controller.signal.aborted) {
					onAbort();
				}
				else {
					controller.signal.addEventListener('abort', onAbort, { once: true });
				}
			}

			const takeAvailable = () => {
				let text = '';
				try {
					text = xhr.responseText || '';
				}
				catch (e) {
					return;
				}
				if (text.length > seen) {
					parser.push(text.slice(seen));
					seen = text.length;
					armStall();
				}
			};

			xhr.onprogress = takeAvailable;
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 3) {
					takeAvailable();
				}
			};
			xhr.onload = () => {
				clearStall();
				takeAvailable();
				parser.flush();
				const status = xhr.status || 0;
				if (stalled) {
					return;
				}
				if (aborted) {
					reject(new AIError(t('error.aborted'), { code: 'aborted' }));
					return;
				}
				if (status >= 400) {
					const detail = String(xhr.responseText || '').slice(0, 600);
					const retryAfter = status === 429 ? retryAfterFrom(xhr, detail) : 0;
					if (retryAfter > 0) {
						cooldownUntil = Math.max(cooldownUntil, Date.now() + retryAfter);
					}
					reject(new AIError(
						t('error.http', { status }) + (detail ? ` — ${detail}` : ''),
						{
							status,
							code: 'http',
							retryable: status === 429 || status >= 500,
							body: detail,
							retryAfter
						}
					));
					return;
				}
				if (state.error) {
					reject(new AIError(String(state.error).slice(0, 300), { status, code: 'http', body: state.error }));
					return;
				}
				resolve({ status, raw: String(xhr.responseText || ''), ...state });
			};
			xhr.onerror = () => {
				clearStall();
				if (stalled) {
					return;
				}
				reject(new AIError(t('error.networkDetail', { url, msg: 'XMLHttpRequest error' }), {
					code: 'network',
					retryable: true
				}));
			};
			xhr.ontimeout = () => {
				clearStall();
				if (stalled) {
					return;
				}
				reject(new AIError(t('error.networkDetail', { url, msg: 'timeout' }), {
					code: 'network',
					retryable: true
				}));
			};
			xhr.onabort = () => {
				clearStall();
				if (stalled) {
					return;
				}
				reject(new AIError(t('error.aborted'), { code: 'aborted' }));
			};

			try {
				xhr.open('POST', url, true);
				for (const [name, value] of Object.entries(headers)) {
					xhr.setRequestHeader(name, value);
				}
				if (M.Prefs.getInt('timeoutSeconds', 120)) {
					xhr.timeout = M.Prefs.getInt('timeoutSeconds', 120) * 1000;
				}
				xhr.send(body);
			}
			catch (e) {
				reject(new AIError(t('error.networkDetail', { url, msg: e.message }), { code: 'network' }));
			}
		});
	}

	/** Tokens for one exchange: provider-reported when available, else estimated. */
	function recordUsage({ usage, messages, output, kind }) {
		M.ConfigBackup?.save?.().catch(e => M.Log.debug('config backup save failed', e));
		if (!M.Usage) {
			return null;
		}
		const promptTokens = usage?.prompt_tokens ?? usage?.promptTokens;
		const completionTokens = usage?.completion_tokens ?? usage?.completionTokens;
		const reported = Number.isFinite(promptTokens) && Number.isFinite(completionTokens);
		const promptText = (messages || []).map(message => message.content).join('\n');
		return M.Usage.add({
			prompt: reported ? promptTokens : M.Usage.estimateTokens(promptText),
			completion: reported ? completionTokens : M.Usage.estimateTokens(output),
			estimated: !reported,
			kind
		});
	}

	/**
	 * Send one chat request.
	 * @param {Object} params
	 * @param {Array<{role:string,content:string}>} params.messages
	 * @param {number} [params.temperature]
	 * @param {number} [params.maxTokens]
	 * @param {boolean} [params.json]
	 * @param {AbortSignal} [params.signal]
	 * @param {function(string,string):void} [params.onDelta]
	 * @param {string} [params.kind] usage bucket: translate|summary|highlight|selection
	 * @returns {Promise<string>}
	 */
	async function chat({ messages, temperature, maxTokens, json, signal, onDelta, onState, stream, kind = 'other' }) {
		const config = describe();
		if (!config.ready) {
			throw new AIError(t('status.noKey'), { code: 'no-key' });
		}
		if (config.isMock) {
			const text = M.Mock.chat({ messages, onDelta, signal, json });
			recordUsage({ messages, output: text, kind });
			return text;
		}

		const controller = new M.Util.AbortController();
		ACTIVE.add(controller);
		if (signal) {
			if (signal.aborted) {
				controller.abort();
			}
			else {
				signal.addEventListener('abort', () => controller.abort(), { once: true });
			}
		}

		const useStream = stream ?? config.stream;
		const apiKey = M.Prefs.getString('apiKey', '');
		const headers = { 'Content-Type': 'application/json' };
		if (config.id !== 'ollama' || apiKey) {
			headers.Authorization = `Bearer ${apiKey}`;
		}
		if (config.id === 'openrouter') {
			headers['HTTP-Referer'] = 'https://www.zotero.org';
			headers['X-Title'] = 'Moonlit Reader';
		}

		const attempt = async (withJsonMode, withUsage, streamOverride, maxTokensOverride) => {
			const streaming = streamOverride ?? useStream;
			const body = {
				model: config.model,
				messages,
				temperature: temperature ?? M.Prefs.getFloat('temperature', 0.3),
				stream: streaming
			};
			const maxOut = maxTokensOverride ?? maxTokens ?? M.Prefs.getInt('maxTokens', 8192);
			if (maxOut > 0) {
				body.max_tokens = maxOut;
			}
			if (withJsonMode) {
				body.response_format = { type: 'json_object' };
			}
			if (streaming && withUsage) {
				body.stream_options = { include_usage: true };
			}
			const url = endpoint(config.baseURL);
			await respectRateLimit();
			M.Log.debug('POST', url, 'model=', config.model, 'stream=', streaming, 'kind=', kind);
			const result = await request({
				url,
				headers,
				body: JSON.stringify(body),
				onDelta,
				controller,
				watch: streaming
			});

			if (streaming) {
				if (!result.text.trim()) {
					const finish = result.finishReason || '';
					throw new AIError(t('error.empty'), {
						code: 'empty',
						reasoning: result.reasoning,
						lengthStopped: finish === 'length'
					});
				}
				recordUsage({ usage: result.usage, messages, output: result.text, kind });
				return result.text;
			}

			let data;
			try {
				data = JSON.parse(result.raw);
			}
			catch (e) {
				throw new AIError(`${t('error.empty')} — ${String(result.raw).slice(0, 200)}`, { code: 'parse' });
			}
			const choice = data.choices?.[0] || {};
			const message = choice.message || {};
			const content = message.content ?? choice.text ?? '';
			if (!content || !String(content).trim()) {
				// Reasoning models (deepseek-r1, o-series, Qwen-thinking…) put their
				// chain of thought in `reasoning_content`; with a small output budget
				// the answer never starts and the reply looks empty.
				const reasoning = message.reasoning_content || message.reasoning || '';
				throw new AIError(t('error.empty'), {
					code: 'empty',
					reasoning,
					lengthStopped: choice.finish_reason === 'length' || !!reasoning,
					usage: data.usage
				});
			}
			onDelta?.(content, content);
			recordUsage({ usage: data.usage, messages, output: content, kind });
			return content;
		};

		const usedEndpoint = endpoint(config.baseURL);
		try {
			// A small bounded retry ladder. Each rung fixes a specific real-world
			// failure instead of leaving the caller staring at a frozen 0 %:
			//   1. streaming stalls behind a proxy          -> retry without streaming
			//   2. reasoning model eats the output budget   -> retry with a bigger one
			//   3. provider rejects response_format/usage   -> retry without them
			let streaming = useStream;
			let jsonMode = !!json;
			let withUsage = true;
			let budget;
			let lastError;
			// Each rung fixes one real failure and may only be taken once, so a
			// persistent problem still surfaces instead of looping forever:
			//   1. throttling or a 5xx from the gateway   -> wait, then retry
			//   2. streaming stalls behind a proxy        -> retry without streaming
			//   3. reasoning model eats the budget        -> retry with a bigger one
			//   4. provider rejects response_format/usage -> retry without them
			let rateRetries = 0;
			for (let rung = 0; rung < 6; rung++) {
				try {
					return await attempt(jsonMode, withUsage, streaming, budget);
				}
				catch (e) {
					lastError = e;
					if (!e.endpoint) {
						e.endpoint = usedEndpoint;
					}
					if (signal?.aborted) {
						throw e;
					}
					const throttled = e.status === 429 || (e.status >= 500 && e.status !== 501);
					if (throttled && rateRetries < 3) {
						rateRetries++;
						const wait = Math.min(30000, Math.max(800, e.retryAfter || 0, 1000 * 2 ** (rateRetries - 1)));
						M.Log.info('request throttled, waiting before the retry', {
							status: e.status,
							wait,
							attempt: rateRetries
						});
						onState?.('rateLimited', { seconds: Math.max(1, Math.round(wait / 1000)), attempt: rateRetries });
						await M.Util.sleep(wait);
						continue;
					}
					if ((e.code === 'stall' || e.code === 'network') && streaming) {
						M.Log.info('stream unusable, retrying without streaming', e.code);
						onState?.('fallback', e);
						streaming = false;
						withUsage = false;
						continue;
					}
					if (e.code === 'empty' && e.lengthStopped) {
						const base = budget ?? maxTokens ?? M.Prefs.getInt('maxTokens', 8192);
						budget = Math.min(32768, Math.max(2048, base) * 2);
						M.Log.info('empty answer, retrying with a larger output budget', budget);
						onState?.('bigger', budget);
						streaming = false;
						withUsage = false;
						jsonMode = false;
						continue;
					}
					if ((e.status === 400 || e.status === 422) && jsonMode) {
						M.Log.debug('retrying without optional params', e.message);
						jsonMode = false;
						withUsage = false;
						continue;
					}
					throw e;
				}
			}
			const failure = lastError || new AIError(t('error.empty'), { code: 'empty' });
			failure.endpoint = failure.endpoint || usedEndpoint;
			throw failure;
		}
		finally {
			ACTIVE.delete(controller);
		}

	}

	/** Convenience wrapper for a single system+user prompt. */
	async function complete({ system, prompt, json, onDelta, onState, signal, temperature, maxTokens, stream, kind }) {
		const messages = [];
		if (system) {
			messages.push({ role: 'system', content: system });
		}
		messages.push({ role: 'user', content: prompt });
		return chat({ messages, json, onDelta, onState, signal, temperature, maxTokens, stream, kind });
	}

	/** Which transport the next request will use; logged at startup. */
	function describeTransport() {
		return {
			transport: transportName(),
			hasFetch: typeof fetch === 'function',
			hasStream: typeof ReadableStream === 'function',
			hasTextDecoder: typeof TextDecoder === 'function'
		};
	}

	async function testConnection() {
		const started = Date.now();
		try {
			const text = await chat({
				messages: [
					{ role: 'system', content: 'You are a helpful assistant. Reply briefly.' },
					{ role: 'user', content: 'Reply with exactly: OK' }
				],
				temperature: 0,
				maxTokens: 16,
				stream: false
			});
			return { ok: true, message: String(text).trim().slice(0, 80), latency: Date.now() - started };
		}
		catch (e) {
			return { ok: false, message: e.message, latency: Date.now() - started };
		}
	}

	function abortAll() {
		for (const controller of ACTIVE) {
			try {
				controller.abort();
			}
			catch (e) {
				// ignore
			}
		}
		ACTIVE.clear();
	}

	/** Parse a JSON object/array out of a model reply that may contain fences. */
	function parseJson(text) {
		const source = String(text || '').trim();
		const direct = tryParse(source);
		if (direct !== undefined) {
			return direct;
		}
		const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
		if (fenced) {
			const parsed = tryParse(fenced[1].trim());
			if (parsed !== undefined) {
				return parsed;
			}
		}
		const start = source.search(/[[{]/);
		if (start !== -1) {
			const lastArray = source.lastIndexOf(']');
			const lastObject = source.lastIndexOf('}');
			const end = Math.max(lastArray, lastObject);
			if (end > start) {
				const parsed = tryParse(source.slice(start, end + 1));
				if (parsed !== undefined) {
					return parsed;
				}
			}
		}
		return undefined;
	}

	function tryParse(text) {
		try {
			return JSON.parse(text);
		}
		catch (e) {
			return undefined;
		}
	}

	M.AI = {
		AIError,
		chat,
		complete,
		describe,
		describeTransport,
		isConfigured,
		testConnection,
		abortAll,
		parseJson,
		endpoint
	};
})();
