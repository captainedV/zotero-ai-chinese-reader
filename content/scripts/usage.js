/**
 * Token accounting for the AI work done on one attachment.
 *
 * Providers report usage in the response (`usage.prompt_tokens` /
 * `usage.completion_tokens`); when a provider omits it (many proxies drop it in
 * streaming mode) we estimate from character counts and flag the number as
 * approximate. Totals are persisted with the rest of the attachment cache so
 * reopening a paper shows the same figure.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	/** Average characters per token, roughly: latin ≈ 4, CJK ≈ 1.6. */
	function estimateTokens(text) {
		const string = String(text ?? '');
		if (!string) {
			return 0;
		}
		let cjk = 0;
		for (const char of string) {
			const code = char.codePointAt(0);
			if (
				(code >= 0x3000 && code <= 0x9fff)
				|| (code >= 0xf900 && code <= 0xfaff)
				|| (code >= 0xff00 && code <= 0xffef)
			) {
				cjk++;
			}
		}
		const latin = string.length - cjk;
		return Math.round(cjk / 1.6 + latin / 4);
	}

	const KINDS = ['translate', 'summary', 'highlight', 'selection', 'other'];

	function blank() {
		return {
			prompt: 0,
			completion: 0,
			calls: 0,
			estimated: false,
			byKind: Object.fromEntries(KINDS.map(kind => [kind, { prompt: 0, completion: 0, calls: 0 }]))
		};
	}

	const listeners = new Set();
	let state = blank();
	let currentKey = null;

	function normalize(raw) {
		const base = blank();
		if (!raw || typeof raw !== 'object') {
			return base;
		}
		base.prompt = Math.max(0, Number(raw.prompt) || 0);
		base.completion = Math.max(0, Number(raw.completion) || 0);
		base.calls = Math.max(0, Math.round(Number(raw.calls) || 0));
		base.estimated = !!raw.estimated;
		for (const kind of KINDS) {
			const entry = raw.byKind?.[kind];
			if (entry) {
				base.byKind[kind] = {
					prompt: Math.max(0, Number(entry.prompt) || 0),
					completion: Math.max(0, Number(entry.completion) || 0),
					calls: Math.max(0, Math.round(Number(entry.calls) || 0))
				};
			}
		}
		return base;
	}

	function emit() {
		for (const listener of listeners) {
			try {
				listener(state, currentKey);
			}
			catch (e) {
				M.Log.debug('usage listener failed', e);
			}
		}
	}

	/**
	 * Bind to an attachment. Usage is read from the attachment's cache record and
	 * written back through the same record, so it survives restarts.
	 */
	function attach(attachmentKey, record) {
		currentKey = attachmentKey || null;
		state = normalize(record?.usage);
		if (record) {
			record.usage = state;
		}
		emit();
		return state;
	}

	function add({ prompt = 0, completion = 0, estimated = false, kind = 'other' } = {}) {
		const bucket = KINDS.includes(kind) ? kind : 'other';
		const promptTokens = Math.max(0, Math.round(Number(prompt) || 0));
		const completionTokens = Math.max(0, Math.round(Number(completion) || 0));
		state.prompt += promptTokens;
		state.completion += completionTokens;
		state.calls += 1;
		state.estimated = state.estimated || !!estimated;
		const slice = state.byKind[bucket] || (state.byKind[bucket] = { prompt: 0, completion: 0, calls: 0 });
		slice.prompt += promptTokens;
		slice.completion += completionTokens;
		slice.calls += 1;
		emit();
		return state;
	}

	/** Format a token count the way people read it: 916 · 12.3k · 1.4M. */
	function formatTokens(value) {
		const number = Number(value) || 0;
		if (number < 1000) {
			return String(number);
		}
		if (number < 1000000) {
			return `${(number / 1000).toFixed(number < 10000 ? 1 : 0)}k`;
		}
		return `${(number / 1000000).toFixed(1)}M`;
	}

	function summary() {
		const total = state.prompt + state.completion;
		return {
			...state,
			total,
			label: M.I18n.t('usage.summary', {
				in: formatTokens(state.prompt),
				out: formatTokens(state.completion),
				total: formatTokens(total)
			}),
			kinds: KINDS.filter(kind => state.byKind[kind]?.calls)
				.map(kind => ({
					kind,
					label: M.I18n.t(`usage.kind.${kind}`),
					...state.byKind[kind]
				}))
		};
	}

	function reset(record) {
		state = blank();
		if (record) {
			record.usage = state;
		}
		emit();
		return state;
	}

	M.Usage = {
		KINDS,
		attach,
		add,
		reset,
		summary,
		formatTokens,
		estimateTokens,
		onChange(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		get key() {
			return currentKey;
		},
		get state() {
			return state;
		}
	};
})();
