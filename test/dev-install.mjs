#!/usr/bin/env node
/**
 * Installs the built plugin into a disposable Zotero profile and (re)writes its
 * add-on registry record, so the plugin can be tested without clicking through
 * the Zotero UI.
 *
 * Usage: node test/dev-install.mjs <profileDir> [dataDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const profileDir = process.argv[2];
if (!profileDir) {
	console.error('usage: node test/dev-install.mjs <profileDir> [dataDir]');
	process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const id = manifest.applications.zotero.id;
const version = manifest.version;

execFileSync(process.execPath, [path.join(ROOT, 'build.mjs')], { stdio: 'inherit' });

const extensionsDir = path.join(profileDir, 'extensions');
fs.mkdirSync(extensionsDir, { recursive: true });
const target = path.join(extensionsDir, `${id}.xpi`);
fs.copyFileSync(path.join(ROOT, 'dist', `moonlit-reader-${version}.xpi`), target);

// Firefox refuses to enable sideloaded add-ons unless every scope is allowed;
// Zotero's own test profiles set both of these.
const prefsPath = path.join(profileDir, 'prefs.js');
let prefs = '';
try {
	prefs = fs.readFileSync(prefsPath, 'utf8');
}
catch (e) {
	prefs = '';
}
const wanted = {
	'extensions.autoDisableScopes': '0',
	'extensions.enabledScopes': '15'
};
for (const [name, value] of Object.entries(wanted)) {
	const line = `user_pref("${name}", ${value});`;
	if (!prefs.includes(`user_pref("${name}"`)) {
		prefs = `${prefs.replace(/\s*$/, '')}\n${line}\n`;
	}
}
fs.writeFileSync(prefsPath, prefs);

const registryPath = path.join(profileDir, 'extensions.json');
let registry = { schemaVersion: 37, addons: [] };
try {
	const previous = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
	if (Array.isArray(previous.addons)) {
		registry = { schemaVersion: previous.schemaVersion || 37, addons: previous.addons };
	}
}
catch (e) {
	// fresh registry
}

const now = Date.now();
const record = {
	id,
	syncGUID: `{${crypto.randomUUID()}}`,
	version,
	type: 'extension',
	loader: null,
	updateURL: null,
	installOrigins: null,
	manifestVersion: manifest.manifest_version,
	optionsURL: null,
	optionsType: null,
	optionsBrowserStyle: true,
	aboutURL: null,
	defaultLocale: {
		name: manifest.name,
		description: manifest.description,
		creator: manifest.author || null,
		homepageURL: manifest.homepage_url || null,
		developers: null,
		translators: null,
		contributors: null
	},
	visible: true,
	active: true,
	userDisabled: false,
	appDisabled: false,
	embedderDisabled: false,
	installDate: now,
	updateDate: now,
	applyBackgroundUpdates: 1,
	path: target,
	skinnable: false,
	sourceURI: null,
	releaseNotesURI: null,
	softDisabled: false,
	foreignInstall: false,
	strictCompatibility: true,
	locales: [],
	targetApplications: [{
		id: 'zotero@zotero.org',
		minVersion: manifest.applications.zotero.strict_min_version,
		maxVersion: manifest.applications.zotero.strict_max_version
	}],
	targetPlatforms: [],
	signedState: 0,
	signedTypes: [],
	signedDate: null,
	seen: true,
	dependencies: [],
	incognito: 'spanning',
	userPermissions: { permissions: [], origins: [], data_collection: [] },
	optionalPermissions: { permissions: [], origins: [], data_collection: [] },
	requestedPermissions: { permissions: [], origins: [], data_collection: [] },
	icons: manifest.icons,
	iconURL: null,
	blocklistAttentionDismissed: false,
	blocklistState: 0,
	blocklistURL: null,
	startupData: null,
	hidden: false,
	installTelemetryInfo: { source: 'about:addons', method: 'drag-and-drop' },
	recommendationState: null,
	rootURI: `jar:${url.pathToFileURL(target).href}!/`,
	location: 'app-profile'
};

registry.addons = registry.addons.filter(addon => addon.id !== id).concat(record);
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log(`installed ${id}@${version} into ${profileDir}`);
