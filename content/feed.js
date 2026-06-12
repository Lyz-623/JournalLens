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
	document.getElementById("lang-select").value = JournalLens.getUILang();

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
		// reset per-render translation display state
		article._showTranslated = false;
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
		abstract.textContent = article.abstract;
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
	if (article.pmcid && article.isOpenAccess && JournalLens.getPref("loadFigures")) {
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
	translateBtn.textContent = S("translate");
	translateBtn.addEventListener("click", () =>
		toggleTranslate(article, title, abstract, translateBtn));
	actions.appendChild(translateBtn);

	body.appendChild(actions);
	return card;
}

/* ---------------------------------------------------------- *
 * Translation (title + abstract, EN <-> 中文)
 * ---------------------------------------------------------- */

async function toggleTranslate(article, titleEl, absEl, btn) {
	if (article._showTranslated) {
		titleEl.textContent = article.title;
		if (absEl) {
			absEl.textContent = article.abstract;
		}
		article._showTranslated = false;
		btn.textContent = S("translate");
		return;
	}

	let target = JournalLens.detectLang(article.title) === "zh" ? "en" : "zh";
	btn.disabled = true;
	btn.textContent = S("translating");
	try {
		if (!article._tx) {
			let [tt, ta] = await Promise.all([
				JournalLens.translateText(article.title, target),
				article.abstract
					? JournalLens.translateText(article.abstract, target)
					: Promise.resolve("")
			]);
			article._tx = { title: tt, abstract: ta };
		}
		titleEl.textContent = article._tx.title;
		if (absEl && article._tx.abstract) {
			absEl.textContent = article._tx.abstract;
		}
		article._showTranslated = true;
		btn.textContent = S("original");
	}
	catch (e) {
		Zotero.debug("JournalLens: translate failed: " + e);
		window.alert(S("translate-failed"));
		btn.textContent = S("translate");
	}
	btn.disabled = false;
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
	}, { root: document.getElementById("content"), rootMargin: "300px" });
}

function parseFigures(xmlText, pmcid) {
	let doc = new DOMParser().parseFromString(xmlText, "text/xml");
	let graphicHref = (graphic) => graphic
		&& (graphic.getAttributeNS("http://www.w3.org/1999/xlink", "href")
			|| graphic.getAttribute("xlink:href")
			|| graphic.getAttribute("href"));

	// Graphical abstract / TOC graphic (preferred thumbnail)
	let graphicalAbstract = null;
	for (let fig of doc.querySelectorAll("fig")) {
		let type = (fig.getAttribute("fig-type") || "").toLowerCase();
		let labelText = (fig.querySelector("label")
			|| fig.querySelector("caption")
			|| {}).textContent || "";
		if (type.includes("graphic") || /graphical abstract/i.test(labelText)) {
			let href = graphicHref(fig.querySelector("graphic"));
			if (href) {
				graphicalAbstract = { label: "", caption: labelText.trim(),
					urls: JournalLens.figureImageURLs(pmcid, href) };
				break;
			}
		}
	}
	if (!graphicalAbstract) {
		let absGraphic = doc.querySelector('abstract[abstract-type="graphical"] graphic');
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
		let href = graphicHref(fig.querySelector("graphic"));
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
			let xml = await JournalLens.fetchFullTextXML(article.pmcid);
			let parsed = parseFigures(xml, article.pmcid);
			article.figures = parsed.figures;
			article.graphicalAbstract = parsed.graphicalAbstract;
		}
	}
	catch (e) {
		Zotero.debug("JournalLens: figures failed for " + article.pmcid + ": " + e);
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
