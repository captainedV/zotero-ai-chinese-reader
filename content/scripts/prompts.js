/**
 * Prompt construction for the three AI features.
 *
 * Every prompt starts with a `[[TASK:...]]` marker so the built-in demo
 * provider can answer without a real model, and so prompts stay easy to debug.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	const TARGET_LANGUAGES = {
		'zh-CN': { label: '简体中文', english: 'Simplified Chinese' },
		'zh-TW': { label: '繁體中文', english: 'Traditional Chinese' },
		'en-US': { label: 'English', english: 'English' },
		'ja-JP': { label: '日本語', english: 'Japanese' },
		'ko-KR': { label: '한국어', english: 'Korean' },
		'de-DE': { label: 'Deutsch', english: 'German' },
		'fr-FR': { label: 'Français', english: 'French' }
	};

	function targetLanguage() {
		const code = M.Prefs.getString('targetLang', 'zh-CN') || 'zh-CN';
		return TARGET_LANGUAGES[code] ? code : 'zh-CN';
	}

	function languageName(code) {
		const entry = TARGET_LANGUAGES[code] || TARGET_LANGUAGES['zh-CN'];
		return { code, label: entry.label, english: entry.english };
	}

	function isChinese(code) {
		return String(code).startsWith('zh');
	}

	function customPrompt(key) {
		const value = M.Prefs.getString(key, '');
		return value && value.trim() ? value.trim() : '';
	}

	const HIGHLIGHT_TYPES = {
		claim: { color: '#ffd400', label: '核心论断' },
		method: { color: '#2ea8e5', label: '方法' },
		result: { color: '#5fb236', label: '结果' },
		limitation: { color: '#ff6666', label: '局限' },
		background: { color: '#a28ae5', label: '背景' }
	};

	/** Translate a batch of sentences inside one paragraph. */
	function buildTranslatePrompt({ sentences, paragraphText, targetLang, index, total }) {
		const lang = languageName(targetLang || targetLanguage());
		const chinese = isChinese(lang.code);
		const custom = customPrompt('promptTranslate');
		const system = custom || [
			`You are a senior academic translator specialised in peer-reviewed papers.`,
			`Translate the sentences from the source paper into ${lang.english} (${lang.label}).`,
			chinese
				? '要求：\n1. 忠实原意，术语使用领域内通行中文译名，首次出现的关键术语保留英文原词，如“扩散模型（diffusion model）”。\n2. 保持学术语体，语句通顺，不要逐词硬译，不要添加原文没有的解释。\n3. 保留数学符号、变量名、引用编号、图号、表号、URL 原样。\n4. 每条译文与输入 id 一一对应，不得合并或拆分句子。\n5. 只输出 JSON，不要输出解释或 Markdown 代码块。'
				: 'Requirements:\n1. Stay faithful, keep terminology consistent, and keep the first mention of a key term in English.\n2. Use natural academic prose; do not add explanations that are not in the source.\n3. Preserve math symbols, variable names, citation numbers, figure/table numbers and URLs verbatim.\n4. Return exactly one translation per input id; never merge or split sentences.\n5. Output JSON only, with no commentary or Markdown fences.'
		].join('\n\n');

		const payload = {
			paragraphIndex: index,
			totalParagraphs: total,
			context: (paragraphText || '').slice(0, 1200),
			sentences
		};
		const prompt = [
			'[[TASK:translate]]',
			`Source paragraph (context only, do not translate it directly):\n${payload.context}`,
			'',
			'Sentences to translate:',
			JSON.stringify(payload.sentences),
			'',
			'Reply with JSON: {"translations":[{"id":"<same id>","text":"<translation>"}]}'
		].join('\n');
		return { system, prompt, json: true };
	}

	/** Translate a whole paragraph in one shot (paragraph granularity mode). */
	function buildTranslateParagraphPrompt({ paragraphText, targetLang, index, total }) {
		const lang = languageName(targetLang || targetLanguage());
		const chinese = isChinese(lang.code);
		const custom = customPrompt('promptTranslate');
		const system = custom || [
			'You are a senior academic translator specialised in peer-reviewed papers.',
			`Translate the paragraph into ${lang.english} (${lang.label}).`,
			chinese
				? '要求：忠实原意、术语准确、语句通顺；保留数字、公式、引用编号与图表编号；只输出译文本身，不要任何解释。'
				: 'Stay faithful, keep terminology and numbers intact, and output only the translation.'
		].join('\n\n');
		const prompt = [
			'[[TASK:translate]]',
			`Paragraph ${index + 1}/${total}:`,
			paragraphText,
			'',
			'Reply with JSON: {"translations":[{"id":"paragraph","text":"<translation>"}]}'
		].join('\n');
		return { system, prompt, json: true };
	}

	const BATCH_SYSTEM_ZH = [
		'你是一位资深学术论文译者，熟悉计算机科学与工程领域的术语与行文习惯。',
		'任务：把“待翻译条目”逐条翻译成目标语言，并对齐原文的语句边界。',
		'上下文（论文标题、当前章节、前后段落）只用于消除歧义、统一术语与指代，**不要翻译上下文本身**。',
		'要求：\n' +
		'1. 与上下文中的术语保持一致；关键术语首次出现时保留英文原词，如“多头潜在注意力（Multi-head Latent Attention, MLA）”。\n' +
		'2. 忠实原意，学术语体，通顺可读；不要添加原文没有的解释、不要合并或拆分条目。\n' +
		'3. 数学符号、变量名、公式片段、引用编号、图表编号、URL、代码标识符保持原样。\n' +
		'4. 条目 id 必须原样返回，一条都不能少、不能多。\n' +
		'5. 只输出 JSON，不要输出 Markdown 代码块或任何解释。'
	].join('\n');

	const BATCH_SYSTEM_EN = [
		'You are a senior academic translator who knows the terminology and register of peer-reviewed papers.',
		'Task: translate every item in "Items to translate" into the target language, keeping the original sentence boundaries.',
		'The context (paper title, current section, neighbouring paragraphs) is only there to disambiguate meaning and keep terminology consistent — never translate the context itself.',
		'Requirements:\n' +
		'1. Keep terminology consistent with the context; on first use keep key terms in the source language in brackets.\n' +
		'2. Stay faithful, use natural academic prose, never add explanations, never merge or split items.\n' +
		'3. Preserve math symbols, variable names, citation numbers, figure/table numbers, URLs and identifiers verbatim.\n' +
		'4. Return every input id exactly once; no extras, none missing.\n' +
		'5. JSON only — no Markdown fences, no commentary.'
	].join('\n');

	/** How much of a neighbouring paragraph is enough to fix the context. */
	function trimContext(text, limit) {
		const source = String(text || '').replace(/\s+/g, ' ').trim();
		if (source.length <= limit) {
			return source;
		}
		return `${source.slice(0, limit)}…`;
	}

	/**
	 * Translate several paragraphs (or sentences) in one request.
	 *
	 * One request per paragraph wastes the model's context window and makes it
	 * invent terminology for every fragment; batching consecutive paragraphs with
	 * their surroundings gives it the same picture a human translator has.
	 *
	 * @param {Object} params
	 * @param {Array<{id:string,text:string}>} params.units items to translate, in reading order
	 * @param {{title?:string, section?:string, before?:string, after?:string}} params.context
	 * @param {string} [params.targetLang]
	 * @param {number} [params.contextChars] cap for the neighbouring text
	 */
	function buildTranslateBatchPrompt({ units, context = {}, targetLang, contextChars = 900 }) {
		const lang = languageName(targetLang || targetLanguage());
		const chinese = isChinese(lang.code);
		const custom = customPrompt('promptTranslate');
		const system = custom || (chinese ? BATCH_SYSTEM_ZH : BATCH_SYSTEM_EN);
		const lines = ['[[TASK:translate]]', `Target language: ${lang.english} (${lang.label})`, ''];
		if (context.title) {
			lines.push(`Paper title: ${trimContext(context.title, 200)}`);
		}
		if (context.section) {
			lines.push(`Current section: ${trimContext(context.section, 120)}`);
		}
		if (context.before) {
			lines.push(`Preceding paragraph (context only, do not translate):\n${trimContext(context.before, contextChars)}`);
		}
		if (context.after) {
			lines.push(`Following paragraph (context only, do not translate):\n${trimContext(context.after, contextChars)}`);
		}
		lines.push('');
		lines.push(`Items to translate (${units.length}, JSON array of {id,text}, in reading order):`);
		lines.push(JSON.stringify(units));
		lines.push('');
		lines.push('Reply with JSON: {"translations":[{"id":"<same id>","text":"<translation>"}]}');
		return { system, prompt: lines.join('\n'), json: true };
	}

	/**
	 * Pull `id → text` out of whatever the model replied with.
	 *
	 * Models wrap the array differently (bare array, {translations:…}, {data:…},
	 * or an object keyed by id), and a batch is only useful if every id survives.
	 * Anything unrecognisable returns an empty map so the caller can retry with a
	 * smaller batch instead of writing half a translation.
	 */
	function parseBatchTranslations(raw, expectedIds) {
		const ids = new Set((expectedIds || []).map(String));
		const map = new Map();
		const push = (id, text) => {
			if (id === undefined || id === null || typeof text !== 'string') {
				return;
			}
			const key = String(id);
			const value = text.trim();
			if (!value || (ids.size && !ids.has(key))) {
				return;
			}
			map.set(key, value);
		};
		const walk = (value, depth = 0) => {
			if (!value || depth > 4) {
				return;
			}
			if (Array.isArray(value)) {
				for (const item of value) {
					if (item && typeof item === 'object') {
						const id = item.id ?? item.key ?? item.sentence_id;
						const text = item.text ?? item.translation ?? item.target ?? item.content;
						if (id !== undefined && text !== undefined) {
							push(id, text);
							continue;
						}
					}
					walk(item, depth + 1);
				}
				return;
			}
			if (typeof value === 'object') {
				for (const [key, item] of Object.entries(value)) {
					if (typeof item === 'string') {
						push(key, item);
					}
					else if (item && typeof item === 'object') {
						const text = item.text ?? item.translation ?? item.target ?? item.content;
						if (text !== undefined) {
							push(item.id ?? key, text);
						}
						else {
							walk(item, depth + 1);
						}
					}
					else {
						walk(item, depth + 1);
					}
				}
			}
		};
		let parsed;
		try {
			parsed = M.AI?.parseJson ? M.AI.parseJson(raw) : JSON.parse(raw);
		}
		catch (e) {
			return map;
		}
		walk(parsed);
		return map;
	}

	/** Map step of the summary: bullet notes for one chunk of the paper. */
	function buildSummaryChunkPrompt({ chunk, meta, chunkIndex, chunkCount, targetLang }) {
		const lang = languageName(targetLang || targetLanguage());
		const chinese = isChinese(lang.code);
		const system = [
			'You are an expert research assistant who reads papers carefully.',
			`Extract factual notes in ${lang.english} (${lang.label}) from the given excerpt.`,
			chinese
				? '只输出 5-9 条要点，每条一行，以 “- ” 开头；覆盖研究问题、方法细节、实验设置、关键数字结果、作者明确说明的局限。不要编造原文没有的内容。'
				: 'Output 5-9 bullet lines starting with "- "; cover the problem, method details, experimental setup, key numeric results and stated limitations. Never invent facts.'
		].join('\n\n');
		const prompt = [
			'[[TASK:summary-notes]]',
			meta ? `Paper metadata:\n${meta}` : '',
			`Excerpt ${chunkIndex + 1}/${chunkCount}:`,
			chunk
		].filter(Boolean).join('\n\n');
		return { system, prompt, json: false };
	}

	/** Reduce step: final structured summary from the collected notes. */
	function buildSummaryFinalPrompt({ notes, meta, targetLang }) {
		const lang = languageName(targetLang || targetLanguage());
		const chinese = isChinese(lang.code);
		const custom = customPrompt('promptSummary');
		const sections = chinese
			? '## 一句话总结\n## 研究问题\n## 核心方法\n## 主要贡献\n## 关键结果\n## 局限与展望\n## 关键术语'
			: '## One-sentence summary\n## Problem\n## Method\n## Contributions\n## Key results\n## Limitations\n## Key terms';
		const system = custom || [
			'You are a senior researcher writing a crisp briefing of a paper for a colleague.',
			`Write in ${lang.english} (${lang.label}) using Markdown.`,
			chinese
				? `严格使用以下小节标题（不要增删）：\n${sections}\n\n要求：每节 1-4 句或最多 4 个要点；“一句话总结”不超过 40 字；出现关键术语时保留英文原词；不要编造未提供的事实；不要输出小节以外的开场白。`
				: `Use exactly these sections:\n${sections}\n\nKeep each section to 1-4 sentences or up to 4 bullets; keep the one-sentence summary under 40 words; never invent facts.`
		].join('\n\n');
		const prompt = [
			'[[TASK:summary]]',
			meta ? `Paper metadata:\n${meta}` : '',
			'Notes extracted from the paper:',
			notes
		].filter(Boolean).join('\n\n');
		return { system, prompt, json: false };
	}

	/** Pick the most important sentences and quote them verbatim. */
	function buildHighlightPrompt({ text, meta, targetLang, maxItems }) {
		const lang = languageName(targetLang || targetLanguage());
		const chinese = isChinese(lang.code);
		const custom = customPrompt('promptHighlight');
		const types = Object.entries(HIGHLIGHT_TYPES)
			.map(([key, value]) => `${key}（${value.label}）`)
			.join('、');
		const system = custom || [
			'You annotate research papers for a busy reader.',
			`Select the ${maxItems || 12} most important passages and comment on them in ${lang.english} (${lang.label}).`,
			chinese
				? '规则：\n1. quote 必须是从原文逐字复制的连续片段，长度 12-240 个字符，不要改写、不要加省略号、不要跨段落。\n2. type 取值：' + types + '。\n3. note 是一句话点评（不超过 40 字），说明这段话为什么重要。\n4. 覆盖不同部分：问题、方法、结果、局限各至少 1 条。\n5. 只输出 JSON。'
				: 'Rules:\n1. `quote` must be a verbatim contiguous substring of the paper text, 12-240 characters, no rewriting, no ellipses, no cross-paragraph spans.\n2. `type` is one of: ' + types + '.\n3. `note` is one short sentence (<= 25 words) explaining why it matters.\n4. Cover the problem, method, results and limitations.\n5. Output JSON only.'
		].join('\n\n');
		const prompt = [
			'[[TASK:highlight]]',
			meta ? `Paper metadata:\n${meta}` : '',
			'Full text (may be truncated):',
			text,
			'',
			'Reply with JSON: {"items":[{"quote":"...","type":"claim","note":"...","color":"#ffd400"}]}'
		].filter(Boolean).join('\n');
		return { system, prompt, json: true };
	}

	M.Prompts = {
		TARGET_LANGUAGES,
		HIGHLIGHT_TYPES,
		targetLanguage,
		languageName,
		isChinese,
		buildTranslatePrompt,
		buildTranslateParagraphPrompt,
		buildTranslateBatchPrompt,
		parseBatchTranslations,
		buildSummaryChunkPrompt,
		buildSummaryFinalPrompt,
		buildHighlightPrompt
	};
})();
