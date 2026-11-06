/**
 * The connection settings must survive a profile that loses them: Zotero rewrites
 * prefs.js from memory, and an empty provider/model/key makes the plugin look
 * completely broken with no explanation on screen.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadPlugin, testAsync, assert, assertEqual, summary } from './harness.mjs';

// Minimal stand-ins for the Gecko file helpers the module expects.
globalThis.PathUtils = globalThis.PathUtils || { join: (...parts) => path.join(...parts) };
globalThis.IOUtils = globalThis.IOUtils || {
	async readUTF8(file) {
		return fs.readFileSync(file, 'utf8');
	},
	async writeUTF8(file, text) {
		fs.writeFileSync(file, text);
	},
	async makeDirectory(target) {
		fs.mkdirSync(target, { recursive: true });
	},
	async stat(file) {
		return { size: fs.statSync(file).size };
	},
	async setPermissions() {
		// no-op in Node
	}
};

const M = loadPlugin('i18n.js', 'util.js');
M.I18n.init('zh-CN');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moonlit-cfg-'));
M.Paths.dataDir = () => dir;
M.Paths.ensureDataDir = async () => {
	fs.mkdirSync(dir, { recursive: true });
	return dir;
};

await testAsync('a complete configuration is written to disk', async () => {
	M.Prefs.set('provider', 'openai');
	M.Prefs.set('model', 'deepseek-v4.1-flash-mb');
	M.Prefs.set('baseURL', 'https://llm-center.modelbest.co/llm/v1');
	M.Prefs.set('apiKey', 'sk-test-123');
	await M.ConfigBackup.save();
	const file = path.join(dir, 'config.json');
	assert(fs.existsSync(file), 'config.json was not written');
	const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
	assertEqual(saved.provider, 'openai');
	assertEqual(saved.baseURL, 'https://llm-center.modelbest.co/llm/v1');
});

await testAsync('an incomplete configuration is not backed up', async () => {
	M.Prefs.clear('apiKey');
	M.Prefs.clear('provider');
	M.Prefs.clear('model');
	M.Prefs.clear('baseURL');
	await M.ConfigBackup.save();
	const saved = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
	assertEqual(saved.apiKey, 'sk-test-123', 'the old backup must not be overwritten by an empty state');
});

await testAsync('lost settings are restored from the backup', async () => {
	const restored = await M.ConfigBackup.restore();
	assert(restored.includes('apiKey'), `restored: ${JSON.stringify(restored)}`);
	assertEqual(M.Prefs.getString('provider', ''), 'openai');
	assertEqual(M.Prefs.getString('model', ''), 'deepseek-v4.1-flash-mb');
	assertEqual(M.Prefs.getString('baseURL', ''), 'https://llm-center.modelbest.co/llm/v1');
});

await testAsync('existing settings are never overwritten by the backup', async () => {
	M.Prefs.set('model', 'my-new-model');
	const restored = await M.ConfigBackup.restore();
	assert(!restored.includes('model'), 'model was overwritten');
	assertEqual(M.Prefs.getString('model', ''), 'my-new-model');
});

await testAsync('a corrupt backup file is ignored', async () => {
	fs.writeFileSync(path.join(dir, 'config.json'), '{not json');
	assertEqual(await M.ConfigBackup.read(), null);
	assertEqual(await M.ConfigBackup.restore(), []);
});

fs.rmSync(dir, { recursive: true, force: true });
summary();
