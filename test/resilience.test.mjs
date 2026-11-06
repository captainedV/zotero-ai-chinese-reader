/**
 * Transport resilience: a gateway that stalls a stream, and a reasoning model
 * that spends its whole output budget on thinking.
 *
 * Both are real failures seen in the wild; both must self-heal rather than leave
 * the UI stuck at 0%.
 */
import http from 'node:http';
import { loadPlugin, testAsync, assert, assertEqual, summary } from './harness.mjs';

const M = loadPlugin('i18n.js', 'util.js', 'prompts.js', 'ai.js', 'mock.js', 'markdown.js', 'usage.js');
M.I18n.init('zh-CN');

const requests = [];
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const payload = JSON.parse(body || '{}');
    requests.push(payload);

    // 1) streaming is black-holed: headers, then silence
    if (payload.stream) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.flushHeaders?.();
      return;
    }

    // 3) a deliberately slow non-streaming answer must survive the watchdog
    if (JSON.stringify(payload.messages || []).includes('SLOW')) {
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: 'slow',
          object: 'chat.completion',
          choices: [{ index: 0, message: { role: 'assistant', content: '慢一点也可以。' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 6, total_tokens: 11 }
        }));
      }, 3000);
      return;
    }

    // 2) non-streaming works — unless the budget is too small for the reasoning
    const reasoningHeavy = (payload.max_tokens || 0) < 16384;
    const message = reasoningHeavy
      ? { role: 'assistant', content: '', reasoning_content: 'thinking very hard about it…' }
      : { role: 'assistant', content: '好的，这是译文。' };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: 'x',
      object: 'chat.completion',
      choices: [{
        index: 0,
        message,
        finish_reason: reasoningHeavy ? 'length' : 'stop'
      }],
      usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 }
    }));
  });
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

M.Prefs.set('provider', 'openai');
M.Prefs.set('apiKey', 'test-key');
M.Prefs.set('model', 'test-model');
M.Prefs.set('baseURL', `http://127.0.0.1:${port}/v1`);
M.Prefs.set('stream', true);
M.Prefs.set('stallSeconds', 1);
M.Prefs.set('maxTokens', 8192);
M.Prefs.set('timeoutSeconds', 60);
M.Usage.reset();

await testAsync('1.0.1-style fetch transport is the default', async () => {
  const info = M.AI.describeTransport();
  assertEqual(info.transport, 'fetch', JSON.stringify(info));
  assert(info.hasFetch, 'fetch must be available');
  assert(info.hasTextDecoder, 'TextDecoder must be available');
});

const states = [];
const started = Date.now();
const text = await M.AI.complete({
  system: 'translate',
  prompt: 'translate this',
  kind: 'translate',
  onState: (state) => states.push(state)
});
const elapsed = Date.now() - started;

await testAsync('a stalled stream is abandoned by the watchdog', async () => {
  assert(elapsed < 12000, `took ${elapsed} ms; the watchdog should fire in ~1 s`);
  assert(requests.some(r => r.stream === true), 'the streaming request was never attempted');
});

await testAsync('the request is retried without streaming', async () => {
  assert(states.includes('fallback'), `states: ${JSON.stringify(states)}`);
  assert(requests.some(r => r.stream === false), 'no non-streaming retry was sent');
});

await testAsync('the retry yields the answer', async () => {
  assertEqual(text, '好的，这是译文。');
});

await testAsync('a reasoning-only reply is retried with a bigger budget', async () => {
  const budgets = requests.filter(r => r.stream === false).map(r => r.max_tokens);
  assert(budgets.includes(8192), `first non-streaming budget: ${JSON.stringify(budgets)}`);
  assert(budgets.includes(16384), `no retry with a larger budget: ${JSON.stringify(budgets)}`);
  assert(states.includes('bigger'), `states: ${JSON.stringify(states)}`);
});

await testAsync('a slow non-streaming reply is not killed by the watchdog', async () => {
	// max_tokens >= the reasoning threshold means the stub answers "quickly" — ask
	// for a body that is deliberately slow instead.
	const slow = await M.AI.complete({
		system: 'x',
		prompt: 'SLOW',
		kind: 'summary'
	});
	assertEqual(slow, '慢一点也可以。');
});

await testAsync('usage is recorded once for the successful call', async () => {
  const info = M.Usage.summary();
  assert(info.calls >= 1, `calls=${info.calls}`);
  assert(info.prompt > 0 && info.completion > 0, JSON.stringify(info));
});

server.close();
summary();
