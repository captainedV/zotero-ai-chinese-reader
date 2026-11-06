/**
 * The gateway this plugin was tested against allows 50 requests per minute per
 * key and answers 429 above that. A long paper fires hundreds of batches, so the
 * plugin must stay under the cap, honour the wait the server asks for, and retry
 * instead of dropping a batch (which left paragraphs blank with no explanation).
 */
import http from 'node:http';
import { loadPlugin, testAsync, assert, assertEqual, summary } from './harness.mjs';

const M = loadPlugin('i18n.js', 'util.js', 'prompts.js', 'ai.js', 'mock.js', 'markdown.js', 'usage.js');
M.I18n.init('zh-CN');

const hits = [];
let throttled = 0;
const THROTTLE_FIRST = 3;

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const payload = JSON.parse(body || '{}');
    hits.push({ at: Date.now(), maxTokens: payload.max_tokens });
    if (throttled < THROTTLE_FIRST) {
      throttled++;
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '1' });
      res.end(JSON.stringify({
        error: {
          message: '单 key 每分钟请求超限（50 RPM），请 3 秒后重试',
          type: 'rate_limit_error',
          code: '102503'
        }
      }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: 'ok',
      object: 'chat.completion',
      choices: [{ index: 0, message: { role: 'assistant', content: '重试之后的译文。' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 4, completion_tokens: 5, total_tokens: 9 }
    }));
  });
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

M.Prefs.set('provider', 'openai');
M.Prefs.set('apiKey', 'test-key');
M.Prefs.set('model', 'test-model');
M.Prefs.set('baseURL', `http://127.0.0.1:${port}/v1`);
M.Prefs.set('stream', false);
M.Prefs.set('maxRpm', 0);          // the budget itself is tested separately
M.Prefs.set('timeoutSeconds', 60);
M.Usage.reset();

const states = [];
const started = Date.now();
const text = await M.AI.complete({ system: 'x', prompt: 'hello', kind: 'translate', onState: (s, info) => states.push([s, info]) });
const elapsed = Date.now() - started;

await testAsync('a 429 is retried instead of dropping the batch', async () => {
  assertEqual(text, '重试之后的译文。');
  assertEqual(hits.length, THROTTLE_FIRST + 1, `requests: ${hits.length}`);
});

await testAsync('the retry honours the wait the server asks for', async () => {
  const gaps = hits.slice(1).map((hit, index) => hit.at - hits[index].at);
  assert(gaps.every(gap => gap >= 700), `gaps between attempts: ${JSON.stringify(gaps)}`);
  assert(elapsed >= THROTTLE_FIRST * 700, `total ${elapsed} ms is too short to have waited`);
});

await testAsync('the UI is told why the run is slow', async () => {
  const limited = states.filter(([name]) => name === 'rateLimited');
  assert(limited.length >= 1, `states: ${JSON.stringify(states.map(([n]) => n))}`);
  assert(limited[0][1]?.seconds >= 1, `seconds: ${JSON.stringify(limited[0][1])}`);
});

server.close();

// The wait is often only stated in the message text, with no Retry-After header.
const messageOnly = { hits: [], throttled: false };
const server2 = http.createServer((req, res) => {
  req.on('data', () => {});
  req.on('end', () => {
    messageOnly.hits.push(Date.now());
    if (!messageOnly.throttled) {
      messageOnly.throttled = true;
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: '单 key 每分钟请求超限（50 RPM），请 2 秒后重试' } }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      choices: [{ index: 0, message: { role: 'assistant', content: '好的。' }, finish_reason: 'stop' }]
    }));
  });
});
await new Promise(resolve => server2.listen(0, '127.0.0.1', resolve));

await testAsync('the wait is parsed out of the message when there is no header', async () => {
  M.Prefs.set('baseURL', `http://127.0.0.1:${server2.address().port}/v1`);
  const text2 = await M.AI.complete({ system: 'x', prompt: 'no header', kind: 'translate' });
  assertEqual(text2, '好的。');
  const gap = messageOnly.hits[1] - messageOnly.hits[0];
  assert(gap >= 1700, `waited only ${gap} ms; the message asked for 2 s`);
});
server2.close();

// The rolling budget keeps a burst under the gateway's per-minute cap.
const burst = { hits: [] };
const server3 = http.createServer((req, res) => {
  req.on('data', () => {});
  req.on('end', () => {
    burst.hits.push(Date.now());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }] }));
  });
});
await new Promise(resolve => server3.listen(0, '127.0.0.1', resolve));

await testAsync('a burst is spaced out to respect the per-minute budget', async () => {
  M.Prefs.set('baseURL', `http://127.0.0.1:${server3.address().port}/v1`);
  M.Prefs.set('maxRpm', 2);
  M.Prefs.set('rpmWindowMs', 1200);
  const started = Date.now();
  await Promise.all([1, 2, 3].map(n => M.AI.complete({ system: 'x', prompt: `burst ${n}`, kind: 'translate' })));
  const elapsed = Date.now() - started;
  assertEqual(burst.hits.length, 3, 'all three calls must complete');
  assert(elapsed >= 1000, `three calls finished in ${elapsed} ms; the second slot should wait`);
  M.Prefs.set('maxRpm', 45);
  M.Prefs.set('rpmWindowMs', 60000);
});
server3.close();

summary();
