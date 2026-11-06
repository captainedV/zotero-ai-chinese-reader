/**
 * Zotero calls `uninstall` on the outgoing version while upgrading and
 * downgrading (reasons 7 and 8). Wiping the preferences there reset the API key,
 * provider and model on every update, and the new version then looked broken:
 * no requests, no progress, no message. The cleanup must stay bound to a real
 * uninstall (reason 6).
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, assert, assertEqual, summary } from './harness.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'bootstrap.js'), 'utf8');

function makeEnv(seed) {
	const store = new Map(Object.entries(seed));
	const branch = {
		getChildList: () => [...store.keys()],
		clearUserPref: (name) => store.delete(name),
		prefHasUserValue: (name) => store.has(name)
	};
	const Services = {
		prefs: {
			getBranch: (prefix) => ({
				getChildList: () => [...store.keys()].filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length)),
				clearUserPref: (name) => store.delete(prefix + name),
				prefHasUserValue: (name) => store.has(prefix + name),
				setStringPref: (name, value) => store.set(prefix + name, value)
			})
		},
		scriptloader: { loadSubScript() {}, loadSubScriptWithOptions() {} },
		obs: { notifyObservers() {}, addObserver() {}, removeObserver() {} }
	};
	const fn = new Function('Services', 'Zotero', 'Components', 'IOUtils', 'PathUtils', 'rootURI', 'globalThis_moonlit',
		`${source}\nreturn { uninstall };`);
	const api = fn(Services, { debug() {}, initializationPromise: Promise.resolve(), Prefs: {} }, {}, {}, {}, '', {});
	return { store, api, branch };
}

const SEED = {
	'extensions.zotero.moonlit.apiKey': 'sk-live',
	'extensions.zotero.moonlit.baseURL': 'https://llm-center.modelbest.co/llm/v1',
	'extensions.zotero.moonlit.provider': 'openai'
};

test('an upgrade keeps the user configuration', () => {
	const { store, api } = makeEnv(SEED);
	api.uninstall({ id: 'moonlit-reader@dsh.local' }, 7);
	assertEqual(store.size, 3, 'an upgrade must not clear preferences');
	assertEqual(store.get('extensions.zotero.moonlit.apiKey'), 'sk-live');
});

test('a downgrade keeps the user configuration', () => {
	const { store, api } = makeEnv(SEED);
	api.uninstall({ id: 'moonlit-reader@dsh.local' }, 8);
	assert(store.has('extensions.zotero.moonlit.provider'), 'a downgrade must not clear preferences');
});

test('an unknown or missing reason keeps the user configuration', () => {
	const { store, api } = makeEnv(SEED);
	api.uninstall({ id: 'moonlit-reader@dsh.local' }, undefined);
	api.uninstall({ id: 'moonlit-reader@dsh.local' }, 1);
	assertEqual(store.size, 3, 'only a real uninstall may clear preferences');
});

test('a real uninstall still cleans up', () => {
	const { store, api } = makeEnv(SEED);
	api.uninstall({ id: 'moonlit-reader@dsh.local' }, 6);
	assertEqual(store.size, 0, 'reason 6 is a real uninstall');
});

test('the string form of the uninstall reason is understood', () => {
	const { store, api } = makeEnv(SEED);
	api.uninstall({ id: 'moonlit-reader@dsh.local' }, 'ADDON_UNINSTALL');
	assertEqual(store.size, 0);
});

summary();
