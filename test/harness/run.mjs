/**
 * Drives harness.html in headless Chromium and writes screenshots.
 * Usage: node test/harness/run.mjs [scenario ...]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const CHROME = path.join(
	os.homedir(),
	'Library/Caches/ms-playwright/chromium-1247/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
);

const scenarios = process.argv.slice(2).filter(arg => !arg.startsWith('-'));
const list = scenarios.length
	? scenarios
	: ['idle', 'popover', 'dock-empty', 'translate', 'translate-hover', 'summary', 'highlight'];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const errors = [];

for (const scenario of list) {
	const [name, extra] = scenario.split('?');
	const query = `scenario=${name}${extra ? `&${extra}` : ''}`;
	const qs = new URLSearchParams(query);
	const width = Number(qs.get('w') || 1440);
	const height = Number(qs.get('h') || 900);
	const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
	const consoleErrors = [];
	page.on('pageerror', error => {
		consoleErrors.push(String(error));
		errors.push({ scenario: name, error: String(error) });
	});
	page.on('console', message => {
		if (message.type() === 'error') {
			consoleErrors.push(message.text());
		}
	});

	const file = url.pathToFileURL(path.join(HERE, 'harness.html')).href;
	await page.goto(`${file}?${query}`, { waitUntil: 'load' });
	await page.waitForFunction('window.__ready', null, { timeout: 60000 }).catch(() => {});
	await page.evaluate(() => window.__ready).catch(e => errors.push({ scenario: name, error: String(e) }));

	if (name === 'verify') {
		const checks = await page.evaluate(() => window.__verify || []);
		const failed = checks.filter(c => !c.ok);
		for (const item of checks) {
			console.log(`   ${item.ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${item.name}${item.detail ? `  (${item.detail})` : ''}`);
		}
		console.log(`   ${checks.length - failed.length}/${checks.length} checks passed`);
	}

	const shot = path.join(SHOTS, `${name.replace(/[^\w-]/g, '_')}.png`);
	await page.screenshot({ path: shot });

	const stats = await page.evaluate(() => ({
		dock: !!document.querySelector('.ml-dock'),
		dockWidth: document.querySelector('.ml-dock')?.getBoundingClientRect().width || 0,
		popover: !!document.querySelector('.ml-popover'),
		cards: document.querySelectorAll('.ml-para').length,
		translations: document.querySelectorAll('.ml-para .ml-trans').length,
		rects: document.querySelectorAll('.ml-hl-rect').length,
		points: document.querySelectorAll('.ml-point').length,
		summaryHeadings: document.querySelectorAll('.ml-summary h2, .ml-summary h3').length,
		splitInsetEnd: getComputedStyle(document.getElementById('split-view')).insetInlineEnd,
		viewport: `${window.innerWidth}x${window.innerHeight}`,
		bodyClass: document.body.className
	}));

	console.log(`${name}: ${shot.replace(process.cwd() + '/', '')}`);
	console.log(`   ${JSON.stringify(stats)}`);
	if (consoleErrors.length) {
		console.log(`   errors: ${consoleErrors.slice(0, 4).join(' | ')}`);
	}
	await page.close();
}

await browser.close();
console.log(errors.length ? `\n${errors.length} page errors` : '\nno page errors');
process.exit(errors.length ? 1 : 0);
