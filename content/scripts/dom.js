/**
 * Tiny DOM helpers. Elements are always created with the *reader's own*
 * document (`doc`), which is required when injecting UI into the reader iframe.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	function h(doc, tag, props = {}, children = []) {
		const el = doc.createElement(tag);
		if (props.class) {
			el.className = props.class;
		}
		if (props.id) {
			el.id = props.id;
		}
		if (props.text !== undefined) {
			el.textContent = props.text;
		}
		if (props.html !== undefined) {
			el.innerHTML = props.html;
		}
		if (props.attrs) {
			for (const [name, value] of Object.entries(props.attrs)) {
				if (value !== undefined && value !== null && value !== false) {
					el.setAttribute(name, value === true ? '' : String(value));
				}
			}
		}
		if (props.style) {
			for (const [name, value] of Object.entries(props.style)) {
				el.style.setProperty(name, value);
			}
		}
		if (props.dataset) {
			for (const [name, value] of Object.entries(props.dataset)) {
				el.dataset[name] = value;
			}
		}
		if (props.on) {
			for (const [name, handler] of Object.entries(props.on)) {
				el.addEventListener(name, handler);
			}
		}
		const list = Array.isArray(children) ? children : [children];
		for (const child of list) {
			if (child === null || child === undefined || child === false) {
				continue;
			}
			el.append(child.nodeType ? child : doc.createTextNode(String(child)));
		}
		return el;
	}

	function iconButton(doc, icon, title, onClick, extraClass = '') {
		return h(doc, 'button', {
			class: `ml-icon-btn ${extraClass}`.trim(),
			attrs: { type: 'button', title, 'aria-label': title },
			html: M.Icons.get(icon),
			on: {
				click: (event) => {
					event.preventDefault();
					event.stopPropagation();
					onClick?.(event);
				}
			}
		});
	}

	function button(doc, { label, icon, variant = '', onClick, title, disabled = false } = {}) {
		const el = h(doc, 'button', {
			class: `ml-btn ${variant}`.trim(),
			attrs: { type: 'button', title: title || label || '', disabled },
			on: {
				click: (event) => {
					event.preventDefault();
					event.stopPropagation();
					if (!disabled) {
						onClick?.(event);
					}
				}
			}
		});
		if (icon) {
			el.append(h(doc, 'span', { html: M.Icons.get(icon), style: { display: 'inline-flex' } }));
		}
		if (label) {
			el.append(doc.createTextNode(label));
		}
		return el;
	}

	function switchControl(doc, checked, onChange) {
		const el = h(doc, 'button', {
			class: 'ml-switch',
			attrs: {
				type: 'button',
				role: 'switch',
				'aria-checked': checked ? 'true' : 'false'
			},
			on: {
				click: (event) => {
					event.preventDefault();
					event.stopPropagation();
					const next = el.getAttribute('aria-checked') !== 'true';
					el.setAttribute('aria-checked', next ? 'true' : 'false');
					onChange?.(next);
				}
			}
		});
		return el;
	}

	/** Replace all children of `el` with `children`, keeping scroll position sane. */
	function setChildren(el, children) {
		el.replaceChildren(...[].concat(children).filter(Boolean));
		return el;
	}

	function clear(el) {
		if (el) {
			el.replaceChildren();
		}
	}

	function closest(target, selector) {
		try {
			return target?.closest?.(selector) ?? null;
		}
		catch (e) {
			return null;
		}
	}

	M.Dom = { h, button, iconButton, switchControl, setChildren, clear, closest };
})();
