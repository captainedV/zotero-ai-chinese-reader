/**
 * Built-in demo provider.
 *
 * Answers the plugin's own prompts locally so the UI (and the automated
 * self-test) can be exercised without an API key. Output is intentionally
 * simple but shaped exactly like a real model reply.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	const DICTIONARY = [
		[/\bthis paper\b/gi, '本文'],
		[/\bwe propose\b/gi, '我们提出'],
		[/\bpropose\b/gi, '提出'],
		[/\bmethod(s)?\b/gi, '方法'],
		[/\bmodel(s)?\b/gi, '模型'],
		[/\bresults?\b/gi, '结果'],
		[/\bexperiments?\b/gi, '实验'],
		[/\bdataset(s)?\b/gi, '数据集'],
		[/\bperformance\b/gi, '性能'],
		[/\btranslation\b/gi, '翻译'],
		[/\bimage(s)?\b/gi, '图像'],
		[/\bnetwork(s)?\b/gi, '网络'],
		[/\btraining\b/gi, '训练'],
		[/\bstate-of-the-art\b/gi, '最先进水平']
	];

	function pseudoTranslate(text, langCode) {
		if (String(langCode || '').startsWith('zh')) {
			let out = String(text || '');
			for (const [re, rep] of DICTIONARY) {
				out = out.replace(re, rep);
			}
			const letters = out.replace(/[^\u4e00-\u9fff]/g, '');
			if (letters.length < out.length * 0.3) {
				out = `【演示译文】${out}`;
			}
			else {
				out = `【演示译文】${out}`;
			}
			return out;
		}
		return `[demo] ${text}`;
	}

	function extractSentences(prompt) {
		// The translate prompt embeds `[{"id":...,"text":...}]` right after a header.
		const match = prompt.match(/Sentences to translate:\s*(\[[\s\S]*?\])\s*\n\s*Reply with JSON/);
		if (!match) {
			return null;
		}
		try {
			return JSON.parse(match[1]);
		}
		catch (e) {
			return null;
		}
	}

	function pickQuotes(prompt, count) {
		const body = prompt.split('Full text (may be truncated):')[1] || prompt;
		const sentences = body
			.split(/(?<=[.!?])\s+/)
			.map(s => s.trim())
			.filter(s => s.length >= 40 && s.length <= 240 && /[A-Za-z]/.test(s));
		return sentences.slice(0, count);
	}

	function chunk(text, size = 48) {
		const parts = [];
		for (let i = 0; i < text.length; i += size) {
			parts.push(text.slice(i, i + size));
		}
		return parts;
	}

	function emit(text, onDelta, signal, speed = 12) {
		return new Promise((resolve, reject) => {
			const pieces = chunk(text);
			let i = 0;
			let acc = '';
			const step = () => {
				if (signal?.aborted) {
					reject(new M.AI.AIError('aborted', { code: 'aborted' }));
					return;
				}
				if (i >= pieces.length) {
					resolve(acc);
					return;
				}
				acc += pieces[i];
				onDelta?.(pieces[i], acc);
				i++;
				setTimeout(step, speed);
			};
			step();
		});
	}

	async function chat({ messages, onDelta, signal, json }) {
		const prompt = (messages || []).filter(m => m.role === 'user').map(m => m.content).join('\n\n');
		const system = (messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n\n');
		const lang = M.Prefs.getString('targetLang', 'zh-CN');

		if (prompt.includes('[[TASK:translate]]')) {
			const sentences = extractSentences(prompt);
			let payload;
			if (sentences) {
				payload = {
					translations: sentences.map(item => ({
						id: item.id,
						text: pseudoTranslate(item.text, lang)
					}))
				};
			}
			else {
				const paragraph = prompt.split(/Paragraph \d+\/\d+:/)[1]?.split('Reply with JSON')[0]?.trim() || '';
				payload = { translations: [{ id: 'paragraph', text: pseudoTranslate(paragraph, lang) }] };
			}
			return emit(JSON.stringify(payload), onDelta, signal);
		}

		if (prompt.includes('[[TASK:summary-notes]]')) {
			const excerpt = prompt.split(/Excerpt \d+\/\d+:/)[1] || '';
			const first = excerpt.split(/(?<=[.!?])\s+/).find(s => s.trim().length > 30) || excerpt.slice(0, 160);
			const notes = [
				`- 演示要点：该片段主要讨论「${first.trim().slice(0, 90)}…」`,
				'- 演示要点：作者给出了方法的关键设计与其动机。',
				'- 演示要点：实验在多个基准数据集上进行，并报告了量化指标。'
			].join('\n');
			return emit(notes, onDelta, signal);
		}

		if (prompt.includes('[[TASK:summary]]')) {
			const isZh = String(lang).startsWith('zh');
			const text = isZh
				? [
					'## 一句话总结',
					'本文提出一种新的建模思路，在多个基准上取得更优效果（演示模式输出）。',
					'',
					'## 研究问题',
					'- 如何在保持输出一致性的同时提升生成质量，是本文关注的核心问题。',
					'',
					'## 核心方法',
					'- 使用双近似器结构分别建模前向与反向过程。',
					'- 通过桥过程约束降低方差，减少随机性带来的不稳定。',
					'',
					'## 主要贡献',
					'- 提出确定性生成框架，显著降低输出方差。',
					'- 在图像生成与超分辨率任务上验证有效性。',
					'',
					'## 关键结果',
					'- 演示模式未接入真实模型，此处为示例数据。',
					'',
					'## 局限与展望',
					'- 演示模式无法分析真实结果，请配置 API Key 后重新生成。',
					'',
					'## 关键术语',
					'- **Brownian bridge**：布朗桥过程',
					'- **Dual approximator**：双近似器'
				].join('\n')
				: [
					'## One-sentence summary',
					'Demo output — configure an API key for a real summary.',
					'',
					'## Problem',
					'- Demo mode cannot read the paper.',
					'',
					'## Method',
					'- Demo bullet one.',
					'- Demo bullet two.',
					'',
					'## Contributions',
					'- Demo bullet.',
					'',
					'## Key results',
					'- Demo bullet.',
					'',
					'## Limitations',
					'- Demo bullet.',
					'',
					'## Key terms',
					'- **Term**: explanation'
				].join('\n');
			// Echo metadata when available so the demo summary still looks anchored.
			const meta = prompt.match(/Paper metadata:\s*([\s\S]*?)\n\n/);
			const prefix = meta && meta[1] ? `> ${meta[1].trim().split('\n')[0]}\n\n` : '';
			return emit(prefix + text, onDelta, signal);
		}

		if (prompt.includes('[[TASK:highlight]]')) {
			const quotes = pickQuotes(prompt, 10);
			const types = ['claim', 'method', 'result', 'limitation', 'background'];
			const items = quotes.map((quote, i) => ({
				quote,
				type: types[i % types.length],
				note: `演示点评：这是第 ${i + 1} 段关键内容。`,
				color: M.Prompts.HIGHLIGHT_TYPES[types[i % types.length]].color
			}));
			return emit(JSON.stringify({ items }), onDelta, signal);
		}

		const fallback = json ? '{}' : '演示模式：未识别的任务。';
		void system;
		return emit(fallback, onDelta, signal);
	}

	M.Mock = { chat, pseudoTranslate, pickQuotes };
})();
