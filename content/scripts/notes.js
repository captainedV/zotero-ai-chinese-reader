/* global Zotero */

/**
 * Turns AI output into a real Zotero note, so summaries and key points survive
 * in the library next to the paper instead of living only inside the reader.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	const TAG = 'Moonlit AI';

	function escapeHTML(text) {
		return String(text ?? '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	/**
	 * Resolve the note's owner: the regular item when the PDF lives in one,
	 * otherwise `{ standalone: true, attachment }` because Zotero refuses notes
	 * parented to an attachment.
	 */
	function targetItem(reader) {
		try {
			const attachment = Zotero.Items.get(reader?.itemID);
			if (!attachment) {
				return null;
			}
			if (attachment.parentID) {
				const parent = Zotero.Items.get(attachment.parentID);
				if (parent && (!parent.isRegularItem || parent.isRegularItem())) {
					return { item: parent, attachment, standalone: false };
				}
			}
			return { item: attachment, attachment, standalone: true };
		}
		catch (e) {
			return null;
		}
	}

	function numberedList(points) {
		if (!points?.length) {
			return '';
		}
		const items = points.map(point => {
			const quote = point.quote ? `<i>${escapeHTML(point.quote)}</i>` : '';
			const note = point.note ? `<div>${escapeHTML(point.note)}</div>` : '';
			const page = Number.isFinite(point.pageIndex) ? ` <small>(p.${point.pageIndex + 1})</small>` : '';
			return `<li><div>${escapeHTML(point.label || '')}${page}</div>${quote}${note}</li>`;
		});
		return `<ul>${items.join('')}</ul>`;
	}

	function buildHTML({ title, meta, summaryMarkdown, points, includeKeyPoints = true }) {
		const parts = [];
		parts.push(`<h1>${escapeHTML(title || M.I18n.t('note.untitled'))}</h1>`);
		if (meta) {
			parts.push(`<p><i>${escapeHTML(meta)}</i></p>`);
		}
		if (summaryMarkdown) {
			parts.push(M.Markdown.render(summaryMarkdown));
		}
		if (includeKeyPoints && points?.length) {
			parts.push(`<h2>${escapeHTML(M.I18n.t('note.keyPoints'))}</h2>`);
			parts.push(numberedList(points));
		}
		parts.push(`<p><small>${escapeHTML(M.I18n.t('note.footer'))}</small></p>`);
		return parts.filter(Boolean).join('\n');
	}

	/**
	 * Save the current AI output as a Zotero note.
	 * @param {Object} reader
	 * @param {{title?:string, meta?:string, summaryMarkdown?:string, points?:Object[]}} payload
	 * @returns {Promise<{noteID:number, title:string}|null>}
	 */
	async function save(reader, payload = {}) {
		const target = targetItem(reader);
		if (!target) {
			return null;
		}
		const { item, attachment, standalone } = target;
		const title = payload.title || item.getField?.('title') || '';
		const html = buildHTML({ ...payload, title });
		const note = new Zotero.Item('note');
		note.libraryID = item.libraryID;
		if (!standalone) {
			note.parentID = item.id;
		}
		note.setNote(html);
		if (standalone && attachment?.id) {
			try {
				note.addRelatedItem(attachment.id);
			}
			catch (e) {
				// relations are optional
			}
		}
		await note.saveTx();
		try {
			note.addTag(TAG);
			await note.saveTx();
		}
		catch (e) {
			// tags are cosmetic; the note itself is what matters
		}
		return { noteID: note.id, title };
	}

	M.Notes = {
		TAG,
		save,
		buildHTML,
		targetItem
	};
})();
