"use strict";

/* JournalLens feed window logic. Opened from journallens.js with
   { Zotero, JournalLens } passed as window arguments. */

var { Zotero, JournalLens } = window.arguments[0];

var State = {
	journals: [],
	activeISSN: null, // null = all journals
	figureObserver: null
};

/* ---------------------------------------------------------- *
 * l10n helper (falls back to English if Fluent is unavailable)
 * ---------------------------------------------------------- */

var EN_FALLBACK = {
	"journallens-loading": "Loading latest articles…",
	"journallens-loading-failed": "Some journals could not be loaded. Check your network connection.",
	"journallens-no-journals": "No journals followed yet — add one on the left.",
	"journallens-no-articles": "No articles found.",
	"journallens-all-journals": "All journals",
	"journallens-add-to-zotero": "Add to Zotero",
	"journallens-added": "✓ Added",
	"journallens-open-page": "Open page",
	"journallens-show-more": "Show more",
	"journallens-show-less": "Show less",
	"journallens-figures-loading": "Loading figures…",
	"journallens-searching": "Searching…",
	"journallens-no-results": "No journals found",
	"journallens-add-failed": "Could not add this article to Zotero"
};

async function t(id, args) {
	try {
		if (document.l10n) {
			let value = await document.l10n.formatValue(id, args);
			if (value) {
				return value;
			}
		}
	}
	catch (e) {}
	return EN_FALLBACK[id] || id;
}

/* ---------------------------------------------------------- *
 * Sidebar: followed journals + search
 * ---------------------------------------------------------- */

async function renderSidebar() {
	let list = document.getElementById("journal-list");
	list.replaceChildren();

	let allItem = document.createElement("li");
	allItem.classList.toggle("active", State.activeISSN === null);
	let allName = document.createElement("span");
	allName.className = "name";
	allName.textContent = await t("journallens-all-journals");
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
	li.textContent = await t("journallens-searching");
	results.appendChild(li);

	let found = [];
	try {
		// Direct ISSN input
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
		empty.textContent = await t("journallens-no-results");
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
 * Feed loading + cards
 * ---------------------------------------------------------- */

async function loadFeed(force = false) {
	let cards = document.getElementById("cards");
	let status = document.getElementById("status");
	cards.replaceChildren();

	if (!State.journals.length) {
		let empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = await t("journallens-no-journals");
		cards.appendChild(empty);
		return;
	}

	status.hidden = false;
	status.classList.remove("error");
	status.textContent = await t("journallens-loading");

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

	if (failures) {
		status.classList.add("error");
		status.textContent = await t("journallens-loading-failed");
	}
	else {
		status.hidden = true;
	}

	if (!articles.length) {
		let empty = document.createElement("div");
		empty.className = "empty";
		empty.textContent = await t("journallens-no-articles");
		cards.appendChild(empty);
		return;
	}

	resetFigureObserver();
	for (let article of articles) {
		cards.appendChild(await buildCard(article));
	}
}

function journalInitials(name) {
	let words = (name || "?").split(/\s+/).filter(Boolean);
	return words.slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
}

async function buildCard(article) {
	let card = document.createElement("div");
	card.className = "card";

	// thumbnail
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
	title.textContent = article.title;
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
	let rest = [article.date, article.volume && ("Vol. " + article.volume)]
		.filter(Boolean).join(" · ");
	if (rest) {
		meta.appendChild(document.createTextNode(" · " + rest));
	}
	if (article.isOpenAccess) {
		let badge = document.createElement("span");
		badge.className = "badge-oa";
		badge.textContent = "OA";
		meta.appendChild(badge);
	}
	body.appendChild(meta);

	// abstract
	if (article.abstract) {
		let abstract = document.createElement("p");
		abstract.className = "card-abstract clamped";
		abstract.textContent = article.abstract;
		body.appendChild(abstract);

		let toggle = document.createElement("button");
		toggle.className = "abstract-toggle";
		toggle.textContent = await t("journallens-show-more");
		toggle.addEventListener("click", async () => {
			let clamped = abstract.classList.toggle("clamped");
			toggle.textContent = await t(
				clamped ? "journallens-show-more" : "journallens-show-less"
			);
		});
		body.appendChild(toggle);
	}

	// figures placeholder — populated lazily when the card scrolls into view
	if (article.pmcid && article.isOpenAccess
			&& JournalLens.getPref("loadFigures")) {
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
	addBtn.textContent = await t("journallens-add-to-zotero");
	addBtn.addEventListener("click", async () => {
		addBtn.disabled = true;
		try {
			await JournalLens.addToZoteroByDOI(article.doi);
			addBtn.textContent = await t("journallens-added");
		}
		catch (e) {
			Zotero.debug("JournalLens: add failed: " + e);
			addBtn.disabled = false;
			window.alert(await t("journallens-add-failed"));
		}
	});
	actions.appendChild(addBtn);

	let openBtn = document.createElement("button");
	openBtn.textContent = await t("journallens-open-page");
	openBtn.addEventListener("click", () => Zotero.launchURL(article.url));
	actions.appendChild(openBtn);

	body.appendChild(actions);
	return card;
}

/* ---------------------------------------------------------- *
 * Figures (lazy, only for OA articles with a PMCID)
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
	}, { root: document.getElementById("content"), rootMargin: "200px" });
}

function parseFigures(xmlText, pmcid) {
	let doc = new DOMParser().parseFromString(xmlText, "text/xml");
	let figures = [];
	for (let fig of doc.querySelectorAll("fig")) {
		let graphic = fig.querySelector("graphic");
		if (!graphic) {
			continue;
		}
		let href = graphic.getAttributeNS("http://www.w3.org/1999/xlink", "href")
			|| graphic.getAttribute("xlink:href") || graphic.getAttribute("href");
		if (!href) {
			continue;
		}
		let label = fig.querySelector("label");
		let caption = fig.querySelector("caption");
		figures.push({
			label: label ? label.textContent.trim() : "",
			caption: caption
				? caption.textContent.replace(/\s+/g, " ").trim()
				: "",
			urls: JournalLens.figureImageURLs(pmcid, href)
		});
	}
	return figures;
}

async function loadFiguresForCard(card) {
	let article = card._article;
	let container = card._figuresEl;
	container.hidden = false;
	let loading = document.createElement("span");
	loading.className = "figures-loading";
	loading.textContent = await t("journallens-figures-loading");
	container.appendChild(loading);

	try {
		if (article.figures === null) {
			let xml = await JournalLens.fetchFullTextXML(article.pmcid);
			article.figures = parseFigures(xml, article.pmcid);
		}
	}
	catch (e) {
		Zotero.debug("JournalLens: figures failed for " + article.pmcid + ": " + e);
		article.figures = [];
	}

	container.replaceChildren();
	if (!article.figures.length) {
		container.hidden = true;
		return;
	}

	// Use the first figure as the card thumbnail
	setImageWithFallback(card._thumbEl, article.figures[0], true);

	for (let figure of article.figures.slice(0, 8)) {
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
			parent.addEventListener("click", () => openLightbox(figure));
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
	caption.textContent = [figure.label, figure.caption]
		.filter(Boolean).join(" — ");
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
		}
	});
}

/* ---------------------------------------------------------- *
 * Init
 * ---------------------------------------------------------- */

function init() {
	State.journals = JournalLens.getJournals();
	document.getElementById("refresh-btn")
		.addEventListener("click", () => loadFeed(true));
	document.getElementById("donate-btn")
		.addEventListener("click", () => JournalLens.openDonatePage());
	initSearch();
	initLightbox();
	renderSidebar();
	loadFeed();
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
}
else {
	init();
}
