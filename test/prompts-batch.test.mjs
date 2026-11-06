/**
 * Batched, context-aware translation.
 *
 * Sending one request per paragraph wasted the model's context (terminology drift,
 * dangling pronouns) and paid a full round trip plus system prompt per paragraph.
 * These tests pin the request shape and the reply parser.
 */
import { loadPlugin, test, assert, assertEqual, summary } from './harness.mjs';

const M = loadPlugin('i18n.js', 'util.js', 'markdown.js', 'ai.js', 'prompts.js', 'mock.js');
M.I18n.init('zh-CN');

const units = [
	{ id: 'p1', text: 'Multi-head Latent Attention compresses the KV cache.' },
	{ id: 'p2', text: 'We train on 8.1T tokens and report a 42.5% cost reduction.' }
];

test('the batch prompt carries the neighbours as reference only', () => {
	const request = M.Prompts.buildTranslateBatchPrompt({
		units,
		context: {
			title: 'DeepSeek-V2: A Strong, Economical, and Efficient MoE Language Model',
			section: '2.1. Multi-Head Latent Attention',
			before: 'In the previous section we described the architecture.',
			after: 'The following section reports the ablations.'
		}
	});
	assert(request.json, 'the request must ask for JSON');
	assert(request.prompt.includes('[[TASK:translate]]'), 'task marker');
	assert(request.prompt.includes('DeepSeek-V2'), 'paper title is part of the context');
	assert(request.prompt.includes('2.1. Multi-Head Latent Attention'), 'section heading');
	assert(/Preceding paragraph \(context only, do not translate\)/.test(request.prompt), 'before context labelled');
	assert(/Following paragraph \(context only, do not translate\)/.test(request.prompt), 'after context labelled');
	assert(request.prompt.includes(JSON.stringify(units)), 'the units are sent as JSON');
	assert(/translate every item|逐条翻译/.test(request.system), request.system.slice(0, 80));
	assert(/never translate the context itself|不要翻译上下文本身/i.test(request.system), 'context is reference only');
});

test('the context is capped so a huge neighbour cannot flood the request', () => {
	const long = 'x'.repeat(5000);
	const request = M.Prompts.buildTranslateBatchPrompt({
		units,
		context: { before: long, after: long },
		contextChars: 120
	});
	assert(request.prompt.includes(`${'x'.repeat(120)}…`), 'neighbour text is trimmed with an ellipsis');
	assert(!request.prompt.includes('x'.repeat(200)), 'no long run of neighbour text survives');
});

test('an empty context is simply omitted', () => {
	const request = M.Prompts.buildTranslateBatchPrompt({ units, context: {} });
	assert(!request.prompt.includes('Preceding paragraph'), 'no empty context block');
	assert(request.prompt.includes('Items to translate (2'), 'item count is stated');
});

test('the reply parser accepts every shape a model returns', () => {
	const ids = units.map(unit => unit.id);
	const shapes = [
		{ translations: [{ id: 'p1', text: '甲' }, { id: 'p2', text: '乙' }] },
		[{ id: 'p1', text: '甲' }, { id: 'p2', text: '乙' }],
		{ p1: '甲', p2: '乙' },
		{ data: { translations: [{ id: 'p1', text: '甲' }, { id: 'p2', text: '乙' }] } },
		{ translations: [{ id: 'p1', translation: '甲' }, { id: 'p2', target: '乙' }] }
	];
	for (const shape of shapes) {
		const map = M.Prompts.parseBatchTranslations(JSON.stringify(shape), ids);
		assertEqual(map.get('p1'), '甲', JSON.stringify(shape).slice(0, 40));
		assertEqual(map.get('p2'), '乙', JSON.stringify(shape).slice(0, 40));
	}
});

test('the reply parser tolerates fences and rejects unusable replies', () => {
	const map = M.Prompts.parseBatchTranslations(
		'```json\n{"translations":[{"id":"p1","text":"甲"},{"id":"p2","text":"乙"}]}\n```',
		['p1', 'p2']
	);
	assertEqual(map.size, 2);
	assertEqual(M.Prompts.parseBatchTranslations('not json at all', ['p1']).size, 0);
	assertEqual(M.Prompts.parseBatchTranslations('', ['p1']).size, 0);
});

test('unknown ids and empty text never leak into the cache', () => {
	const map = M.Prompts.parseBatchTranslations(JSON.stringify({
		translations: [
			{ id: 'p1', text: '甲' },
			{ id: 'other', text: 'should be ignored' },
			{ id: 'p2', text: '   ' }
		]
	}), ['p1', 'p2']);
	assertEqual(map.size, 1);
	assertEqual(map.get('p1'), '甲');
});

summary();
