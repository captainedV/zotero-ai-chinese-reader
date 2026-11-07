/**
 * Feature state ↔ UI alignment.
 *
 * The switch is the user's intent; the dock task is what is actually running.
 * These scenarios drive every transition and assert that the two never disagree:
 * switch, status line, toolbar button, dock row and cache record.
 */
import { loadPlugin, testAsync, assert, assertEqual, summary } from './harness.mjs';

const M = loadPlugin('i18n.js', 'util.js', 'latex.js', 'markdown.js', 'prompts.js', 'ai.js', 'mock.js', 'usage.js');
M.I18n.init('zh-CN');
M.Prefs.set('provider', 'mock');
M.Prefs.set('apiKey', 'test-key');

/**
 * A minimal stand-in for the reader app: the same state machine the real
 * reader-ui uses, with the DOM side reduced to what we assert on.
 */
function makeApp({ record } = {}) {
	const app = {
		featureFlags: { translate: false, summary: false, highlight: false },
		flagEpoch: 0,
		record: record || { attachmentKey: 'PAPER1', translation: {}, summary: null, highlights: [] },
		tasks: new Map(),
		button: { classes: new Set(), attrs: {}, classList: {
			toggle(name, on) { on ? app.button.classes.add(name) : app.button.classes.delete(name); },
			contains(name) { return app.button.classes.has(name); }
		}, setAttribute(name, value) { app.button.attrs[name] = value; } },
		popoverRows: [],
		busyCount: 0,
		started: [],
		refuse: false
	};
	app.isFeatureOn = name => !!app.featureFlags[name];
	app.anyFeatureOn = () => Object.values(app.featureFlags).some(Boolean);
	app.dock = {
		getTask: name => app.tasks.get(name) || null,
		setTask: (name, patch) => {
			if (patch === null) {
				app.tasks.delete(name);
			}
			else {
				app.tasks.set(name, { id: name, done: 0, total: 0, ...(app.tasks.get(name) || {}), ...patch });
			}
			app.onTaskChange?.(name, app.tasks.get(name) || null);
		},
		open() {},
		close() {}
	};
	app.featureState = name => {
		const on = app.isFeatureOn(name);
		const task = app.dock.getTask(name);
		if (task?.state === 'running') {
			return 'running';
		}
		if (task?.state === 'error') {
			return 'error';
		}
		if (!on) {
			return task?.state === 'paused' ? 'paused' : 'off';
		}
		if (task?.state === 'paused') {
			return 'paused';
		}
		if (task?.state === 'done') {
			return 'done';
		}
		return 'ready';
	};
	app.featureStatusText = name => {
		const state = app.featureState(name);
		const task = app.dock.getTask(name);
		const progress = task && task.total ? ` ${task.done}/${task.total}` : '';
		return `${state}${progress}`;
	};
	app.setButtonState = () => {
		const states = ['translate', 'summary', 'highlight'].map(name => app.featureState(name));
		const anyOn = app.anyFeatureOn();
		const running = states.includes('running') || app.busyCount > 0;
		const paused = states.includes('paused');
		const failed = states.includes('error');
		app.button.classList.toggle('ml-on', anyOn);
		app.button.classList.toggle('ml-busy', running);
		app.button.classList.toggle('ml-paused', paused && !running);
		app.button.classList.toggle('ml-error', failed);
		app.button.setAttribute('aria-label', failed ? 'error' : running ? 'running' : paused ? 'paused' : anyOn ? 'on' : 'off');
	};
	app.syncFeatureUi = () => {
		app.setButtonState();
		for (const row of app.popoverRows) {
			row.checked = app.isFeatureOn(row.name);
			row.status = app.featureStatusText(row.name);
			row.state = app.featureState(row.name);
		}
	};
	app.setFeature = (name, value, { user = false } = {}) => {
		const next = !!value;
		if (app.featureFlags[name] === next) {
			app.syncFeatureUi();
			return next;
		}
		app.featureFlags[name] = next;
		if (user) {
			app.flagEpoch += 1;
		}
		if (app.record) {
			app.record.enabled = { ...app.featureFlags };
		}
		app.syncFeatureUi();
		return next;
	};
	app.onTaskChange = () => app.syncFeatureUi();
	app.runFeature = async (name) => {
		if (app.refuse) {
			return false;
		}
		app.started.push(name);
		app.setFeature(name, true);
		// Resuming keeps the numbers of the paused run; a fresh start begins at 0.
		const existing = app.dock.getTask(name);
		const done = existing && existing.total ? existing.done : 0;
		const total = existing && existing.total ? existing.total : 10;
		app.dock.setTask(name, { state: 'running', done, total });
		return true;
	};
	app.applyFeatureState = async (key, value) => {
		const map = { enableTranslate: 'translate', enableSummary: 'summary', enableHighlight: 'highlight' };
		const name = map[key];
		app.setFeature(name, !!value, { user: true });
		if (value) {
			const started = await app.runFeature(name);
			if (!started) {
				app.setFeature(name, false);
			}
			app.syncFeatureUi();
		}
		else {
			const task = app.dock.getTask(name);
			if (task?.state === 'running') {
				app.dock.setTask(name, { state: 'paused', done: task.done, total: task.total });
			}
			app.syncFeatureUi();
		}
	};
	app.syncFeatureUi();
	return app;
}

function withPopover(app, names) {
	app.popoverRows = names.map(name => ({ name, checked: false, status: '', state: '' }));
	app.syncFeatureUi();
	return app.popoverRows;
}

await testAsync('a new paper starts with every switch off and the button neutral', async () => {
	const app = makeApp({ record: { attachmentKey: 'P2', translation: {} } });
	const rows = withPopover(app, ['translate', 'summary', 'highlight']);
	assertEqual(rows.map(row => row.checked), [false, false, false]);
	assertEqual(rows.map(row => row.state), ['off', 'off', 'off']);
	assert(!app.button.classList.contains('ml-on'));
	assertEqual(app.button.attrs['aria-label'], 'off');
});

await testAsync('switching on starts the run and every surface agrees', async () => {
	const app = makeApp();
	const rows = withPopover(app, ['translate']);
	await app.applyFeatureState('enableTranslate', true);
	assertEqual(app.featureFlags.translate, true);
	assertEqual(rows[0].checked, true, 'switch');
	assertEqual(app.featureState('translate'), 'running', 'derived state');
	assert(/^running/.test(rows[0].status), rows[0].status);
	assert(app.button.classList.contains('ml-on'), 'button on');
	assert(app.button.classList.contains('ml-busy'), 'button busy');
	assertEqual(app.button.attrs['aria-label'], 'running');
	assertEqual(app.record.enabled.translate, true, 'persisted for this paper');
});

await testAsync('switching off mid-run keeps the work and reports paused', async () => {
	const app = makeApp();
	const rows = withPopover(app, ['translate']);
	await app.applyFeatureState('enableTranslate', true);
	app.dock.setTask('translate', { state: 'running', done: 4, total: 10 });
	await app.applyFeatureState('enableTranslate', false);
	assertEqual(app.featureFlags.translate, false);
	assertEqual(rows[0].checked, false, 'switch off');
	assertEqual(app.featureState('translate'), 'paused');
	assertEqual(rows[0].status, 'paused 4/10', 'numbers survive the toggle');
	assert(!app.button.classList.contains('ml-busy'), 'button not busy');
	assert(app.button.classList.contains('ml-paused'), 'button shows paused');
	assertEqual(app.record.enabled.translate, false);
});

await testAsync('switching back on resumes without starting a second run', async () => {
	const app = makeApp();
	await app.applyFeatureState('enableTranslate', true);
	app.dock.setTask('translate', { state: 'paused', done: 4, total: 10 });
	await app.applyFeatureState('enableTranslate', true);
	assertEqual(app.featureState('translate'), 'running');
	const task = app.dock.getTask('translate');
	assertEqual([task.done, task.total], [4, 10], 'resuming keeps the progress');
	assertEqual(app.featureFlags.translate, true);
});

await testAsync('a refused start rolls the switch back instead of lying', async () => {
	const app = makeApp();
	app.refuse = true;
	const rows = withPopover(app, ['translate']);
	await app.applyFeatureState('enableTranslate', true);
	assertEqual(app.featureFlags.translate, false, 'switch must not stay on');
	assertEqual(rows[0].checked, false, 'row matches');
	assertEqual(app.featureState('translate'), 'off');
	assert(!app.button.classList.contains('ml-on'));
});

await testAsync('a finished run shows done, then settles to ready when cleared', async () => {
	const app = makeApp();
	const rows = withPopover(app, ['summary']);
	await app.applyFeatureState('enableSummary', true);
	app.dock.setTask('summary', { state: 'done', done: 1, total: 1 });
	assertEqual(app.featureState('summary'), 'done');
	assertEqual(rows[0].status, 'done 1/1');
	app.dock.setTask('summary', null);
	assertEqual(app.featureState('summary'), 'ready', 'switch still on, nothing running');
});

await testAsync('a failed run keeps the switch on but wears the error state', async () => {
	const app = makeApp();
	const rows = withPopover(app, ['highlight']);
	await app.applyFeatureState('enableHighlight', true);
	app.dock.setTask('highlight', { state: 'error', done: 0, total: 0 });
	assertEqual(app.featureState('highlight'), 'error');
	assertEqual(rows[0].state, 'error');
	assert(app.button.classList.contains('ml-error'), 'button error ring');
	assertEqual(app.button.attrs['aria-label'], 'error');
});

await testAsync('two features can be in different states at once', async () => {
	const app = makeApp();
	const rows = withPopover(app, ['translate', 'summary', 'highlight']);
	await app.applyFeatureState('enableTranslate', true);
	await app.applyFeatureState('enableSummary', true);
	app.dock.setTask('summary', { state: 'paused', done: 2, total: 5 });
	assertEqual(rows.map(row => row.state), ['running', 'paused', 'off']);
	assert(app.button.classList.contains('ml-busy'), 'running dominates the button');
	assert(!app.button.classList.contains('ml-paused'));
});

await testAsync('a slow flag load cannot undo a click made while it was loading', async () => {
	const app = makeApp({ record: { attachmentKey: 'P3', enabled: { translate: false }, translation: {} } });
	let resolveLoad;
	const slow = new Promise(resolve => { resolveLoad = resolve; });
	// The real loader captures the epoch before awaiting.
	const epochAtStart = app.flagEpoch;
	const loading = slow.then(() => {
		if (app.flagEpoch === epochAtStart) {
			app.featureFlags = { translate: false, summary: false, highlight: false };
		}
		app.syncFeatureUi();
	});
	app.setFeature('translate', true, { user: true });
	resolveLoad();
	await loading;
	assertEqual(app.featureFlags.translate, true, 'the click wins over the stale record');
});

await testAsync('every switch writes only its own paper record', async () => {
	const recordA = { attachmentKey: 'A', translation: {} };
	const recordB = { attachmentKey: 'B', translation: {} };
	const app = makeApp({ record: recordA });
	app.setFeature('summary', true, { user: true });
	assertEqual(recordA.enabled.summary, true);
	assertEqual(recordB.enabled, undefined, 'another paper keeps no flags');
});

await testAsync('the status text matches the state in every combination', async () => {
	const cases = [
		[{ flag: false, task: null }, 'off'],
		[{ flag: false, task: { state: 'paused', done: 3, total: 9 } }, 'paused 3/9'],
		[{ flag: true, task: null }, 'ready'],
		[{ flag: true, task: { state: 'running', done: 2, total: 9 } }, 'running 2/9'],
		[{ flag: true, task: { state: 'paused', done: 2, total: 9 } }, 'paused 2/9'],
		[{ flag: true, task: { state: 'done', done: 9, total: 9 } }, 'done 9/9'],
		[{ flag: true, task: { state: 'error' } }, 'error'],
		[{ flag: true, task: { state: 'running', done: 0, total: 0 } }, 'running']
	];
	for (const [input, expected] of cases) {
		const app = makeApp();
		app.featureFlags.translate = input.flag;
		if (input.task) {
			app.tasks.set('translate', { id: 'translate', ...input.task });
		}
		assertEqual(app.featureStatusText('translate'), expected, JSON.stringify(input));
	}
});

summary();
