/* global IOUtils, PathUtils */

/**
 * Per-attachment result cache (translation, summary, AI highlights) stored as
 * JSON under `<data directory>/moonlit/` so results survive restarts and cost
 * nothing to re-show.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	const VERSION = 3;

	/**
	 * Results are provider-specific: a demo translation must never be shown as a
	 * real one after the user adds an API key, and switching models should not
	 * resurrect output from the previous one.
	 */
	function signature() {
		let provider = { id: 'unknown', model: '' };
		try {
			provider = M.AI.describe();
		}
		catch (e) {
			// AI module not initialised yet; keep the cache disabled-ish value
		}
		return [
			VERSION,
			provider.id || 'unknown',
			provider.model || '',
			M.Prompts.targetLanguage(),
			M.Prefs.getString('granularity', 'sentence')
		].join('|');
	}
	const memory = new Map();
	const pending = new Map();

	function fileName(attachmentKey) {
		return `${attachmentKey}.json`;
	}

	function pathFor(attachmentKey) {
		return PathUtils.join(M.Paths.dataDir(), fileName(attachmentKey));
	}

	function emptyRecord(attachmentKey) {
		return {
			version: VERSION,
			attachmentKey,
			fingerprint: signature(),
			targetLang: M.Prompts.targetLanguage(),
			model: M.AI.describe().model,
			updatedAt: 0,
			translation: {},
			summary: null,
			highlights: [],
			highlightRunId: null
		};
	}

	async function load(attachmentKey) {
		if (!attachmentKey) {
			return null;
		}
		if (memory.has(attachmentKey)) {
			return memory.get(attachmentKey);
		}
		let record;
		try {
			const raw = await IOUtils.readUTF8(pathFor(attachmentKey));
			record = JSON.parse(raw);
			if (!record || record.version !== VERSION || record.fingerprint !== signature()) {
				record = null;
			}
		}
		catch (e) {
			record = null;
		}
		const value = record || emptyRecord(attachmentKey);
		memory.set(attachmentKey, value);
		return value;
	}

	async function save(attachmentKey, record) {
		if (!attachmentKey || !record) {
			return;
		}
		record.updatedAt = Date.now();
		memory.set(attachmentKey, record);
		if (pending.has(attachmentKey)) {
			clearTimeout(pending.get(attachmentKey));
		}
		pending.set(attachmentKey, setTimeout(async () => {
			pending.delete(attachmentKey);
			try {
				await M.Paths.ensureDataDir();
				await IOUtils.writeUTF8(pathFor(attachmentKey), JSON.stringify(record));
			}
			catch (e) {
				M.Log.error('failed to persist cache', e);
			}
		}, 400));
	}

	async function flush(attachmentKey) {
		const timer = pending.get(attachmentKey);
		if (timer) {
			clearTimeout(timer);
			pending.delete(attachmentKey);
		}
		const record = memory.get(attachmentKey);
		if (!record) {
			return;
		}
		try {
			await M.Paths.ensureDataDir();
			await IOUtils.writeUTF8(pathFor(attachmentKey), JSON.stringify(record));
		}
		catch (e) {
			M.Log.error('failed to flush cache', e);
		}
	}

	async function clear(attachmentKey) {
		memory.delete(attachmentKey);
		try {
			await IOUtils.remove(pathFor(attachmentKey), { ignoreAbsent: true });
		}
		catch (e) {
			M.Log.debug('cache remove failed', e);
		}
	}

	M.Cache = { VERSION, load, save, flush, clear, emptyRecord, pathFor };
})();
