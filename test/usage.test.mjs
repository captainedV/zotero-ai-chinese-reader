/**
 * Token accounting: provider numbers when present, estimates otherwise, and the
 * per-attachment record round trip.
 */
import { loadPlugin, test, assert, assertEqual, summary } from './harness.mjs';

const M = loadPlugin('usage.js');
const Usage = M.Usage;

assert(Usage, 'usage module missing');

test('estimates latin and CJK tokens differently', () => {
	assertEqual(Usage.estimateTokens(''), 0);
	assertEqual(Usage.estimateTokens('hello world'), 3);          // 11 latin chars / 4
	assertEqual(Usage.estimateTokens('一二三四五六七八九十一二三四五六'), 10); // 16 CJK / 1.6
	const mixed = Usage.estimateTokens('Transformer 注意力机制 works well');
	assert(mixed > 3 && mixed < 20, `mixed estimate out of range: ${mixed}`);
});

test('formats token counts the way people read them', () => {
	assertEqual(Usage.formatTokens(0), '0');
	assertEqual(Usage.formatTokens(916), '916');
	assertEqual(Usage.formatTokens(1000), '1.0k');
	assertEqual(Usage.formatTokens(12345), '12k');
	assertEqual(Usage.formatTokens(1400000), '1.4M');
});

test('accumulates totals and per-kind buckets', () => {
	const record = { attachmentKey: 'ABCD1234' };
	Usage.attach('ABCD1234', record);
	assertEqual(Usage.state.calls, 0);

	Usage.add({ prompt: 1200, completion: 300, kind: 'translate' });
	Usage.add({ prompt: 800, completion: 120, kind: 'summary' });
	Usage.add({ prompt: 100, completion: 40, kind: 'translate' });

	assertEqual(Usage.state.prompt, 2100);
	assertEqual(Usage.state.completion, 460);
	assertEqual(Usage.state.calls, 3);
	assertEqual(Usage.state.byKind.translate.calls, 2);
	assertEqual(Usage.state.byKind.summary.prompt, 800);
	assertEqual(Usage.state.estimated, false);
});

test('flags a run as estimated when any provider omits usage', () => {
	Usage.reset();
	Usage.add({ prompt: 500, completion: 100, kind: 'translate' });
	assertEqual(Usage.state.estimated, false);
	Usage.add({ prompt: 400, completion: 90, estimated: true, kind: 'summary' });
	assertEqual(Usage.state.estimated, true);
});

test('writes totals back into the cache record', () => {
	const record = { attachmentKey: 'EFGH5678' };
	Usage.attach('EFGH5678', record);
	Usage.add({ prompt: 10, completion: 5, kind: 'highlight' });
	assert(record.usage, 'record.usage should be populated');
	assertEqual(record.usage.prompt, 10);
	assertEqual(record.usage.byKind.highlight.completion, 5);
});

test('restores totals from an existing record', () => {
	const record = {
		attachmentKey: 'IJKL9012',
		usage: { prompt: 4000, completion: 900, calls: 7, estimated: false }
	};
	Usage.attach('IJKL9012', record);
	assertEqual(Usage.state.prompt, 4000);
	assertEqual(Usage.state.calls, 7);
	assertEqual(Usage.key, 'IJKL9012');
});

test('ignores junk in a persisted record', () => {
	Usage.attach('MNOP3456', { usage: { prompt: 'x', completion: null, calls: -3, byKind: null } });
	assertEqual(Usage.state.prompt, 0);
	assertEqual(Usage.state.completion, 0);
	assertEqual(Usage.state.calls, 0);
	assert(Usage.state.byKind.translate, 'kind buckets should exist');
});

test('reset clears everything and notifies listeners', () => {
	Usage.attach('QRST7890', {});
	Usage.add({ prompt: 100, completion: 50, kind: 'summary' });
	let notified = 0;
	const off = Usage.onChange(() => notified++);
	Usage.reset();
	off();
	assertEqual(Usage.state.prompt, 0);
	assertEqual(Usage.state.calls, 0);
	assert(notified >= 1, 'listener should fire on reset');
	const before = notified;
	Usage.add({ prompt: 1, completion: 1, kind: 'other' });
	assertEqual(notified, before, 'unsubscribed listener must not fire');
});

summary('usage');
