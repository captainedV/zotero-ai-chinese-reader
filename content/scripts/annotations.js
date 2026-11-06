/* global Zotero */

/**
 * Creates and removes real Zotero highlight annotations for the AI key points,
 * so results show up in Zotero's own annotation sidebar, notes and sync.
 */
(function () {
	const M = globalThis.Moonlit || (globalThis.Moonlit = {});

	const TAG = 'Moonlit AI';
	const COMMENT_PREFIX = '✦ ';

	function pad(value, length) {
		return String(Math.max(0, Math.round(value))).slice(0, length).padStart(length, '0');
	}

	/** pdf.js/Zotero sortIndex format for PDF annotations. */
	function sortIndex(pageIndex, top) {
		return `${pad(pageIndex, 5)}|${pad(0, 6)}|${pad(top, 5)}`;
	}

	function colorFor(type, fallback) {
		const map = M.Prompts.HIGHLIGHT_TYPES[type];
		return (map && map.color) || fallback || '#ffd400';
	}

	async function getAttachment(reader) {
		const item = Zotero.Items.get(reader.itemID) || await Zotero.Items.getAsync(reader.itemID);
		if (!item || !item.isPDFAttachment?.()) {
			return null;
		}
		return item;
	}

	/**
	 * @param {Object} reader
	 * @param {Array<{pageIndex:number, rects:number[][], quote:string, note?:string,
	 *   type?:string, color?:string}>} points
	 * @returns {Promise<{created:number, skipped:number, ids:number[]}>}
	 */
	async function createHighlights(reader, points) {
		const attachment = await getAttachment(reader);
		if (!attachment) {
			throw new Error('no-attachment');
		}
		const existing = new Set(
			attachment.getAnnotations()
				.map(id => Zotero.Items.get(id))
				.filter(item => item && isOurs(item))
				.map(item => M.Util.normalizeForMatch(item.annotationText || ''))
		);

		M.Log.debug('creating highlights', { points: points.length, existing: existing.size });
		let created = 0;
		let skipped = 0;
		const ids = [];
		for (const point of points) {
			const key = M.Util.normalizeForMatch(point.quote || '');
			if (!point.rects?.length || !key) {
				skipped++;
				continue;
			}
			if (existing.has(key)) {
				skipped++;
				continue;
			}
			const rects = point.rects;
			const top = Math.max(...rects.map(r => r[3]));
			const item = new Zotero.Item('annotation');
			item.libraryID = attachment.libraryID;
			item.parentID = attachment.id;
			item.annotationType = 'highlight';
			item.annotationText = point.quote;
			item.annotationComment = point.note ? COMMENT_PREFIX + point.note : COMMENT_PREFIX.trim();
			item.annotationColor = colorFor(point.type, point.color);
			item.annotationPageLabel = String((point.pageIndex ?? 0) + 1);
			item.annotationSortIndex = sortIndex(point.pageIndex ?? 0, top);
			item.annotationPosition = JSON.stringify({
				pageIndex: point.pageIndex ?? 0,
				rects
			});
			item.addTag(TAG);
			try {
				await item.saveTx();
				ids.push(item.id);
				created++;
				existing.add(key);
			}
			catch (e) {
				M.Log.error('failed to save annotation', e);
				skipped++;
			}
		}
		M.Log.debug('highlights created', { created, skipped });
		return { created, skipped, ids };
	}

	function isOurs(item) {
		try {
			if (!item?.isAnnotation?.()) {
				return false;
			}
			const tags = (item.getTags?.() || []).map(tag => tag.tag);
			if (tags.includes(TAG)) {
				return true;
			}
			return String(item.annotationComment || '').startsWith(COMMENT_PREFIX);
		}
		catch (e) {
			return false;
		}
	}

	/**
	 * Annotation ids for an attachment, read from the database: the in-memory
	 * `attachment.getAnnotations()` list is stale right after we save new items.
	 */
	async function annotationIDs(attachmentID) {
		try {
			const ids = await Zotero.DB.columnQueryAsync(
				'SELECT itemID FROM itemAnnotations WHERE parentItemID=?',
				[attachmentID]
			);
			return (ids || []).map(Number).filter(Boolean);
		}
		catch (e) {
			M.Log.debug('annotationIDs query failed', e);
			try {
				return Zotero.Items.get(attachmentID)?.getAnnotations() || [];
			}
			catch (error) {
				return [];
			}
		}
	}

	/** All annotations this plugin created for the reader's attachment. */
	async function listOurs(reader) {
		const attachment = Zotero.Items.get(reader?.itemID);
		if (!attachment) {
			return [];
		}
		const ids = await annotationIDs(attachment.id);
		if (!ids.length) {
			return [];
		}
		const items = await Zotero.Items.getAsync(ids);
		return (items || []).filter(item => item && isOurs(item));
	}

	async function removeOurs(reader) {
		const items = await listOurs(reader);
		if (!items.length) {
			return 0;
		}
		await Zotero.DB.executeTransaction(async () => {
			for (const item of items) {
				await item.erase();
			}
		});
		return items.length;
	}

	M.Annotations = {
		TAG,
		COMMENT_PREFIX,
		sortIndex,
		createHighlights,
		removeOurs,
		listOurs,
		annotationIDs,
		isOurs
	};
})();
