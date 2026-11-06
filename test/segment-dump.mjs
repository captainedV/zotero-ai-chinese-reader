/**
 * Dump how the plugin segments a PDF, as Markdown, for before/after comparison.
 *
 *   node test/segment-dump.mjs <file.pdf> [--pages N] [--out path] [--translatable]
 *
 * The output mirrors what the reader actually sees: one entry per paragraph the
 * translator would send, with the role the classifier assigned and the geometry
 * it decided from. Diffing two dumps shows exactly what a segmentation change
 * did to a real paper.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as pdfjs from '/tmp/pdfcheck/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import { loadPlugin } from './harness.mjs';

const args = process.argv.slice(2);
const file = args.find(arg => !arg.startsWith('--') && arg.endsWith('.pdf'));
if (!file) {
	console.error('usage: node test/segment-dump.mjs <file.pdf> [--pages N] [--out path] [--translatable]');
	process.exit(1);
}
const option = (name, fallback) => {
	const index = args.indexOf(`--${name}`);
	return index >= 0 ? args[index + 1] : fallback;
};
const pageLimit = Number(option('pages', 0)) || Infinity;
const outPath = option('out', '');
const translatableOnly = args.includes('--translatable');

const M = loadPlugin('i18n.js', 'util.js', 'layout.js');
M.I18n.init('zh-CN');

const data = new Uint8Array(fs.readFileSync(file));
const pdf = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;

const started = Date.now();
const pages = [];
const maxPages = Math.min(pageLimit, pdf.numPages);
for (let i = 1; i <= maxPages; i++) {
	const page = await pdf.getPage(i);
	const textContent = await page.getTextContent();
	const built = M.Layout.buildPage(
		textContent.items,
		{ view: page.view, rotation: page.rotate },
		i - 1,
		{ stopAtReferences: true, styles: textContent.styles }
	);
	pages.push(built);
}
const info = M.Layout.annotateDocument(pages);
const elapsed = Date.now() - started;

const all = [];
for (const page of pages) {
	for (const paragraph of page.paragraphs) {
		all.push(paragraph);
	}
}
const translatable = all.filter(paragraph => paragraph.translatable !== false);

const lines = [];
lines.push(`# Segmentation dump: ${path.basename(file)}`);
lines.push('');
lines.push(`- pages: ${pages.length} / ${pdf.numPages}`);
lines.push(`- paragraphs: ${all.length}`);
lines.push(`- translatable: ${translatable.length}`);
lines.push(`- body font size: ${Math.round(info.bodySize * 10) / 10}`);
lines.push(`- extract time: ${elapsed} ms`);
if (info.tiers) {
	lines.push(`- font tiers: ${Object.entries(info.tiers).map(([key, size]) => `${key}=${size}`).join(' ')}`);
}
lines.push('');
lines.push('Legend: `T` = translated, `·` = skipped. Roles: title/author/heading/abstract/body/');
lines.push('figure-caption/table-caption/keywords are translated; table/formula/toc/');
lines.push('figure-data/pageNoise/footnote/meta are not.');
lines.push('');

let index = 0;
for (const page of pages) {
	const shown = page.paragraphs.filter(paragraph => !translatableOnly || paragraph.translatable !== false);
	if (!shown.length) {
		continue;
	}
	lines.push(`## Page ${page.pageIndex + 1}${page.columns === 2 ? ' (two columns)' : ''}`);
	lines.push('');
	for (const paragraph of shown) {
		index++;
		const mark = paragraph.translatable === false ? '·' : 'T';
		const role = (paragraph.role || 'body').padEnd(14);
		const geometry = `p${paragraph.pageIndex + 1} · ${Math.round(paragraph.fontSize * 10) / 10}pt · ${paragraph.lines?.length || 0} lines`;
		const cont = paragraph.continuation ? ' · continues on the next page' : '';
		const shadow = paragraph.shadow ? ' · (continuation of a paragraph from the previous page)' : '';
		lines.push(`[${String(index).padStart(3)}] ${mark} \`${role}\` ${geometry}${cont}${shadow}`);
		lines.push(`      ${paragraph.text.replace(/\s+/g, ' ').trim()}`);
		lines.push('');
	}
}

const markdown = `${lines.join('\n').trim()}\n`;
if (outPath) {
	fs.mkdirSync(path.dirname(outPath) || '.', { recursive: true });
	fs.writeFileSync(outPath, markdown);
	console.log(`wrote ${outPath} (${all.length} paragraphs, ${translatable.length} translatable)`);
}
else {
	process.stdout.write(markdown);
}
