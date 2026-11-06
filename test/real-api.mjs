/**
 * Real-network check of the AI layer against a live provider.
 *
 * Uses DEEPSEEK_API_KEY (or MOONLIT_TEST_KEY) from the environment and skips
 * silently when no key is available. This is the only test that exercises the
 * actual HTTP/SSE code path, so it is kept cheap: two short prompts.
 *
 * Usage: DEEPSEEK_API_KEY=sk-... node test/real-api.mjs
 */
import { loadPlugin } from './harness.mjs';

const apiKey = process.env.DEEPSEEK_API_KEY || process.env.MOONLIT_TEST_KEY || '';
if (!apiKey) {
  console.log('skipped: set DEEPSEEK_API_KEY to run the live provider test');
  process.exit(0);
}

const M = loadPlugin('i18n.js', 'util.js', 'prompts.js', 'ai.js', 'mock.js', 'markdown.js');
M.I18n.init('zh-CN');

M.Prefs.set('provider', 'deepseek');
M.Prefs.set('apiKey', apiKey);
M.Prefs.set('model', 'deepseek-chat');
M.Prefs.set('baseURL', '');
M.Prefs.set('stream', true);
M.Prefs.set('targetLang', 'zh-CN');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${name}${detail ? `  (${detail})` : ''}`);
}

console.log(`provider: ${M.AI.describe().label} · model ${M.AI.describe().model}`);
const resolvedEndpoint = M.AI.endpoint(M.AI.describe().baseURL);
check('endpoint resolved', /\/chat\/completions$/.test(resolvedEndpoint), resolvedEndpoint);

const started = Date.now();
const connection = await M.AI.testConnection();
check('connection test succeeds', connection.ok, `${Date.now() - started} ms · ${connection.message}`);

// --- sentence translation (the hot path)
const sentences = [
  { id: 'p0:0', text: 'Image-to-Image (I2I) translation is a significant area of research in both academia and industry.' },
  { id: 'p0:1', text: 'Denoising diffusion models have achieved remarkable results, but they require a large number of sampling steps.' }
];
const request = M.Prompts.buildTranslatePrompt({
  sentences,
  paragraphText: sentences.map(s => s.text).join(' '),
  index: 0,
  total: 1
});
let streamed = '';
const raw = await M.AI.complete({
  system: request.system,
  prompt: request.prompt,
  json: request.json,
  onDelta: (piece, full) => {
    streamed = full;
  }
});
const parsed = M.AI.parseJson(raw);
check('translation returns JSON', !!parsed?.translations?.length, `${parsed?.translations?.length || 0} items`);
const translated = (parsed?.translations || []).map(item => item.text || '').join(' ');
check('translation is Chinese', /[\u4e00-\u9fa5]/.test(translated), translated.slice(0, 60));
check('streaming produced deltas', streamed.length > 10, `${streamed.length} chars streamed`);
check('translations keep every sentence', (parsed?.translations || []).length === sentences.length);

// --- summary prompt (small)
const summaryRequest = M.Prompts.buildSummaryFinalPrompt({
  notes: 'Title: Deterministic Image-to-Image Translation via Denoising Brownian Bridge Models\n' +
    'Abstract: We propose a dual Brownian bridge model that produces deterministic I2I translations ' +
    'without iterative sampling, using closed-form bridge sampling and dual approximators.',
  meta: 'Type: conference paper',
  targetLang: 'zh-CN'
});
const summary = await M.AI.complete({
  system: summaryRequest.system,
  prompt: summaryRequest.prompt
});
check('summary returns markdown with headings', /^#{1,3}\s/m.test(summary), summary.split('\n')[0]);
check('summary is Chinese', /[\u4e00-\u9fa5]/.test(summary));
const headings = (summary.match(/^#{1,3}\s.+$/gm) || []).length;
check('summary has several sections', headings >= 4, `${headings} headings`);

// --- error handling: bad key must produce a clean AIError, not a crash
M.Prefs.set('apiKey', 'sk-invalid-key-for-testing');
let error = null;
try {
  await M.AI.complete({ prompt: 'hello', system: 'reply with ok' });
}
catch (e) {
  error = e;
}
check('invalid key surfaces a typed error', !!error && (error.name === 'AIError' || 'code' in error),
  error ? `${error.name}/${error.code || ''} ${error.message.slice(0, 60)}` : 'no error thrown');

const passed = results.filter(r => r.ok).length;
console.log(`\n${passed}/${results.length} live checks passed`);
process.exit(passed === results.length ? 0 : 1);
