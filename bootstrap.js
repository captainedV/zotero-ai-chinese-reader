/* global Zotero, Services, Components, IOUtils, PathUtils */

/**
 * Moonlit Reader — Zotero 7/8/9 plugin bootstrap.
 *
 * The whole plugin lives on a single sandbox global (`Moonlit`) shared by every
 * script loaded below, so modules talk to each other through `Moonlit.*`.
 */

var Moonlit;

const MOONLIT_SCRIPTS = [
	'content/scripts/i18n.js',
	'content/scripts/util.js',
	'content/scripts/layout.js',
	'content/scripts/sentences.js',
	'content/scripts/quotes.js',
	'content/scripts/markdown.js',
	'content/scripts/prompts.js',
	'content/scripts/ai.js',
	'content/scripts/mock.js',
	'content/scripts/cache.js',
	'content/scripts/usage.js',
	'content/scripts/pdfdoc.js',
	'content/scripts/styles.js',
	'content/scripts/icons.js',
	'content/scripts/dom.js',
	'content/scripts/toast.js',
	'content/scripts/overlay.js',
	'content/scripts/annotations.js',
	'content/scripts/notes.js',
	'content/scripts/dock.js',
	'content/scripts/translate.js',
	'content/scripts/summary.js',
	'content/scripts/highlight.js',
	'content/scripts/reader-ui.js',
	'content/scripts/selftest.js',
	'content/scripts/main.js'
];

function install() {}

// Zotero's own bootstrap reason codes (chrome/content/zotero/xpcom/plugins.js).
// Upgrade/downgrade are *not* uninstallations, even though Zotero calls this
// method for the outgoing version when it is replaced.
const MOONLIT_REASON_ADDON_UNINSTALL = 6;

/**
 * Remove the user's preferences — but only when the plugin is really going away.
 *
 * Zotero calls `uninstall` on the *previous* version during an upgrade and a
 * downgrade (reasons 7 and 8). Wiping preferences there meant every plugin update
 * silently reset the API key, provider and model, and the fresh version then
 * looked broken: no requests, no progress, no explanation. Keep the cleanup for a
 * genuine uninstall and leave everything else untouched.
 */
function uninstall(data, reason) {
	const realUninstall = reason === MOONLIT_REASON_ADDON_UNINSTALL
		|| reason === 'ADDON_UNINSTALL';
	if (!realUninstall) {
		Zotero.debug(`[Moonlit] keeping preferences across uninstall(reason=${reason})`);
		return;
	}
	try {
		const prefs = Services.prefs.getBranch('extensions.zotero.moonlit.');
		for (const name of prefs.getChildList('')) {
			prefs.clearUserPref(name);
		}
	}
	catch (e) {
		// Nothing to clean up
	}
}

async function startup({ id, version, rootURI }, reason) {
	await Zotero.initializationPromise;

	Moonlit = globalThis.Moonlit = globalThis.Moonlit || {};
	Moonlit.id = id;
	Moonlit.version = version;
	Moonlit.rootURI = rootURI;
	Moonlit.reason = reason;

	for (const script of MOONLIT_SCRIPTS) {
		Services.scriptloader.loadSubScript(rootURI + script, globalThis);
	}

	await Moonlit.Main.startup();
}

async function shutdown({ id, version, rootURI }, reason) {
	try {
		await Moonlit?.Main?.shutdown(reason);
	}
	catch (e) {
		Zotero.logError(e);
	}

	if (Moonlit) {
		for (const key of Object.keys(Moonlit)) {
			delete Moonlit[key];
		}
	}
}
