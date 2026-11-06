/**
 * Static checks over the source tree: every i18n key used by the UI must exist,
 * and every shim in the plugin must avoid APIs the Zotero sandbox lacks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadPlugin, ROOT, test, assert, summary } from './harness.mjs';

const scriptsDir = path.join(ROOT, 'content/scripts');
const files = fs.readdirSync(scriptsDir).filter(file => file.endsWith('.js'));
const sources = new Map(files.map(file => [file, fs.readFileSync(path.join(scriptsDir, file), 'utf8')]));

const M = loadPlugin('i18n.js');
M.I18n.init('zh-CN');
const dictKeys = new Set(M.I18n.keys());

console.log('\n== i18n ==');

const usedKeys = new Map();
for (const [file, source] of sources) {
  const patterns = [
    /(?:\bt|M\.I18n\.t)\(\s*'([a-zA-Z][\w.]*)'/g,
    /(?:\bt|M\.I18n\.t)\(\s*`([a-zA-Z][\w.]*)`/g
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const key = match[1];
      if (!usedKeys.has(key)) {
        usedKeys.set(key, new Set());
      }
      usedKeys.get(key).add(file);
    }
  }
}

test('i18n keys are referenced', () => {
  assert(usedKeys.size > 60, `only ${usedKeys.size} keys found`);
});

test('every referenced key exists in the dictionary', () => {
  const missing = [...usedKeys.entries()]
    .filter(([key]) => !dictKeys.has(key))
    .map(([key, where]) => `${key} (${[...where].join(',')})`);
  assert(missing.length === 0, `missing keys: ${missing.slice(0, 8).join(' | ')}`);
});

test('dictionaries stay in sync between zh-CN and en-US', () => {
  // `t()` falls back to en-US, so a key present only in en-US is a silent
  // untranslated string; catch them explicitly for the Chinese-first UI.
  M.I18n.init('en-US');
  const english = new Set(M.I18n.keys());
  M.I18n.init('zh-CN');
  const chinese = new Set(M.I18n.keys());
  const englishOnly = [...english].filter(key => !chinese.has(key));
  assert(englishOnly.length === 0, `not translated: ${englishOnly.slice(0, 8).join(', ')}`);
});

test('placeholder variables used at call sites are known', () => {
  const problems = [];
  for (const [key, where] of usedKeys) {
    for (const [file, source] of sources) {
      const callPattern = new RegExp(`t\\(\\s*'${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\s*,\\s*\\{([^}]*)\\}`, 'g');
      for (const match of source.matchAll(callPattern)) {
        const provided = match[1].split(',').map(part => part.split(':')[0].trim()).filter(Boolean);
        const template = M.I18n.t(key);
        const required = [...String(template).matchAll(/\{(\w+)\}/g)].map(m => m[1]);
        const missing = required.filter(name => !provided.includes(name));
        if (missing.length) {
          problems.push(`${key} [${file}] missing {${missing.join(',')}}`);
        }
      }
    }
  }
  assert(problems.length === 0, problems.slice(0, 6).join(' | '));
});


console.log('\n== motion & style discipline ==');
const css = sources.get('styles.js');

test('no `transition: all` (only explicit properties animate)', () => {
  const offenders = [...css.matchAll(/transition:\s*all\b/g)].length;
  assert(offenders === 0, `${offenders} occurrences`);
});

test('hover/press transitions stay under 300ms', () => {
  const durations = [...css.matchAll(/transition:[^;]*?(\d*\.?\d+)(m?s)/g)]
    .map(m => (m[2] === 'ms' ? Number(m[1]) : Number(m[1]) * 1000));
  const slow = durations.filter(ms => ms > 300);
  assert(slow.length === 0, `slow transitions: ${slow.join(',')}`);
});

test('entrance animations stay under 400ms', () => {
  // Looping indicators (pulse/shimmer/bounce) are exempt: they are ambient, not
  // entrance animations, and are still disabled for reduced-motion users.
  const declared = [...css.matchAll(/animation:[^;]+;/g)].map(m => m[0]);
  const slow = declared
    .filter(rule => !/infinite/.test(rule))
    .map(rule => {
      const match = rule.match(/(\d*\.?\d+)(m?s)/);
      if (!match) {
        return 0;
      }
      return match[2] === 'ms' ? Number(match[1]) : Number(match[1]) * 1000;
    })
    .filter(ms => ms > 400);
  assert(slow.length === 0, `slow animations: ${slow.join(',')}`);
});

test('reduced-motion users get the static layout', () => {
  assert(/prefers-reduced-motion[\s\S]{0,200}animation:\s*none/.test(css), 'no reduced-motion block');
});

test('`!important` is reserved for the layout override and reduced motion', () => {
  const lines = css.split('\n').filter(line => line.includes('!important'));
  const unexpected = lines.filter(line => !/ml-dock-width|animation:\s*none|transition:\s*none/.test(line));
  assert(unexpected.length === 0, unexpected.slice(0, 3).join(' | '));
});

test('dock animates compositor-friendly properties', () => {
  assert(/@keyframes ml-dock-in[\s\S]{0,200}transform/.test(css), 'dock-in should use transform');
  assert(!/@keyframes ml-dock-in[\s\S]{0,200}(?<!-)width:/.test(css), 'dock-in must not animate width');
});

console.log('\n== sandbox safety ==');
const BANNED = [
  [/\bnew AbortController\(/, 'use M.Util.AbortController'],
  [/\bwindow\.document\b/, 'never touch the top-level document'],
  [/(?<![.\w])localStorage\b/, 'localStorage is unavailable in the plugin sandbox'],
  [/(?<![.\w])console\./, 'console is unavailable; use M.Log'],
  [/(?<![.\w])structuredClone\(/, 'structuredClone is unavailable'],
  [/(?<![.\w])DOMParser\b(?!.*wantGlobalProperties)/, 'DOMParser is available, but keep parsing local']
];

for (const [pattern, hint] of BANNED) {
  test(`no banned global for ${hint}`, () => {
    const offenders = [];
    for (const [file, source] of sources) {
      if (pattern.test(source)) {
        offenders.push(file);
      }
    }
    assert(offenders.length === 0, `found in ${offenders.join(', ')}`);
  });
}

test('every module attaches to the shared Moonlit namespace', () => {
  // preferences.js is a standalone preference-pane script: it runs in its own
  // sandbox without the plugin globals and exposes `MoonlitPreferences`.
  const standalone = new Set(['preferences.js']);
  const missing = files.filter(file => !standalone.has(file) && !/globalThis\.Moonlit/.test(sources.get(file)));
  assert(missing.length === 0, missing.join(', '));
});

test('AI key points ship disabled by default', () => {
	const prefs = fs.readFileSync(path.join(ROOT, 'prefs.js'), 'utf8');
	for (const key of ['enableTranslate', 'enableSummary', 'enableHighlight']) {
		assert(prefs.includes(`pref("extensions.zotero.moonlit.${key}", false);`), `${key} should default to false`);
	}
});

test('every exported member points at something that exists', () => {
	const problems = [];
	for (const [file, source] of sources) {
		const defined = new Set([
			...[...source.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)].map(match => match[1]),
			...[...source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)].map(match => match[1])
		]);
		// `M.Foo = { a, b, c }` shorthand exports must resolve to a local binding.
		for (const match of source.matchAll(/M\.(\w+) = \{([\s\S]*?)\n\t\};/g)) {
			const body = match[2];
			if (!/^\t\t[A-Za-z_]/.test(body.trim() === '' ? '' : body)) {
				continue;
			}
			for (const entry of body.split(',')) {
				const name = entry.trim().split(/[\s:(]/)[0];
				if (!name || !/^[A-Za-z_$][\w$]*$/.test(name)) {
					continue;
				}
				if (!defined.has(name)) {
					problems.push(`${file}: M.${match[1]}.${name} is exported but never defined`);
				}
			}
		}
	}
	assert(problems.length === 0, `\n  ${problems.join('\n  ')}`);
});

test('the preference pane never touches plugin-only globals', () => {
	// preferences.js runs in the preferences window sandbox: Moonlit.Prefs,
	// Moonlit.AI etc. simply do not exist there. Referencing them threw during
	// build and left Zotero's settings window unusable.
	const source = fs.readFileSync(path.join(ROOT, 'content/scripts/preferences.js'), 'utf8');
	const offenders = [];
	const lines = source.split('\n');
	lines.forEach((line, index) => {
		if (/^\s*(\/\/|\*)/.test(line)) {
			return;
		}
		// `t` exists locally as t(zh, en); the plugin's t(key, vars) does not.
		if (/\bM\.(Prefs|AI|I18n|Log|Usage|PdfDoc|ReaderUI|Dock)\b/.test(line)
			|| /(^|[^\w.])t\(\s*'[^']*'\s*\)/.test(line)) {
			offenders.push(`${index + 1}: ${line.trim()}`);
		}
	});
	assert(offenders.length === 0, `plugin globals in the pane sandbox:\n  ${offenders.join('\n  ')}`);
});

test('modules never call a helper they forgot to import from the namespace', () => {
	// `roundRect(...)` instead of `M.Layout.roundRect(...)` only fails at runtime,
	// deep inside `extract()`, which is how a broken build shipped twice (and
	// `jumpToPage` before that). The rule is precise: if a bare name is exported on
	// the Moonlit namespace somewhere, a module that calls it without declaring it
	// is reaching across module boundaries by accident.
	const moduleDir = path.join(ROOT, 'content/scripts');
	const files = fs.readdirSync(moduleDir).filter(name => name.endsWith('.js'));
	const sources = new Map(files.map(name => [name, fs.readFileSync(path.join(moduleDir, name), 'utf8')]));

	const exported = new Set();
	for (const source of sources.values()) {
		// `M.Foo = { a, b, c }` and shorthand exports
		for (const match of source.matchAll(/M\.[A-Za-z_$][\w$]*\s*=\s*\{([\s\S]*?)\n\t*\};/g)) {
			for (const name of match[1].matchAll(/(?:^|[,{\s])([A-Za-z_$][\w$]*)\s*(?=[,}:\n])/g)) {
				exported.add(name[1]);
			}
		}
		// `M.Foo = function foo(` / `M.Foo = create`
		for (const match of source.matchAll(/M\.[A-Za-z_$][\w$]*\s*=\s*([A-Za-z_$][\w$]*)/g)) {
			exported.add(match[1]);
		}
	}
	assert(exported.size > 20, `namespace scan found only ${exported.size} exports`);

	// Comments are skipped, but string literals are left alone: a regex that tries
	// to blank them also blanks real code around escapes, which produced false
	// positives. Quoted call sites are filtered at match time instead.
	const stripComments = (code) => code
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

	const problems = [];
	for (const [file, rawSource] of sources) {
		const source = stripComments(rawSource);
		const declared = new Set();
		for (const match of source.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)) {
			declared.add(match[1]);
		}
		for (const match of source.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g)) {
			declared.add(match[1]);
		}
		for (const match of source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) {
			declared.add(match[1]);
		}
		for (const match of source.matchAll(/([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\s*)?(?:function|\()/g)) {
			declared.add(match[1]);
		}
		for (const match of source.matchAll(/([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g)) {
			declared.add(match[1]);
		}
		for (const match of source.matchAll(/(?:^|[^.\w$'"`])([A-Za-z_$][\w$]*)\s*\(/g)) {
			const name = match[1];
			if (!exported.has(name) || declared.has(name)) {
				continue;
			}
			const line = source.slice(source.lastIndexOf('\n', match.index) + 1, source.indexOf('\n', match.index));
			if (/['"`]/.test(line) && /(['"`])(?:[^'"`]*)$/.test(line.slice(0, match.index - (source.lastIndexOf('\n', match.index) + 1)))) {
				continue; // inside a string literal carrying prose
			}
			problems.push(`${file}: ${name}()`);
		}
	}
	assert(problems.length === 0,
		`bare calls to namespaces helpers (use M.<Module>.name):\n  ${[...new Set(problems)].join('\n  ')}`);
});

test('module load order in bootstrap mentions every script', () => {
  const bootstrap = fs.readFileSync(path.join(ROOT, 'bootstrap.js'), 'utf8');
  const listMatch = bootstrap.match(/MOONLIT_SCRIPTS\s*=\s*\[([\s\S]*?)\]/);
  assert(!!listMatch, 'MOONLIT_SCRIPTS not found');
  const listed = new Set([...listMatch[1].matchAll(/'([^']+)'/g)].map(m => path.basename(m[1])));
  // preferences.js is only loaded by the preference pane, never by the plugin.
  const paneOnly = new Set(['preferences.js']);
  const missing = files.filter(file => !paneOnly.has(file) && !listed.has(file));
  assert(missing.length === 0, `not loaded: ${missing.join(', ')}`);
});

summary();
