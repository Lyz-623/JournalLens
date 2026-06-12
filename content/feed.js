"use strict";

/* JournalLens feed window logic. Opened from journallens.js with
   { Zotero, JournalLens } passed as window arguments. */

var { Zotero, JournalLens } = window.arguments[0];

var State = {
	journals: [],
	activeISSN: null, // null = all journals
	articles: [],
	figureObserver: null
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
	document.getElementById("lang-option-auto").textContent = S("lang-auto");
	document.getElementById("lang-option-en").textContent = S("lang-en");
	document.getElementById("lang-option-zh").textContent = S("lang-zh");
	document.getElementById("lang-select").value = JournalLens.getUILanguageMode();

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

function journalInitials(name) {
	let words = (name || "?").split(/\s+/).filter(Boolean);
	return words.slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
}

function renderArticles(articles) {
	let cards = document.getElementById("cards");
	cards.replaceChildren();

	if (!articles || !articles.length) {
		let empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = S("no-articles");
		cards.appendChild(empty);
		return;
	}

	resetFigureObserver();
	for (let article of articles) {
		cards.appendChild(buildCard(article));
	}
}

function buildCard(article) {
	let card = document.createElement("div");
	card.className = "card";

	// thumbnail (journal initials until a TOC / first figure loads)
	let thumb = document.createElement("div");
	thumb.className = "thumb";
	thumb.textContent = journalInitials(article.journal);
	card.appendChild(thumb);

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
		card._thumbEl = thumb;
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
	titleEl.textContent = translated ? translated.title : article.title;
	if (absEl) {
		absEl.textContent = translated ? translated.abstract : article.abstract;
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

	// Graphical abstract / TOC graphic (preferred thumbnail)
	let graphicalAbstract = null;
	for (let fig of doc.querySelectorAll("fig")) {
		let type = (fig.getAttribute("fig-type") || "").toLowerCase();
		let labelText = (fig.querySelector("label")
			|| fig.querySelector("caption")
			|| {}).textContent || "";
		if (type.includes("graphic") || /graphical abstract/i.test(labelText)) {
			let href = graphicHref(firstGraphic(fig));
			if (href) {
				graphicalAbstract = { label: "", caption: labelText.trim(),
					urls: JournalLens.figureImageURLs(pmcid, href) };
				break;
			}
		}
	}
	if (!graphicalAbstract) {
		let absGraphic = doc.querySelector('abstract[abstract-type="graphical"] graphic, abstract[abstract-type="graphical"] media');
		let href = graphicHref(absGraphic);
		if (href) {
			graphicalAbstract = { label: "", caption: "",
				urls: JournalLens.figureImageURLs(pmcid, href) };
		}
	}

	// Main body figures
	let figures = [];
	for (let fig of doc.querySelectorAll("fig")) {
		let type = (fig.getAttribute("fig-type") || "").toLowerCase();
		if (type.includes("graphic")) {
			continue; // already captured as graphical abstract
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
	return { graphicalAbstract, figures };
}

function cleanText(text) {
	return (text || "").replace(/\s+/g, " ").trim();
}

function imageFromSrcset(srcset) {
	if (!srcset) {
		return "";
	}
	let best = "";
	let bestWidth = 0;
	for (let part of srcset.split(",")) {
		let pieces = part.trim().split(/\s+/);
		let url = pieces[0];
		let width = 0;
		for (let p of pieces.slice(1)) {
			let m = p.match(/^(\d+)w$/);
			if (m) {
				width = parseInt(m[1]);
			}
		}
		if (!best || width > bestWidth) {
			best = url;
			bestWidth = width;
		}
	}
	return best;
}

function imageURLFromElement(img, baseURL) {
	let attrs = [
		"src", "data-src", "data-original", "data-lazy-src", "data-image",
		"data-large", "data-full", "data-hires", "data-download-url"
	];
	for (let attr of attrs) {
		let url = JournalLens._resolveURL(baseURL, img.getAttribute(attr));
		if (url) {
			return url;
		}
	}
	return JournalLens._resolveURL(baseURL, imageFromSrcset(img.getAttribute("srcset")));
}

function isUsefulImageURL(url) {
	if (!url || /^data:/i.test(url)) {
		return false;
	}
	if (/\.(svg|ico)([?#].*)?$/i.test(url)) {
		return false;
	}
	if (/(logo|icon|avatar|profile|sprite|spinner|loader|pixel|tracking|advert|banner|social|share|facebook|twitter|wechat|weibo)/i.test(url)) {
		return false;
	}
	return true;
}

function figureFromURL(url, label, caption) {
	return {
		label: cleanText(label),
		caption: cleanText(caption),
		urls: [url]
	};
}

function addFigure(list, seen, figure) {
	let url = figure && figure.urls && figure.urls[0];
	if (!isUsefulImageURL(url) || seen.has(url)) {
		return;
	}
	seen.add(url);
	list.push(figure);
}

function parseJSONLDImages(doc, baseURL, seen) {
	let figures = [];
	for (let script of doc.querySelectorAll('script[type="application/ld+json"]')) {
		let raw = script.textContent;
		if (!raw || !raw.trim()) {
			continue;
		}
		try {
			let data = JSON.parse(raw);
			let nodes = Array.isArray(data) ? data : [data];
			for (let node of nodes.slice()) {
				if (node && Array.isArray(node["@graph"])) {
					nodes.push(...node["@graph"]);
				}
			}
			for (let node of nodes) {
				let image = node.image;
				let candidates = [];
				if (typeof image === "string") {
					candidates.push(image);
				}
				else if (Array.isArray(image)) {
					for (let item of image) {
						candidates.push(typeof item === "string" ? item : item && item.url);
					}
				}
				else if (image && image.url) {
					candidates.push(image.url);
				}
				for (let value of candidates) {
					let url = JournalLens._resolveURL(baseURL, value);
					addFigure(figures, seen, figureFromURL(url, "Preview", "Structured article image"));
				}
			}
		}
		catch (e) {
			// Ignore malformed JSON-LD blocks from publisher pages.
		}
	}
	return figures;
}

function parseHTMLVisuals(htmlText, baseURL) {
	let doc = new DOMParser().parseFromString(htmlText, "text/html");
	let seen = new Set();
	let figures = [];
	let graphicalAbstract = null;

	let metaSelectors = [
		'meta[name="citation_graphical_abstract"]',
		'meta[name="citation_image"]',
		'meta[property="og:image"]',
		'meta[name="twitter:image"]',
		'meta[name="thumbnail"]'
	];
	for (let selector of metaSelectors) {
		let meta = doc.querySelector(selector);
		let url = meta && JournalLens._resolveURL(baseURL, meta.getAttribute("content"));
		if (isUsefulImageURL(url)) {
			graphicalAbstract = figureFromURL(url, "Preview", "Publisher page preview image");
			seen.add(url);
			break;
		}
	}

	for (let f of parseJSONLDImages(doc, baseURL, seen)) {
		if (!graphicalAbstract) {
			graphicalAbstract = f;
		}
		else {
			figures.push(f);
		}
	}

	for (let fig of doc.querySelectorAll("figure")) {
		let img = fig.querySelector("img");
		let url = img && imageURLFromElement(img, baseURL);
		if (!isUsefulImageURL(url)) {
			continue;
		}
		let label = cleanText(
			(fig.querySelector(".label, .figure-label, [class*='label']") || {}).textContent
		) || cleanText(img.getAttribute("alt")) || "Figure";
		let caption = cleanText(
			(fig.querySelector("figcaption, .caption, [class*='caption']") || {}).textContent
		) || cleanText(img.getAttribute("title") || img.getAttribute("alt"));
		addFigure(figures, seen, figureFromURL(url, label, caption));
	}

	for (let img of doc.querySelectorAll("img")) {
		if (figures.length >= 8) {
			break;
		}
		let alt = cleanText(img.getAttribute("alt") || img.getAttribute("title"));
		let url = imageURLFromElement(img, baseURL);
		let semantic = /(fig(?:ure)?\.?\s*\d*|graphical|abstract|toc|scheme|diagram|chart|plot)/i
			.test([url, alt, img.className || "", img.id || ""].join(" "));
		if (!semantic || !isUsefulImageURL(url)) {
			continue;
		}
		addFigure(figures, seen, figureFromURL(url, alt || "Figure", alt));
	}

	return { graphicalAbstract, figures };
}

async function fetchPublisherVisuals(article) {
	let graphicalAbstract = null;
	let figures = [];
	let seen = new Set();
	let pages = await JournalLens.getVisualSourcePages(article);
	for (let url of pages) {
		try {
			let page = await JournalLens.fetchArticleHTML(url);
			let parsed = parseHTMLVisuals(page.text, page.url || url);
			if (!graphicalAbstract && parsed.graphicalAbstract) {
				graphicalAbstract = parsed.graphicalAbstract;
				seen.add(graphicalAbstract.urls[0]);
			}
			for (let figure of parsed.figures || []) {
				addFigure(figures, seen, figure);
			}
			if (graphicalAbstract && figures.length >= 6) {
				break;
			}
		}
		catch (e) {
			Zotero.debug("JournalLens: publisher visuals failed for " + url + ": " + e);
		}
	}
	return { graphicalAbstract, figures };
}

async function loadFiguresForCard(card) {
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
			let graphicalAbstract = null;
			if (article.pmcid) {
				try {
					let xml = await JournalLens.fetchFullTextXML(article.pmcid);
					let parsed = parseFigures(xml, article.pmcid);
					allFigures = parsed.figures || [];
					graphicalAbstract = parsed.graphicalAbstract;
				}
				catch (e) {
					Zotero.debug("JournalLens: Europe PMC figures failed for "
						+ article.pmcid + ": " + e);
				}
			}
			if (!graphicalAbstract || !allFigures.length) {
				let fallback = await fetchPublisherVisuals(article);
				graphicalAbstract = graphicalAbstract || fallback.graphicalAbstract;
				let seen = new Set(allFigures.map(f => f.urls && f.urls[0]).filter(Boolean));
				for (let figure of fallback.figures || []) {
					addFigure(allFigures, seen, figure);
				}
			}
			article.figures = allFigures;
			article.graphicalAbstract = graphicalAbstract;
		}
	}
	catch (e) {
		Zotero.debug("JournalLens: figures failed for " + (article.doi || article.url) + ": " + e);
		article.figures = [];
	}

	container.replaceChildren();

	// Thumbnail: prefer the TOC / graphical abstract, else Figure 1
	let thumbFigure = article.graphicalAbstract
		|| (article.figures && article.figures[0]);
	if (thumbFigure) {
		setImageWithFallback(card._thumbEl, thumbFigure, true);
	}

	if (!article.figures || !article.figures.length) {
		container.hidden = true;
		return;
	}

	for (let figure of article.figures.slice(0, 6)) {
		let item = document.createElement("div");
		item.className = "figure-item";
		setImageWithFallback(item, figure, false);
		let label = document.createElement("span");
		label.className = "fig-label";
		label.textContent = figure.label || "";
		label.title = figure.caption;
		item.appendChild(label);
		item.addEventListener("click", () => openLightbox(figure));
		container.appendChild(item);
	}
}

function setImageWithFallback(parent, figure, isThumb) {
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
			img.remove();
		}
	});
	img.src = figure.urls[0];
	if (isThumb) {
		img.addEventListener("load", () => {
			parent.textContent = "";
			parent.appendChild(img);
			parent.onclick = () => openLightbox(figure);
		}, { once: true });
	}
	else {
		parent.appendChild(img);
	}
}

/* ---------------------------------------------------------- *
 * Lightbox
 * ---------------------------------------------------------- */

function openLightbox(figure) {
	let lightbox = document.getElementById("lightbox");
	let img = document.getElementById("lightbox-img");
	let caption = document.getElementById("lightbox-caption");
	img.src = figure.urls[0];
	let index = 0;
	img.onerror = () => {
		index++;
		if (index < figure.urls.length) {
			img.src = figure.urls[index];
		}
	};
	caption.textContent = [figure.label, figure.caption].filter(Boolean).join(" — ");
	lightbox.hidden = false;
}

function initLightbox() {
	let lightbox = document.getElementById("lightbox");
	document.getElementById("lightbox-close")
		.addEventListener("click", () => { lightbox.hidden = true; });
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
	document.getElementById("lang-select")
		.addEventListener("change", (e) => setLanguage(e.target.value));
	document.getElementById("refresh-btn")
		.addEventListener("click", () => loadFeed(true));
	initSearch();
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
