#!/usr/bin/env node
/**
 * Builds dist/moonlit-reader-<version>.xpi (a plain zip of the plugin files).
 * Usage: node build.mjs [--watch]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const dist = path.join(root, 'dist');
const target = path.join(dist, `moonlit-reader-${manifest.version}.xpi`);

fs.mkdirSync(dist, { recursive: true });
fs.rmSync(target, { force: true });

const files = ['manifest.json', 'bootstrap.js', 'prefs.js', 'content', 'README.md'];
const present = files.filter(name => fs.existsSync(path.join(root, name)));

execFileSync('zip', ['-r', '-X', '-q', target, ...present], { cwd: root, stdio: 'inherit' });

const size = fs.statSync(target).size;
console.log(`built ${path.relative(root, target)} (${(size / 1024).toFixed(1)} KiB)`);

const unpacked = process.argv.includes('--unpacked');
if (unpacked) {
	const out = path.join(dist, 'unpacked');
	fs.rmSync(out, { recursive: true, force: true });
	fs.mkdirSync(out, { recursive: true });
	execFileSync('unzip', ['-q', '-o', target, '-d', out], { stdio: 'inherit' });
	console.log(`unpacked to ${path.relative(root, out)}`);
}
