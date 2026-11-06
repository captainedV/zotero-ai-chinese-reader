/**
 * Inline SVG icons (no external assets, so nothing can fail to load).
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	const svg = (body, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
		stroke-linecap="round" stroke-linejoin="round" ${extra} aria-hidden="true">${body}</svg>`;

	const ICONS = {
		// Crescent moon with a sparkle — the plugin mark.
		moon: `<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8 8.5 8.5 0 1 0 20.2 14.6Z" fill="currentColor"/>
			<path d="M17.6 3.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" fill="currentColor" opacity=".85"/>
		</svg>`,
		sparkle: svg('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/>'),
		summary: svg('<path d="M5 4.5h11l3 3v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19.5v-13A1.5 1.5 0 0 1 5 4.5Z"/><path d="M8 9.5h8M8 13h8M8 16.5h5"/>'),
		translate: svg('<path d="M4 6h8M8 4v2c0 3.6-2 6.6-4.5 8"/><path d="M6 10.5c1.2 2 3 3.6 5 4.5"/><path d="M13 20l4-10 4 10"/><path d="M14.5 16.5h5"/>'),
		highlight: svg('<path d="M5 17h4l8.5-8.5a2.1 2.1 0 0 0-3-3L6 14v3Z"/><path d="M4 21h16"/>'),
		settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H2.8a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.5 8a1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/>'),
		close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
		refresh: svg('<path d="M20 11a8 8 0 1 0-.6 4"/><path d="M20 5v6h-6"/>'),
		stop: svg('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>'),
		copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M6 15H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/>'),
		jump: svg('<path d="M9 6l6 6-6 6"/>'),
		play: svg('<path d="M8 5.5l10 6.5-10 6.5z" fill="currentColor" stroke="none"/>'),
		check: svg('<path d="M4.5 12.5l5 5 10-11"/>'),
		alert: svg('<path d="M12 4.5l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/>'),
		trash: svg('<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>'),
		eye: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>'),
		braces: svg('<path d="M9 4H7a2 2 0 0 0-2 2v3.5L3.5 12 5 14.5V18a2 2 0 0 0 2 2h2"/><path d="M15 4h2a2 2 0 0 1 2 2v3.5L20.5 12 19 14.5V18a2 2 0 0 1-2 2h-2"/>'),
		book: svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 19V5.5"/>')
	};

	M.Icons = {
		get(name) {
			return ICONS[name] || '';
		},
		/** Create an element from an icon string. */
		node(doc, name) {
			const span = doc.createElement('span');
			span.className = 'ml-icon';
			span.style.display = 'inline-flex';
			span.innerHTML = this.get(name);
			return span;
		},
		svg
	};
})();
