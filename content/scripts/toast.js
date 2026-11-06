/**
 * Reader-scoped toast notifications (bottom-center, auto-dismiss).
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	const CONTAINER_ID = 'moonlit-toasts';

	function containerFor(doc) {
		let el = doc.getElementById(CONTAINER_ID);
		if (!el) {
			el = M.Dom.h(doc, 'div', { class: 'ml-toast-wrap', id: CONTAINER_ID });
			doc.body.appendChild(el);
		}
		return el;
	}

	/**
	 * @param {Document} doc reader document
	 * @param {string} message
	 * @param {{type?:'info'|'error'|'success', timeout?:number}} [options]
	 */
	function show(doc, message, options = {}) {
		if (!doc || !message) {
			return;
		}
		const type = options.type || 'info';
		const wrap = containerFor(doc);
		const icon = type === 'error' ? 'alert' : (type === 'success' ? 'check' : 'sparkle');
		const toast = M.Dom.h(doc, 'div', {
			class: `ml-toast ml-${type}`,
			attrs: { role: 'status' }
		}, [
			M.Dom.h(doc, 'span', { html: M.Icons.get(icon), style: { display: 'inline-flex' } }),
			M.Dom.h(doc, 'span', { text: message })
		]);
		wrap.appendChild(toast);
		const timeout = options.timeout ?? (type === 'error' ? 5200 : 2600);
		setTimeout(() => {
			toast.classList.add('ml-leaving');
			setTimeout(() => toast.remove(), 220);
		}, timeout);
	}

	M.Toast = { show };
})();
