"use strict";

/* JournalLens feed window logic. Opened from journallens.js with
   { Zotero, JournalLens } passed as window arguments. */

var { Zotero, JournalLens } = window.arguments[0];

var State = {
	journals: [],
	activeISSN: null, // null = all journals
	articles: [],
	figureObserver: null,
	articleQuery: "",
	lightboxFigures: [],
	lightboxIndex: 0,
	lightboxZoom: 1,
	lightboxPanX: 0,
	lightboxPanY: 0,
	lightboxDrag: null
};

function S(id) {
	return JournalLens.getString(id);
}

/* ---------------------------------------------------------- *
 * Static labels (re-applied when the language changes)
 * ---------------------------------------------------------- */

function applyStaticLabels() {
	document.documentElement.lang = JournalLens.getUILang();
	document.getElementById("lang-label").textContent = S("lang-label");
	document.getElementById("refresh-btn").textContent = S("refresh");
	document.getElementById("donate-btn").textContent = S("donate");
	document.getElementById("h-followed").textContent = S("followed");
	document.getElementById("h-add").textContent = S("add-journal");
	document.getElementById("journal-search-input").placeholder = S("search-ph");
	document.getElementById("article-search-input").placeholder = S("article-search-ph");
	document.getElementById("lang-option-auto").textContent = S("lang-auto");
	document.getElementById("lang-option-en").textContent = S("lang-en");
	document.getElementById("lang-option-zh").textContent = S("lang-zh");
	updateLanguageButtons();

	// donate modal
	document.getElementById("donate-title").textContent = S("donate-title");
	document.getElementById("donate-intro").textContent = S("donate-intro");
	document.getElementById("cap-paypal").textContent = S("donate-paypal");
	document.getElementById("cap-wechat").textContent = S("donate-wechat");
	document.getElementById("cap-alipay").textContent = S("donate-alipay");
	document.getElementById("donate-thanks").textContent = S("donate-thanks");
	document.getElementById("donate-github").textContent = S("donate-github");
}

function setLanguage(lang) {
	JournalLens.setUILanguage(lang);
	applyStaticLabels();
	renderSidebar();
	renderArticles(State.articles);
}

function updateLanguageButtons() {
	let mode = JournalLens.getUILanguageMode();
	for (let btn of document.querySelectorAll("#lang-toggle button")) {
		let active = btn.dataset.lang === mode;
		btn.classList.toggle("active", active);
		btn.setAttribute("aria-pressed", active ? "true" : "false");
	}
}

/* ---------------------------------------------------------- *
 * Sidebar: followed journals + search
 * ---------------------------------------------------------- */

function renderSidebar() {
	let list = document.getElementById("journal-list");
	list.replaceChildren();

	let allItem = document.createElement("li");
	allItem.classList.toggle("active", State.activeISSN === null);
	let allName = document.createElement("span");
	allName.className = "name";
	allName.textContent = S("all-journals");
	allItem.appendChild(allName);
	allItem.addEventListener("click", () => {
		State.activeISSN = null;
		renderSidebar();
		loadFeed();
	});
	list.appendChild(allItem);

	for (let journal of State.journals) {
		let li = document.createElement("li");
		li.classList.toggle("active", State.activeISSN === journal.issn);
		let name = document.createElement("span");
		name.className = "name";
		name.textContent = journal.title;
		name.title = journal.title + " (" + journal.issn + ")";
		li.appendChild(name);

		let remove = document.createElement("button");
		remove.className = "remove";
		remove.textContent = "✕";
		remove.addEventListener("click", (event) => {
			event.stopPropagation();
			State.journals = JournalLens.unfollowJournal(journal.issn);
			if (State.activeISSN === journal.issn) {
				State.activeISSN = null;
			}
			renderSidebar();
			loadFeed();
		});
		li.appendChild(remove);

		li.addEventListener("click", () => {
			State.activeISSN = journal.issn;
			renderSidebar();
			loadFeed();
		});
		list.appendChild(li);
	}
}

var searchTimer = null;

function initSearch() {
	let input = document.getElementById("journal-search-input");
	input.addEventListener("input", () => {
		if (searchTimer) {
			clearTimeout(searchTimer);
		}
		let query = input.value.trim();
		if (!query) {
			hideSearchResults();
			return;
		}
		searchTimer = setTimeout(() => runJournalSearch(query), 400);
	});
}

function hideSearchResults() {
	let results = document.getElementById("journal-search-results");
	results.hidden = true;
	results.replaceChildren();
}

async function runJournalSearch(query) {
	let results = document.getElementById("journal-search-results");
	results.hidden = false;
	results.replaceChildren();
	let li = document.createElement("li");
	li.textContent = S("searching");
	results.appendChild(li);

	let found = [];
	try {
		if (/^\d{4}-?\d{3}[\dXx]$/.test(query)) {
			let issn = query.length === 8
				? query.slice(0, 4) + "-" + query.slice(4)
				: query;
			found = [await JournalLens.getJournalByISSN(issn.toUpperCase())];
		}
		else {
			found = await JournalLens.searchJournals(query);
		}
	}
	catch (e) {
		Zotero.debug("JournalLens: journal search failed: " + e);
	}

	results.replaceChildren();
	if (!found.length) {
		let empty = document.createElement("li");
		empty.textContent = S("no-results");
		results.appendChild(empty);
		return;
	}
	for (let journal of found) {
		let item = document.createElement("li");
		let name = document.createElement("span");
		name.textContent = journal.title;
		item.appendChild(name);
		let publisher = document.createElement("span");
		publisher.className = "publisher";
		publisher.textContent = journal.publisher + " · " + journal.issn;
		item.appendChild(publisher);
		item.addEventListener("click", () => {
			State.journals = JournalLens.followJournal(journal);
			document.getElementById("journal-search-input").value = "";
			hideSearchResults();
			State.activeISSN = journal.issn;
			renderSidebar();
			loadFeed();
		});
		results.appendChild(item);
	}
}

/* ---------------------------------------------------------- *
 * Feed loading
 * ---------------------------------------------------------- */

async function loadFeed(force = false) {
	let cards = document.getElementById("cards");
	let status = document.getElementById("status");
	cards.replaceChildren();
	State.articles = [];
	if (force && JournalLens.clearCache) {
		JournalLens.clearCache();
	}

	if (!State.journals.length) {
		let empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = S("no-journals");
		cards.appendChild(empty);
		return;
	}

	status.hidden = false;
	status.classList.remove("error");
	status.textContent = S("loading");

	let targets = State.activeISSN
		? State.journals.filter(j => j.issn === State.activeISSN)
		: State.journals;

	let settled = await Promise.allSettled(
		targets.map(j => JournalLens.getFeed(j.issn, { force }))
	);

	let articles = [];
	let failures = 0;
	for (let result of settled) {
		if (result.status === "fulfilled") {
			articles.push(...result.value);
		}
		else {
			failures++;
			Zotero.debug("JournalLens: feed failed: " + result.reason);
		}
	}

	articles.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
	articles = JournalLens.dedupeArticles(articles);
	State.articles = articles;

	if (failures) {
		status.classList.add("error");
		status.textContent = S("loading-failed");
	}
	else {
		status.hidden = true;
	}

	renderArticles(articles);
}

function initArticleSearch() {
	let input = document.getElementById("article-search-input");
	input.addEventListener("input", () => {
		State.articleQuery = input.value.trim();
		renderArticles(State.articles);
	});
}

function articleMatchesSearch(article) {
	if (!State.articleQuery) {
		return true;
	}
	let query = State.articleQuery.toLowerCase();
	let haystack = [
		article.title,
		article.abstract,
		article._tx && article._tx.zh && article._tx.zh.title,
		article._tx && article._tx.zh && article._tx.zh.abstract,
		article._tx && article._tx.en && article._tx.en.title,
		article._tx && article._tx.en && article._tx.en.abstract
	].filter(Boolean).join("\n").toLowerCase();
	return haystack.includes(query);
}

function escapeRegExp(text) {
	return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function setHighlightedText(el, text) {
	el.replaceChildren();
	let query = State.articleQuery;
	if (!query) {
		el.textContent = text || "";
		return;
	}
	let re = new RegExp("(" + escapeRegExp(query) + ")", "ig");
	let parts = String(text || "").split(re);
	for (let part of parts) {
		if (!part) {
			continue;
		}
		if (part.toLowerCase() === query.toLowerCase()) {
			let mark = document.createElement("mark");
			mark.className = "article-match";
			mark.textContent = part;
			el.appendChild(mark);
		}
		else {
			el.appendChild(document.createTextNode(part));
		}
	}
}

function updateArticleSearchCount(total, shown) {
	let count = document.getElementById("article-search-count");
	count.textContent = State.articleQuery ? shown + " / " + total : "";
}

function renderArticles(articles) {
	let cards = document.getElementById("cards");
	cards.replaceChildren();
	let visibleArticles = (articles || []).filter(articleMatchesSearch);
	updateArticleSearchCount((articles || []).length, visibleArticles.length);

	if (!articles || !articles.length) {
		let empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = S("no-articles");
		cards.appendChild(empty);
		return;
	}
	if (!visibleArticles.length) {
		let empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = S("no-matches");
		cards.appendChild(empty);
		return;
	}

	resetFigureObserver();
	let cardsToPrime = [];
	for (let article of visibleArticles) {
		let card = buildCard(article);
		cards.appendChild(card);
		if (card._figuresEl && cardsToPrime.length < 6) {
			cardsToPrime.push(card);
		}
	}
	window.setTimeout(() => {
		for (let card of cardsToPrime) {
			loadFiguresForCard(card);
		}
	}, 200);
}

function buildCard(article) {
	let card = document.createElement("div");
	card.className = "card";

	let body = document.createElement("div");
	body.className = "card-body";
	card.appendChild(body);

	// title
	let title = document.createElement("h3");
	title.className = "card-title";
	title.addEventListener("click", () => Zotero.launchURL(article.url));
	body.appendChild(title);

	// authors
	if (article.authors) {
		let authors = document.createElement("div");
		authors.className = "card-meta";
		authors.textContent = article.authors;
		body.appendChild(authors);
	}

	// journal / date / OA badge
	let meta = document.createElement("div");
	meta.className = "card-meta";
	let journalSpan = document.createElement("span");
	journalSpan.className = "journal";
	journalSpan.textContent = article.journal;
	meta.appendChild(journalSpan);
	let rest = [article.date, article.volume && ("Vol. " + article.volume),
		article.issue && ("No. " + article.issue)].filter(Boolean).join(" · ");
	if (rest) {
		meta.appendChild(document.createTextNode(" · " + rest));
	}
	if (article.isOpenAccess) {
		let badge = document.createElement("span");
		badge.className = "badge-oa";
		badge.textContent = S("oa");
		meta.appendChild(badge);
	}
	body.appendChild(meta);

	// abstract
	let abstract = null;
	if (article.abstract) {
		abstract = document.createElement("p");
		abstract.className = "card-abstract clamped";
		body.appendChild(abstract);

		let toggle = document.createElement("button");
		toggle.className = "abstract-toggle";
		toggle.textContent = S("show-more");
		toggle.addEventListener("click", () => {
			let clamped = abstract.classList.toggle("clamped");
			toggle.textContent = S(clamped ? "show-more" : "show-less");
		});
		body.appendChild(toggle);
	}

	// figures placeholder — populated lazily when the card scrolls into view
	if (JournalLens.getPref("loadFigures") && (article.pmcid || article.url || article.doi)) {
		let figures = document.createElement("div");
		figures.className = "figures";
		figures.hidden = true;
		body.appendChild(figures);
		card._article = article;
		card._figuresEl = figures;
		State.figureObserver.observe(card);
	}

	// actions
	let actions = document.createElement("div");
	actions.className = "card-actions";

	let addBtn = document.createElement("button");
	addBtn.className = "primary";
	addBtn.textContent = S("add");
	addBtn.addEventListener("click", async () => {
		addBtn.disabled = true;
		try {
			await JournalLens.addToZoteroByDOI(article.doi);
			addBtn.textContent = S("added");
		}
		catch (e) {
			Zotero.debug("JournalLens: add failed: " + e);
			addBtn.disabled = false;
			window.alert(S("add-failed"));
		}
	});
	actions.appendChild(addBtn);

	let openBtn = document.createElement("button");
	openBtn.textContent = S("open-page");
	openBtn.addEventListener("click", () => Zotero.launchURL(article.url));
	actions.appendChild(openBtn);

	// translate toggle (title + abstract)
	let translateBtn = document.createElement("button");
	updateArticleText(article, title, abstract, translateBtn);
	translateBtn.addEventListener("click", () =>
		toggleTranslate(article, title, abstract, translateBtn));
	actions.appendChild(translateBtn);

	body.appendChild(actions);
	return card;
}

/* ---------------------------------------------------------- *
 * Translation (title + abstract, EN <-> 中文)
 * ---------------------------------------------------------- */

function translationButtonLabel(article) {
	if (article._showTranslated) {
		return S("original");
	}
	let target = JournalLens.getTranslationTarget(article.title);
	return S(target === "zh" ? "translate-to-zh" : "translate-to-en");
}

function updateArticleText(article, titleEl, absEl, btn) {
	let target = article._translationTarget;
	let translated = article._showTranslated && target
		&& article._tx && article._tx[target];
	setHighlightedText(titleEl, translated ? translated.title : article.title);
	if (absEl) {
		setHighlightedText(absEl, translated ? translated.abstract : article.abstract);
	}
	btn.textContent = translationButtonLabel(article);
}

async function toggleTranslate(article, titleEl, absEl, btn) {
	if (article._showTranslated) {
		article._showTranslated = false;
		updateArticleText(article, titleEl, absEl, btn);
		return;
	}

	let target = JournalLens.getTranslationTarget(article.title);
	btn.disabled = true;
	btn.textContent = S("translating");
	try {
		if (!article._tx) {
			article._tx = {};
		}
		if (!article._tx[target]) {
			let [tt, ta] = await Promise.all([
				JournalLens.translateText(article.title, target),
				article.abstract
					? JournalLens.translateText(article.abstract, target)
					: Promise.resolve("")
			]);
			article._tx[target] = { title: tt, abstract: ta };
		}
		article._showTranslated = true;
		article._translationTarget = target;
		updateArticleText(article, titleEl, absEl, btn);
	}
	catch (e) {
		Zotero.debug("JournalLens: translate failed: " + e);
		window.alert(S("translate-failed"));
		updateArticleText(article, titleEl, absEl, btn);
	}
	btn.disabled = false;
}

/* ---------------------------------------------------------- *
 * Figures (lazy: Europe PMC XML first, publisher/OA pages fallback)
 * ---------------------------------------------------------- */

function resetFigureObserver() {
	if (State.figureObserver) {
		State.figureObserver.disconnect();
	}
	State.figureObserver = new IntersectionObserver((entries) => {
		for (let entry of entries) {
			if (entry.isIntersecting) {
				State.figureObserver.unobserve(entry.target);
				loadFiguresForCard(entry.target);
			}
		}
	}, { root: document.getElementById("content"), rootMargin: "300px" });
}

function parseFigures(xmlText, pmcid) {
	let doc = new DOMParser().parseFromString(xmlText, "text/xml");
	let graphicHref = (graphic) => graphic
		&& (graphic.getAttributeNS("http://www.w3.org/1999/xlink", "href")
			|| graphic.getAttribute("xlink:href")
			|| graphic.getAttribute("href"));
	let firstGraphic = (el) => el && el.querySelector("graphic, media");

	// Main body figures
	let figures = [];
	for (let fig of doc.querySelectorAll("fig")) {
		let type = (fig.getAttribute("fig-type") || "").toLowerCase();
		let labelText = (fig.querySelector("label") || {}).textContent || "";
		let captionText = (fig.querySelector("caption") || {}).textContent || "";
		if (isPreviewFigure([type, labelText, captionText].join(" "))) {
			continue;
		}
		let href = graphicHref(firstGraphic(fig));
		if (!href) {
			continue;
		}
		let label = fig.querySelector("label");
		let caption = fig.querySelector("caption");
		figures.push({
			label: label ? label.textContent.trim() : "",
			caption: caption ? caption.textContent.replace(/\s+/g, " ").trim() : "",
			urls: JournalLens.figureImageURLs(pmcid, href)
		});
	}
	return { figures };
}

function cleanText(text) {
	return (text || "").replace(/\s+/g, " ").trim();
}

function normalizeFigureText(text) {
	return cleanText(text)
		.toLowerCase()
		.replace(/[.:;,\-\u2013\u2014_()[\]{}'"\u201c\u201d\u2018\u2019]/g, "")
		.replace(/\s+/g, " ");
}

function parseFigureLabelInfo(text) {
	let value = cleanText(text);
	if (!value) {
		return null;
	}
	let extended = value.match(/\bextended\s+(?:data\s+)?fig(?:ure)?\.?\s*([s]?\d+)([a-z]?)\b/i);
	if (extended) {
		let number = parseInt(extended[1].replace(/^s/i, ""), 10);
		if (!number) {
			return null;
		}
		let suffix = (extended[2] || "").toLowerCase();
		return {
			kind: "extended",
			group: 1,
			number,
			suffix,
			key: "extended:" + number + ":" + suffix,
			label: "Extended Fig. " + number + suffix
		};
	}
	let normal = value.match(/\bfig(?:ure)?\.?\s*([s]?\d+)([a-z]?)\b/i);
	if (!normal && value.length <= 12) {
		normal = value.match(/^\s*([s]?\d+)([a-z]?)(?:\s*[:.\-\u2013\u2014]|\s*$)/i);
	}
	if (!normal) {
		return null;
	}
	let supplemental = /^s/i.test(normal[1])
		|| /\b(?:supplementary|supplemental|suppl\.?)\s+fig(?:ure)?/i.test(value);
	let number = parseInt(normal[1].replace(/^s/i, ""), 10);
	if (!number) {
		return null;
	}
	let suffix = (normal[2] || "").toLowerCase();
	let labelNumber = (supplemental ? "S" : "") + number + suffix;
	return {
		kind: supplemental ? "supplementary" : "main",
		group: supplemental ? 2 : 0,
		number,
		suffix,
		key: (supplemental ? "supplementary:" : "main:") + number + ":" + suffix,
		label: "Fig. " + labelNumber
	};
}

function splitFigureLabel(text) {
	let value = cleanText(text);
	let info = parseFigureLabelInfo(value);
	let match = value.match(/^((?:extended\s+(?:data\s+)?)?fig(?:ure)?\.?\s*[s]?\d+[a-z]?|[s]?\d+[a-z]?)(?:\s*[:.\-\u2013\u2014]\s*|\s+)(.+)$/i);
	if (match && match[2] && match[2].length > 10) {
		return { info: parseFigureLabelInfo(match[1]) || info, caption: cleanText(match[2]) };
	}
	return { info, caption: "" };
}

function normalizeFigureLabel(label) {
	let info = parseFigureLabelInfo(label);
	return info ? info.label : "";
}

function isPreviewFigure(text) {
	return /(graphical\s+abstract|visual\s+abstract|table\s+of\s+contents|toc\s+graphic|cover\s+image|social\s+preview|preview\s+image|thumbnail|teaser|scheme\s+preview)/i
		.test(text || "");
}

function captionWithoutLabel(label, caption) {
	let l = cleanText(label);
	let c = cleanText(caption);
	if (!l) {
		return c;
	}
	return stripCaptionLabel(l, c);
}

function stripCaptionLabel(label, caption) {
	let l = cleanText(label);
	let c = cleanText(caption);
	if (!l || !c) {
		return c;
	}
	if (normalizeFigureText(l) === normalizeFigureText(c)) {
		return "";
	}
	let escaped = escapeRegExp(l).replace(/\\\./g, "\\.?");
	let re = new RegExp("^\\s*" + escaped + "\\s*[:.\\-\\u2013\\u2014]?\\s*", "i");
	return cleanText(c.replace(re, ""));
}

function stripKnownFigureLabel(info, caption) {
	let text = cleanText(caption);
	if (!info || !text) {
		return text;
	}
	let number = info.number + (info.suffix || "");
	let variants = info.kind === "extended"
		? [
			info.label,
			"Extended Data Fig. " + number,
			"Extended Data Figure " + number,
			"Extended Figure " + number
		]
		: [
			info.label,
			"Figure " + (info.kind === "supplementary" ? "S" : "") + number
		];
	for (let label of variants) {
		text = stripCaptionLabel(label, text);
	}
	return text;
}

function cleanFigure(figure) {
	if (!figure) {
		return null;
	}
	let rawURLs = Array.isArray(figure.urls) ? figure.urls : [figure.url];
	let urls = JournalLens._uniqueURLs(rawURLs
		.flatMap(expandHighResURLs)
		.filter(isUsefulImageURL));
	if (!urls.length) {
		return null;
	}
	let label = cleanText(figure.label);
	let caption = cleanText(figure.caption);
	let split = splitFigureLabel(label);
	let info = split.info;
	if (split.caption) {
		caption = caption || split.caption;
	}
	if (!info) {
		let captionSplit = splitFigureLabel(caption);
		info = captionSplit.info;
		if (captionSplit.caption) {
			caption = captionSplit.caption;
		}
	}
	if (!info) {
		info = parseFigureLabelInfo([
			figure.metaLabel || "",
			figure.urlHint || "",
			urls.join(" ")
		].join(" "));
	}
	if (!info) {
		return null;
	}
	caption = stripKnownFigureLabel(info, caption);
	return {
		label: info.label,
		caption,
		urls,
		labelInfo: info,
		width: figure.width || 0,
		height: figure.height || 0
	};
}

function figureCaptionText(figure) {
	let clean = cleanFigure(figure);
	if (!clean) {
		return "";
	}
	if (clean.label && clean.caption) {
		return clean.label + ": " + clean.caption;
	}
	return clean.caption || clean.label || "";
}

function figureURLKey(url) {
	try {
		let u = new URL(url);
		u.hash = "";
		u.search = "";
		let path = decodeURIComponent(u.pathname).toLowerCase()
			.replace(/\.(jpg|jpeg|png|gif|webp|tif|tiff)$/i, "")
			.replace(/[@._-](\d+x\d+|\d+w|small|medium|large|full|hires|highres|zoom|thumbnail|thumb|lowres|original)$/i, "")
			.replace(/([._-])(full|large|medium|small|thumb|thumbnail|hires|highres)([._-])/gi, "$1$3")
			.replace(/\/(full|large|medium|small|thumb|thumbnail|hires|highres)\//gi, "/");
		let file = path.split("/").pop() || path;
		let prefix = /(extended|ext[-_]?data|extended[-_]?data)/i.test(path) ? "extendedfig" : "fig";
		let figureToken = file.match(/(?:fig(?:ure)?|f|gr|graphic|image|plate)[._-]?0*([1-9]\d*)([a-z])?/i);
		if (figureToken) {
			return u.hostname.toLowerCase() + "::" + prefix
				+ figureToken[1] + (figureToken[2] || "");
		}
		return u.hostname.toLowerCase() + path;
	}
	catch (e) {
		return String(url || "").split(/[?#]/)[0].toLowerCase();
	}
}

function figureTextKey(figure) {
	let clean = cleanFigure(figure);
	if (!clean) {
		return "";
	}
	let caption = captionWithoutLabel(clean.label, clean.caption);
	let text = caption || clean.label;
	return normalizeFigureText(text);
}

function figureNumberKey(figure) {
	let clean = cleanFigure(figure);
	if (!clean) {
		return "";
	}
	return clean.labelInfo ? clean.labelInfo.key : "";
}

function createFigureSeen(seedFigures = []) {
	let seen = {
		urls: new Set(),
		captions: new Set(),
		numbers: new Set(),
		byNumber: new Map()
	};
	for (let figure of seedFigures) {
		let clean = cleanFigure(figure);
		if (!clean) {
			continue;
		}
		for (let url of clean.urls) {
			seen.urls.add(figureURLKey(url));
		}
		let textKey = figureTextKey(clean);
		if (textKey && textKey.length > 12) {
			seen.captions.add(textKey);
		}
		let numberKey = figureNumberKey(clean);
		if (numberKey) {
			seen.numbers.add(numberKey);
			seen.byNumber.set(numberKey, clean);
		}
	}
	return seen;
}

function mergeFigure(existing, incoming) {
	existing.urls = JournalLens._uniqueURLs([...(existing.urls || []), ...(incoming.urls || [])]);
	if (!existing.caption && incoming.caption) {
		existing.caption = incoming.caption;
	}
	existing.width = Math.max(existing.width || 0, incoming.width || 0);
	existing.height = Math.max(existing.height || 0, incoming.height || 0);
}

function figureSortValue(figure) {
	let clean = cleanFigure(figure);
	let info = clean && clean.labelInfo;
	if (!info) {
		return [9, 9999, ""];
	}
	return [info.group, info.number, info.suffix || ""];
}

function sortFigures(figures) {
	return (figures || []).slice().sort((a, b) => {
		let av = figureSortValue(a);
		let bv = figureSortValue(b);
		if (av[0] !== bv[0]) {
			return av[0] - bv[0];
		}
		if (av[1] !== bv[1]) {
			return av[1] - bv[1];
		}
		return av[2].localeCompare(bv[2]);
	});
}

function dedupeFigures(figures) {
	let out = [];
	let seen = createFigureSeen();
	for (let figure of figures || []) {
		addFigure(out, seen, figure);
	}
	return sortFigures(out);
}

function imageURLsFromSrcset(srcset) {
	if (!srcset) {
		return [];
	}
	let out = [];
	for (let part of srcset.split(",")) {
		let pieces = part.trim().split(/\s+/);
		let url = pieces[0];
		let width = 0;
		for (let p of pieces.slice(1)) {
			let m = p.match(/^(\d+)w$/);
			if (m) {
				width = parseInt(m[1]);
			}
			let density = p.match(/^([\d.]+)x$/);
			if (density) {
				width = Math.round(parseFloat(density[1]) * 1000);
			}
		}
		if (url) {
			out.push({ url, width });
		}
	}
	return out
		.sort((a, b) => b.width - a.width)
		.map(item => item.url);
}

function imageFromSrcset(srcset) {
	return imageURLsFromSrcset(srcset)[0] || "";
}

function expandHighResURLs(url) {
	if (!url) {
		return [];
	}
	let urls = [url];
	try {
		let u = new URL(url);
		let noQuery = new URL(u.href);
		for (let key of [
			"width", "height", "w", "h", "fit", "crop", "resize", "quality",
			"auto", "format", "ixlib", "dpr", "output"
		]) {
			noQuery.searchParams.delete(key);
		}
		urls.push(noQuery.href);
		let originalPath = u.pathname;
		let paths = [
			originalPath.replace(/\/cdn-cgi\/image\/[^/]+\//i, "/"),
			originalPath.replace(/\/(?:thumb|thumbnail|preview|small|medium)\//ig, "/"),
			originalPath.replace(/([/_-])(?:thumb|thumbnail|preview|small|medium)([._/-])/ig, "$1$2")
		];
		for (let path of paths) {
			if (path && path !== originalPath) {
				let variant = new URL(u.href);
				variant.pathname = path;
				for (let key of ["width", "height", "w", "h", "fit", "crop", "resize"]) {
					variant.searchParams.delete(key);
				}
				urls.push(variant.href);
			}
		}
	}
	catch (e) {
		// Keep the original URL.
	}
	return JournalLens._uniqueURLs(urls);
}

function imageURLsFromElement(img, baseURL) {
	let urls = [];
	let add = (value) => {
		let resolved = JournalLens._resolveURL(baseURL, value);
		if (resolved) {
			urls.push(...expandHighResURLs(resolved));
		}
	};
	let attrs = [
		"data-download-url", "data-full-src", "data-high-res-src", "data-hires",
		"data-full", "data-original", "data-original-src", "data-zoom-src",
		"data-large", "data-large-src", "data-image", "data-img-src",
		"data-lazy-src", "data-src", "src"
	];
	for (let attr of attrs) {
		add(img.getAttribute(attr));
	}
	for (let url of imageURLsFromSrcset(img.getAttribute("srcset") || img.getAttribute("data-srcset"))) {
		add(url);
	}
	let picture = img.closest && img.closest("picture");
	let sources = picture ? picture.querySelectorAll("source[srcset], source[data-srcset]") : [];
	for (let source of sources) {
		for (let url of imageURLsFromSrcset(source.getAttribute("srcset") || source.getAttribute("data-srcset"))) {
			add(url);
		}
	}
	return JournalLens._uniqueURLs(urls).filter(isUsefulImageURL);
}

function isUsefulImageURL(url) {
	if (!url || /^data:/i.test(url)) {
		return false;
	}
	if (/\.(svg|ico)([?#].*)?$/i.test(url)) {
		return false;
	}
	if (/(logo|icon|avatar|profile|sprite|spinner|loader|pixel|tracking|advert|banner|share|facebook|twitter|wechat|weibo)/i.test(url)) {
		return false;
	}
	return true;
}

function figureFromURL(url, label, caption) {
	return cleanFigure({
		label: cleanText(label),
		caption: cleanText(caption),
		urls: [url]
	});
}

function addFigure(list, seen, figure) {
	let clean = cleanFigure(figure);
	if (!clean) {
		return;
	}
	let numberKey = figureNumberKey(clean);
	if (numberKey && seen.byNumber.has(numberKey)) {
		mergeFigure(seen.byNumber.get(numberKey), clean);
		return;
	}
	let urlKeys = clean.urls.map(figureURLKey).filter(Boolean);
	let hasURLDuplicate = urlKeys.some(key => seen.urls.has(key));
	if (hasURLDuplicate && (!numberKey || seen.numbers.has(numberKey))) {
		return;
	}
	let textKey = figureTextKey(clean);
	if (textKey && textKey.length > 12 && seen.captions.has(textKey)) {
		return;
	}
	if (numberKey && seen.numbers.has(numberKey)
		&& (!textKey || textKey.length < 36 || seen.captions.has(textKey))) {
		return;
	}
	for (let key of urlKeys) {
		seen.urls.add(key);
	}
	if (textKey && textKey.length > 12) {
		seen.captions.add(textKey);
	}
	if (numberKey) {
		seen.numbers.add(numberKey);
		seen.byNumber.set(numberKey, clean);
	}
	list.push(clean);
}

function metaOrLinkURL(el, baseURL) {
	if (!el) {
		return "";
	}
	return JournalLens._resolveURL(baseURL, el.getAttribute("content") || el.getAttribute("href"));
}

function imageURLScore(url) {
	let value = String(url || "").toLowerCase();
	let score = 50;
	if (/(download|full|hi[-_]?res|high[-_]?res|large|original|zoom)/i.test(value)) {
		score -= 30;
	}
	if (/\.(jpe?g|png|gif|webp|tiff?)([?#].*)?$/i.test(value)) {
		score -= 10;
	}
	if (/(thumb|thumbnail|preview|small|medium|lowres|w\d{2,3}|width=\d{2,3})/i.test(value)) {
		score += 30;
	}
	return score;
}

function isPotentialFigureURL(url) {
	return /\.(jpe?g|png|gif|webp|tiff?)([?#].*)?$/i.test(url)
		|| /(fig(?:ure)?|extended|image|graphic|large|hi[-_]?res|high[-_]?res|full|download|original|zoom)/i.test(url);
}

function figureURLsFromContainer(container, baseURL) {
	let urls = [];
	let add = (value) => {
		let resolved = JournalLens._resolveURL(baseURL, value);
		if (resolved && isPotentialFigureURL(resolved)) {
			urls.push(...expandHighResURLs(resolved));
		}
	};
	let links = Array.from(container.querySelectorAll("a[href]"))
		.map(link => JournalLens._resolveURL(baseURL, link.getAttribute("href")))
		.filter(isPotentialFigureURL)
		.sort((a, b) => imageURLScore(a) - imageURLScore(b));
	for (let url of links) {
		add(url);
	}
	for (let img of container.querySelectorAll("img")) {
		urls.push(...imageURLsFromElement(img, baseURL));
	}
	for (let source of container.querySelectorAll("source[srcset], source[data-srcset]")) {
		for (let url of imageURLsFromSrcset(source.getAttribute("srcset") || source.getAttribute("data-srcset"))) {
			add(url);
		}
	}
	return JournalLens._uniqueURLs(urls)
		.filter(isUsefulImageURL)
		.sort((a, b) => imageURLScore(a) - imageURLScore(b));
}

function textFromFirst(container, selectors) {
	for (let selector of selectors) {
		let el = container.querySelector(selector);
		let text = cleanText(el && el.textContent);
		if (text) {
			return text;
		}
	}
	return "";
}

function figureFromContainer(container, baseURL) {
	let marker = [
		container.className || "",
		container.id || "",
		container.getAttribute("aria-label") || "",
		container.getAttribute("data-fig-id") || "",
		container.getAttribute("data-figure-id") || ""
	].join(" ");
	if (isPreviewFigure(marker)) {
		return null;
	}
	let urls = figureURLsFromContainer(container, baseURL);
	if (!urls.length) {
		return null;
	}
	let img = container.querySelector("img");
	let label = textFromFirst(container, [
		".label", ".figure-label", ".fig-label", "[class*='label']", "label"
	]) || cleanText(img && (img.getAttribute("alt") || img.getAttribute("aria-label")));
	let caption = textFromFirst(container, [
		"figcaption", ".caption", ".figure-caption", ".fig-caption", "[class*='caption']"
	]) || cleanText(img && (img.getAttribute("title") || img.getAttribute("alt")));
	return cleanFigure({
		label,
		caption,
		urls,
		metaLabel: [
			marker,
			img && img.getAttribute("alt"),
			img && img.getAttribute("title")
		].filter(Boolean).join(" "),
		urlHint: urls.join(" ")
	});
}

function parseHTMLVisuals(htmlText, baseURL) {
	let doc = new DOMParser().parseFromString(htmlText, "text/html");
	let seen = createFigureSeen();
	let figures = [];

	let containers = [
		"article figure", "main figure", "[role='main'] figure", "figure",
		"[class*='figure']", "[class*='fig-']", "[id^='fig']",
		"[id*='figure']", "[data-fig-id]", "[data-figure-id]",
		"[class*='extended']"
	].join(",");
	for (let fig of doc.querySelectorAll(containers)) {
		if (figures.length >= 24) {
			break;
		}
		addFigure(figures, seen, figureFromContainer(fig, baseURL));
	}
	return { figures };
}

function graphicHrefFromXML(graphic) {
	return graphic
		&& (graphic.getAttributeNS("http://www.w3.org/1999/xlink", "href")
			|| graphic.getAttribute("xlink:href")
			|| graphic.getAttribute("href")
			|| graphic.getAttribute("src"));
}

function genericGraphicURLs(baseURL, href) {
	let raw = String(href || "");
	let url = JournalLens._resolveURL(baseURL, raw);
	let noExt = raw.replace(/\.(jpg|jpeg|png|gif|webp|tif|tiff)$/i, "");
	let variants = [
		raw, noExt + ".jpg", noExt + ".png", noExt + ".jpeg", noExt + ".webp"
	];
	return JournalLens._uniqueURLs([
		url,
		...variants.map(v => JournalLens._resolveURL(baseURL, v))
	]).filter(Boolean);
}

function parseXMLVisuals(xmlText, baseURL) {
	let doc = new DOMParser().parseFromString(xmlText, "text/xml");
	let figures = [];
	for (let fig of doc.querySelectorAll("fig, figure")) {
		let label = cleanText((fig.querySelector("label") || {}).textContent);
		let caption = cleanText((fig.querySelector("caption, figcaption") || {}).textContent);
		let marker = [fig.getAttribute("fig-type") || "", label, caption].join(" ");
		if (isPreviewFigure(marker)) {
			continue;
		}
		let href = graphicHrefFromXML(fig.querySelector("graphic, media, img"));
		if (!href) {
			continue;
		}
		let figure = {
			label,
			caption,
			urls: genericGraphicURLs(baseURL, href)
		};
		figures.push(figure);
	}
	return { figures };
}

async function fetchPublisherVisuals(article) {
	let figures = [];
	let seen = createFigureSeen();
	let pages = await JournalLens.getVisualSourcePages(article);
	for (let url of pages) {
		try {
			let page = await JournalLens.fetchArticleHTML(url);
			let baseURL = page.url || url;
			let parsed = /<\s*(article|fig|figure|graphic|media)(\s|>)/i.test(page.text)
				? parseXMLVisuals(page.text, baseURL)
				: parseHTMLVisuals(page.text, baseURL);
			if (!parsed.figures || !parsed.figures.length) {
				parsed = parseHTMLVisuals(page.text, baseURL);
			}
			for (let figure of parsed.figures || []) {
				addFigure(figures, seen, figure);
			}
			if (figures.length >= 24) {
				break;
			}
		}
		catch (e) {
			Zotero.debug("JournalLens: publisher visuals failed for " + url + ": " + e);
		}
	}
	return { figures };
}

function probeImageURL(url, timeout = 8000) {
	return new Promise((resolve) => {
		if (!isUsefulImageURL(url)) {
			resolve(null);
			return;
		}
		let img = new Image();
		let settled = false;
		let finish = (result) => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timer);
			img.onload = null;
			img.onerror = null;
			resolve(result);
		};
		let timer = setTimeout(() => finish(null), timeout);
		img.onload = () => finish({
			url,
			width: img.naturalWidth || img.width || 0,
			height: img.naturalHeight || img.height || 0
		});
		img.onerror = () => finish(null);
		img.src = url;
	});
}

function figureImageLooksUsable(image) {
	if (!image || !image.width || !image.height) {
		return false;
	}
	let maxEdge = Math.max(image.width, image.height);
	let minEdge = Math.min(image.width, image.height);
	return maxEdge >= 360 && minEdge >= 120 && image.width * image.height >= 50000;
}

async function validateFigure(figure) {
	let clean = cleanFigure(figure);
	if (!clean) {
		return null;
	}
	let bestLoad = null;
	for (let url of clean.urls) {
		let image = await probeImageURL(url);
		if (!image) {
			continue;
		}
		bestLoad = bestLoad || image;
		if (figureImageLooksUsable(image)) {
			return {
				...clean,
				urls: JournalLens._uniqueURLs([image.url, ...clean.urls.filter(u => u !== image.url)]),
				width: image.width,
				height: image.height
			};
		}
	}
	if (bestLoad && figureImageLooksUsable({
		width: Math.max(bestLoad.width, clean.width || 0),
		height: Math.max(bestLoad.height, clean.height || 0)
	})) {
		return {
			...clean,
			urls: JournalLens._uniqueURLs([bestLoad.url, ...clean.urls.filter(u => u !== bestLoad.url)]),
			width: bestLoad.width,
			height: bestLoad.height
		};
	}
	return null;
}

async function validateFigures(figures, limit = 8) {
	let out = [];
	let seen = createFigureSeen();
	for (let figure of dedupeFigures(figures)) {
		let validated = await validateFigure(figure);
		if (!validated) {
			continue;
		}
		addFigure(out, seen, validated);
		if (out.length >= limit) {
			break;
		}
	}
	return dedupeFigures(out).slice(0, limit);
}

async function loadFiguresForCard(card) {
	if (card._figuresRequested) {
		return;
	}
	card._figuresRequested = true;
	let article = card._article;
	let container = card._figuresEl;
	container.hidden = false;
	let loading = document.createElement("span");
	loading.className = "figures-loading";
	loading.textContent = S("figures-loading");
	container.appendChild(loading);

	try {
		if (article.figures === null) {
			let allFigures = [];
			if (article.pmcid) {
				try {
					let xml = await JournalLens.fetchFullTextXML(article.pmcid);
					let parsed = parseFigures(xml, article.pmcid);
					allFigures = parsed.figures || [];
				}
				catch (e) {
					Zotero.debug("JournalLens: Europe PMC figures failed for "
						+ article.pmcid + ": " + e);
				}
			}
			if (article.url || article.doi || (article.fullTextLinks && article.fullTextLinks.length)) {
				let fallback = await fetchPublisherVisuals(article);
				let seen = createFigureSeen(allFigures);
				for (let figure of fallback.figures || []) {
					addFigure(allFigures, seen, figure);
				}
			}
			let combined = [];
			let seen = createFigureSeen();
			for (let figure of allFigures) {
				addFigure(combined, seen, figure);
			}
			article.figures = combined;
			article.graphicalAbstract = null;
		}
	}
	catch (e) {
		Zotero.debug("JournalLens: figures failed for " + (article.doi || article.url) + ": " + e);
		article.figures = [];
	}

	container.replaceChildren();

	article.figures = await validateFigures(article.figures, 8);
	if (!article.figures || !article.figures.length) {
		container.hidden = true;
		return;
	}

	for (let [index, figure] of article.figures.slice(0, 8).entries()) {
		let item = document.createElement("div");
		item.className = "figure-item";
		setImageWithFallback(item, figure, false);
		let label = document.createElement("span");
		label.className = "fig-label";
		label.textContent = figure.label || "";
		label.title = figure.caption;
		item.appendChild(label);
		item.addEventListener("click", () => openLightbox(article.figures, index));
		container.appendChild(item);
	}
}

function setImageWithFallback(parent, figure) {
	let img = document.createElement("img");
	img.loading = "lazy";
	img.alt = figure.label || "";
	let index = 0;
	img.addEventListener("error", () => {
		index++;
		if (index < figure.urls.length) {
			img.src = figure.urls[index];
		}
		else {
			parent.remove();
		}
	});
	img.src = figure.urls[0];
	parent.appendChild(img);
}

/* ---------------------------------------------------------- *
 * Lightbox
 * ---------------------------------------------------------- */

function updateLightboxTransform() {
	let img = document.getElementById("lightbox-img");
	let zoom = State.lightboxZoom;
	img.style.transform = "translate(" + State.lightboxPanX + "px, "
		+ State.lightboxPanY + "px) scale(" + zoom + ")";
	img.classList.toggle("zoomed", zoom > 1.01);
	document.getElementById("lightbox-zoom-reset").textContent =
		Math.round(zoom * 100) + "%";
	updateLightboxGeometry();
}

function setLightboxZoom(zoom) {
	State.lightboxZoom = Math.max(0.25, Math.min(6, zoom));
	if (State.lightboxZoom <= 1.01) {
		State.lightboxPanX = 0;
		State.lightboxPanY = 0;
	}
	updateLightboxTransform();
}

function resetLightboxView() {
	State.lightboxZoom = 1;
	State.lightboxPanX = 0;
	State.lightboxPanY = 0;
	updateLightboxTransform();
}

function renderLightboxFigure() {
	let stage = document.getElementById("lightbox-stage");
	let img = document.getElementById("lightbox-img");
	let caption = document.getElementById("lightbox-caption");
	let figure = State.lightboxFigures[State.lightboxIndex];
	if (!figure) {
		return;
	}
	let index = 0;
	img.onerror = () => {
		index++;
		if (index < figure.urls.length) {
			img.src = figure.urls[index];
		}
	};
	img.onload = updateLightboxGeometry;
	img.src = figure.urls[0];
	caption.textContent = figureCaptionText(figure);
	resetLightboxView();
	document.getElementById("lightbox-prev").disabled = State.lightboxFigures.length < 2;
	document.getElementById("lightbox-next").disabled = State.lightboxFigures.length < 2;
	document.getElementById("lightbox-nav-prev").hidden = State.lightboxFigures.length < 2;
	document.getElementById("lightbox-nav-next").hidden = State.lightboxFigures.length < 2;
	window.requestAnimationFrame(() => {
		updateLightboxGeometry();
		stage.scrollTop = 0;
	});
}

function updateLightboxGeometry() {
	let stage = document.getElementById("lightbox-stage");
	let img = document.getElementById("lightbox-img");
	let caption = document.getElementById("lightbox-caption");
	if (!stage || !img || !caption || !img.complete) {
		return;
	}
	let stageRect = stage.getBoundingClientRect();
	let imgRect = img.getBoundingClientRect();
	if (!stageRect.width || !imgRect.width) {
		return;
	}
	let visibleLeft = Math.max(imgRect.left, stageRect.left);
	let visibleRight = Math.min(imgRect.right, stageRect.right);
	let visibleTop = Math.max(imgRect.top, stageRect.top);
	let visibleBottom = Math.min(imgRect.bottom, stageRect.bottom);
	let visibleWidth = Math.max(260, visibleRight - visibleLeft);
	let centerY = Math.max(36, Math.min(stageRect.height - 36,
		((visibleTop + visibleBottom) / 2) - stageRect.top));
	stage.style.setProperty("--nav-top", centerY + "px");
	stage.style.setProperty("--nav-left", Math.max(8, visibleLeft - stageRect.left + 8) + "px");
	stage.style.setProperty("--nav-right", Math.max(8, stageRect.right - visibleRight + 8) + "px");
	caption.style.setProperty("--caption-width", Math.round(Math.min(visibleWidth, stageRect.width)) + "px");
}

function openLightbox(figures, index = 0) {
	State.lightboxFigures = dedupeFigures(Array.isArray(figures) ? figures : [figures]);
	if (!State.lightboxFigures.length) {
		return;
	}
	State.lightboxIndex = Math.max(0, Math.min(index, State.lightboxFigures.length - 1));
	let lightbox = document.getElementById("lightbox");
	renderLightboxFigure();
	lightbox.hidden = false;
}

function stepLightbox(delta) {
	if (State.lightboxFigures.length < 2) {
		return;
	}
	State.lightboxIndex = (State.lightboxIndex + delta + State.lightboxFigures.length)
		% State.lightboxFigures.length;
	renderLightboxFigure();
}

function initLightbox() {
	let lightbox = document.getElementById("lightbox");
	let stage = document.getElementById("lightbox-stage");
	let img = document.getElementById("lightbox-img");
	document.getElementById("lightbox-close")
		.addEventListener("click", () => { lightbox.hidden = true; });
	document.getElementById("lightbox-prev").addEventListener("click", () => stepLightbox(-1));
	document.getElementById("lightbox-next").addEventListener("click", () => stepLightbox(1));
	document.getElementById("lightbox-nav-prev").addEventListener("click", (event) => {
		event.stopPropagation();
		stepLightbox(-1);
	});
	document.getElementById("lightbox-nav-next").addEventListener("click", (event) => {
		event.stopPropagation();
		stepLightbox(1);
	});
	document.getElementById("lightbox-zoom-in")
		.addEventListener("click", () => setLightboxZoom(State.lightboxZoom * 1.25));
	document.getElementById("lightbox-zoom-out")
		.addEventListener("click", () => setLightboxZoom(State.lightboxZoom / 1.25));
	document.getElementById("lightbox-zoom-reset")
		.addEventListener("click", resetLightboxView);
	stage.addEventListener("wheel", (event) => {
		event.preventDefault();
		setLightboxZoom(State.lightboxZoom * (event.deltaY < 0 ? 1.12 : 0.88));
	});
	img.addEventListener("dblclick", () => {
		setLightboxZoom(State.lightboxZoom > 1.01 ? 1 : 2);
	});
	img.addEventListener("mousedown", (event) => {
		if (State.lightboxZoom <= 1.01) {
			return;
		}
		event.preventDefault();
		State.lightboxDrag = {
			x: event.clientX,
			y: event.clientY,
			panX: State.lightboxPanX,
			panY: State.lightboxPanY
		};
		img.classList.add("dragging");
	});
	window.addEventListener("mousemove", (event) => {
		if (!State.lightboxDrag) {
			return;
		}
		State.lightboxPanX = State.lightboxDrag.panX + event.clientX - State.lightboxDrag.x;
		State.lightboxPanY = State.lightboxDrag.panY + event.clientY - State.lightboxDrag.y;
		updateLightboxTransform();
	});
	window.addEventListener("mouseup", () => {
		State.lightboxDrag = null;
		img.classList.remove("dragging");
	});
	lightbox.addEventListener("click", (event) => {
		if (event.target === lightbox) {
			lightbox.hidden = true;
		}
	});
	window.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			lightbox.hidden = true;
			document.getElementById("donate-modal").hidden = true;
		}
		if (!lightbox.hidden && event.key === "ArrowLeft") {
			event.preventDefault();
			stepLightbox(-1);
		}
		if (!lightbox.hidden && event.key === "ArrowRight") {
			event.preventDefault();
			stepLightbox(1);
		}
		if (!lightbox.hidden && (event.key === "+" || event.key === "=")) {
			event.preventDefault();
			setLightboxZoom(State.lightboxZoom * 1.25);
		}
		if (!lightbox.hidden && event.key === "-") {
			event.preventDefault();
			setLightboxZoom(State.lightboxZoom / 1.25);
		}
		if (!lightbox.hidden && event.key === "0") {
			event.preventDefault();
			resetLightboxView();
		}
	});
}

/* ---------------------------------------------------------- *
 * Donate modal
 * ---------------------------------------------------------- */

function initDonate() {
	let modal = document.getElementById("donate-modal");
	document.getElementById("donate-btn")
		.addEventListener("click", () => { modal.hidden = false; });
	document.getElementById("donate-close")
		.addEventListener("click", () => { modal.hidden = true; });
	modal.addEventListener("click", (event) => {
		if (event.target === modal) {
			modal.hidden = true;
		}
	});
	document.getElementById("donate-github")
		.addEventListener("click", (event) => {
			event.preventDefault();
			JournalLens.openDonatePage();
		});
}

/* ---------------------------------------------------------- *
 * Init
 * ---------------------------------------------------------- */

function init() {
	State.journals = JournalLens.getJournals();
	applyStaticLabels();
	for (let btn of document.querySelectorAll("#lang-toggle button")) {
		btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
	}
	document.getElementById("refresh-btn")
		.addEventListener("click", () => loadFeed(true));
	initSearch();
	initArticleSearch();
	initLightbox();
	initDonate();
	renderSidebar();
	loadFeed();
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
}
else {
	init();
}
