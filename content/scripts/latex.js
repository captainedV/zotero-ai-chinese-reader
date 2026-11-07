/* eslint-disable no-unused-vars */
/**
 * Render the math notation that academic PDFs and model output carry.
 *
 * A translated paragraph is full of things like `$x_{i}^{2}$`, `\alpha`, `\sum`
 * or `\frac{a}{b}`. Painted as plain text the reader sees `x_{i}^{2}`, which is
 * unreadable, and superscripts/subscripts never render at all — the reported
 * complaint. This module turns the common subset into real HTML (`<sup>`, `<sub>`
 * and Unicode symbols) and keeps everything it does not understand verbatim.
 *
 * It never trusts its input: HTML is escaped first, then the substitutions run on
 * the escaped text, so a formula cannot inject markup into the reader.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	const SYMBOLS = {
		alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
		zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
		lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
		tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'ϕ', chi: 'χ', psi: 'ψ', omega: 'ω',
		Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
		Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
		times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', ast: '∗', star: '⋆',
		leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈',
		equiv: '≡', sim: '∼', simeq: '≃', propto: '∝', ll: '≪', gg: '≫',
		in: '∈', notin: '∉', ni: '∋', subset: '⊂', subseteq: '⊆', supset: '⊃',
		supseteq: '⊇', cup: '∪', cap: '∩', emptyset: '∅', forall: '∀', exists: '∃',
		neg: '¬', land: '∧', lor: '∨', oplus: '⊕', otimes: '⊗', perp: '⊥',
		sum: '∑', prod: '∏', coprod: '∐', int: '∫', oint: '∮', partial: '∂',
		nabla: '∇', infty: '∞', aleph: 'ℵ', hbar: 'ℏ', ell: 'ℓ',
		to: '→', rightarrow: '→', leftarrow: '←', leftrightarrow: '↔',
		Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', mapsto: '↦',
		uparrow: '↑', downarrow: '↓', implies: '⟹', iff: '⟺',
		dots: '…', ldots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱',
		prime: '′', degree: '°', angle: '∠', triangle: '△', square: '□',
		langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉',
		mid: '∣', parallel: '∥', backslash: '\\', percent: '%', amp: '&',
		quad: ' ', qquad: '  ', enspace: ' ', thinspace: ' ',
		textendash: '–', textemdash: '—', textbackslash: '\\',
		lbrace: '{', rbrace: '}', vert: '|', Vert: '‖',
		top: 'ᵀ', bot: 'ᵦ', intercal: '⊺', odot: '⊙', ominus: '⊖', oslash: '⊘',
		wedge: '∧', vee: '∨', circ: '∘', bullet: '•', dagger: '†', ddagger: '‡',
		mod: 'mod', bmod: 'mod', colon: ':', cdotsym: '⋯', surd: '√', checkmark: '✓',
		mathsection: '§', S: '§', P: '¶', copyright: '©', pounds: '£', euro: '€',
		leftarrowtail: '↢', hookrightarrow: '↪', twoheadrightarrow: '↠',
		nsim: '≁', doteq: '≐', asymp: '≍', bowtie: '⋈', models: '⊨', vdash: '⊢',
		bigcup: '⋃', bigcap: '⋂', bigoplus: '⨁', bigotimes: '⨂', bigodot: '⨀',
		langle: '⟨', rangle: '⟩', ulcorner: '⌜', urcorner: '⌝', setminus: '∖',
		smallsetminus: '∖', uplus: '⊎', sqcup: '⊔', sqcap: '⊓', triangleq: '≜',
		hbar: 'ℏ', Re: 'ℜ', Im: 'ℑ', wp: '℘', imath: 'ı', jmath: 'ȷ'
	};

	const BLACKBOARD = { R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ', P: 'ℙ', E: '𝔼', H: 'ℍ' };

	const SUP_DIGITS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
	const SUB_DIGITS = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
	// Unicode only has these letters; anything else falls back to <sup>/<sub>.
	const SUP_LETTERS = {
		a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ',
		k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', t: 'ᵗ',
		u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ', T: 'ᵀ'
	};
	const SUB_LETTERS = {
		a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ',
		o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ'
	};
	const SUP_CHARS = new Set([...Object.values(SUP_DIGITS), ...Object.values(SUP_LETTERS)]);
	const SUB_CHARS = new Set([...Object.values(SUB_DIGITS), ...Object.values(SUB_LETTERS)]);

	const ZERO_WIDTH = '\u200b';

	function escapeHtml(text) {
		return String(text)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	/** True when the string carries anything this module can improve. */
	function hasMath(text) {
		const source = String(text || '');
		return /\\[A-Za-z]{2,}|\^\{|_\{|\^[0-9A-Za-z]|_[0-9A-Za-z]|[∈∑∫≤≥≈∝∂∇]/.test(source);
	}

	/**
	 * Convert the simple, safe subset of LaTeX to Unicode.
	 * @param {string} source already HTML-escaped text
	 */
	function symbols(source) {
		let out = source;
		// \mathbb{R} -> ℝ, \mathcal{L} -> ℒ (approximate)
		out = out.replace(/\\mathbb\{([RNZQCPEH])\}/g, (match, letter) => BLACKBOARD[letter] || letter);
		out = out.replace(/\\(?:mathbf|textbf|bf|boldsymbol)\{([^{}]*)\}/g, '<strong>$1</strong>');
		out = out.replace(/\\(?:mathrm|text|textrm|operatorname|mathsf|mathit|mathcal|mathcal|rm|it)\{([^{}]*)\}/g, '$1');
		out = out.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
		out = out.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
		out = out.replace(/\\([A-Za-z]{2,})\b/g, (match, name) => {
			if (Object.prototype.hasOwnProperty.call(SYMBOLS, name)) {
				return SYMBOLS[name];
			}
			return match;
		});
		return out;
	}

	/** `x^{2}` → x², `W_{DQ}` → W<sub>DQ</sub>, `a_i` → a<sub>i</sub>. */
	function scripts(source) {
		// Braced forms first, so `x^{d'_c}` keeps its inner content.
		let out = source.replace(/([_^])\{([^{}]{1,40})\}/g, (match, kind, body) => renderScript(kind, body));
		// Unbraced single tokens: `x^2`, `a_i`, `h_t`.
		out = out.replace(/([_^])([0-9A-Za-z])/g, (match, kind, body) => renderScript(kind, body));
		return out;
	}

	function renderScript(kind, body) {
		const content = String(body || '').replace(/^\s+|\s+$/g, '');
		if (!content) {
			return '';
		}
		const map = kind === '^' ? SUP_DIGITS : SUB_DIGITS;
		const letters = kind === '^' ? SUP_LETTERS : SUB_LETTERS;
		// Use the real Unicode form when every character has one; it survives copy,
		// notes and PDF export far better than markup.
		if ([...content].every(ch => map[ch] || letters[ch])) {
			return [...content].map(ch => map[ch] || letters[ch]).join('');
		}
		return kind === '^' ? `<sup>${content}</sup>` : `<sub>${content}</sub>`;
	}

	/** Turn `$…$`, `\(…\)` and `\[…\]` spans into rendered math. */
	function spans(source) {
		let out = source;
		out = out.replace(/\$\$([^$]{1,400})\$\$/g, (match, body) => ` ${convertMathBody(body)} `);
		out = out.replace(/\$([^$\n]{1,300})\$/g, (match, body) => convertMathBody(body));
		out = out.replace(/\\\(([\s\S]{1,300}?)\\\)/g, (match, body) => convertMathBody(body));
		out = out.replace(/\\\[([\s\S]{1,400}?)\\\]/g, (match, body) => ` ${convertMathBody(body)} `);
		return out;
	}

	function convertMathBody(body) {
		let out = String(body || '').replace(/^\s+|\s+$/g, '');
		// Drop spacing commands that would otherwise show up as stray words.
		out = out.replace(/&#39;|'/g, '\u2032');
		out = out.replace(/\\(?:left|right|big|Big|bigg|Bigg)\b/g, '');
		out = out.replace(/\\[,;:!]/g, ' ');
		return scripts(symbols(out));
	}

	/**
	 * Render a string of model/PDF text with readable math.
	 *
	 * @param {string} text raw text (may contain LaTeX or plain prose)
	 * @returns {string} escaped HTML with `<sup>` / `<sub>` / Unicode symbols
	 */
	function toHtml(text) {
		const escaped = escapeHtml(text);
		let out = spans(escaped);
		out = symbols(out);
		out = scripts(out);
		// `^{`/`_{` that survived (nested braces) must not show raw LaTeX.
		out = out.replace(/\^\{\s*\}/g, '');
		// `^ᵀ` / `_ᵢ`: the command already became a Unicode script, drop the marker.
		out = out.replace(/\^([\u2070-\u209F\u1D2C-\u1D6A])/g, '$1');
		out = out.replace(/_([\u2070-\u209F])/g, '$1');
		return out;
	}

	/** Plain-text variant: Unicode only, no tags (for copy, notes, titles). */
	function toText(text) {
		const html = toHtml(text);
		return html
			.replace(/<sup>([^<]*)<\/sup>/g, (match, body) => [...body]
				.map(ch => SUP_DIGITS[ch] || SUP_LETTERS[ch] || ch).join(''))
			.replace(/<sub>([^<]*)<\/sub>/g, (match, body) => [...body]
				.map(ch => SUB_DIGITS[ch] || SUB_LETTERS[ch] || ch).join(''))
			.replace(/<[^>]+>/g, '')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&amp;/g, '&');
	}

	/**
	 * Render one math span whose text has already been HTML-escaped by the caller.
	 * The Markdown renderer pipes `$…$` through this, so the escaping is not done
	 * twice (which would turn `<sup>` into `&lt;sup&gt;`).
	 */
	function renderInline(escapedBody) {
		// A prime inside math is a prime, not a quote: d_c\' reads as d_c′.
		const body = String(escapedBody || '').trim()
			.replace(/&#39;|'/g, '\u2032');
		return scripts(symbols(body));
	}

	M.Latex = { hasMath, toHtml, toText, renderInline, symbols, scripts, escapeHtml, ZERO_WIDTH };
})();
