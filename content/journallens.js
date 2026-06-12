/* global Zotero, Services */
"use strict";

/**
 * JournalLens core service.
 * Loaded once from bootstrap.js into the bootstrap scope.
 *
 * Data sources:
 *  - Crossref REST API: latest works per journal (by ISSN), all disciplines.
 *  - Europe PMC REST API: abstracts, open-access flags and, for OA articles,
 *    full-text figures with captions.
 */
var JournalLens = {
	id: null,
	version: null,
	rootURI: null,

	PREF_BRANCH: "extensions.journallens.",
	CROSSREF_MAILTO: "yunze623@gmail.com",
	DONATE_URL: "https://github.com/yunze623/JournalLens/blob/main/DONATE.md",
	HOMEPAGE_URL: "https://github.com/yunze623/JournalLens",

	_feedWindow: null,
	_cache: new Map(),
	_addedMenuItems: new WeakMap(),

	init({ id, version, rootURI }) {
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
	},

	shutdown() {
		if (this._feedWindow && !this._feedWindow.closed) {
			this._feedWindow.close();
		}
		this._feedWindow = null;
		this._cache.clear();
		for (let win of Zotero.getMainWindows()) {
			this.removeFromWindow(win);
		}
	},

	/* ---------------------------------------------------------- *
	 * Main-window UI (Tools menu entry)
	 * ---------------------------------------------------------- */

	addToWindow(win) {
		let doc = win.document;
		if (doc.getElementById("journallens-menuitem")) {
			return;
		}
		win.MozXULElement.insertFTLIfNeeded("journallens.ftl");
		let menuitem = doc.createXULElement("menuitem");
		menuitem.id = "journallens-menuitem";
		menuitem.setAttribute("data-l10n-id", "journallens-menuitem");
		menuitem.addEventListener("command", () => this.openFeedWindow(win));
		doc.getElementById("menu_ToolsPopup").appendChild(menuitem);
	},

	removeFromWindow(win) {
		let menuitem = win.document.getElementById("journallens-menuitem");
		if (menuitem) {
			menuitem.remove();
		}
	},

	openFeedWindow(win) {
		if (this._feedWindow && !this._feedWindow.closed) {
			this._feedWindow.focus();
			return;
		}
		this._feedWindow = win.openDialog(
			"chrome://journallens/content/feed.xhtml",
			"journallens-feed",
			"chrome,resizable,centerscreen,dialog=no,width=1150,height=760",
			{ Zotero, JournalLens: this }
		);
	},

	openDonatePage() {
		Zotero.launchURL(this.DONATE_URL);
	},

	/* ---------------------------------------------------------- *
	 * Preferences
	 * ---------------------------------------------------------- */

	getPref(key) {
		return Zotero.Prefs.get(this.PREF_BRANCH + key, true);
	},

	setPref(key, value) {
		return Zotero.Prefs.set(this.PREF_BRANCH + key, value, true);
	},

	getJournals() {
		try {
			let journals = JSON.parse(this.getPref("journals") || "[]");
			return Array.isArray(journals) ? journals : [];
		}
		catch (e) {
			return [];
		}
	},

	saveJournals(journals) {
		this.setPref("journals", JSON.stringify(journals));
	},

	followJournal(journal) {
		let journals = this.getJournals();
		if (!journals.some(j => j.issn === journal.issn)) {
			journals.push({ issn: journal.issn, title: journal.title });
			this.saveJournals(journals);
		}
		return journals;
	},

	unfollowJournal(issn) {
		let journals = this.getJournals().filter(j => j.issn !== issn);
		this.saveJournals(journals);
		this._cache.delete(issn);
		return journals;
	},

	/* ---------------------------------------------------------- *
	 * HTTP helpers
	 * ---------------------------------------------------------- */

	async _getJSON(url) {
		let xhr = await Zotero.HTTP.request("GET", url, {
			headers: { Accept: "application/json" },
			timeout: 30000
		});
		return JSON.parse(xhr.responseText);
	},

	async _getText(url) {
		let xhr = await Zotero.HTTP.request("GET", url, { timeout: 30000 });
		return xhr.responseText;
	},

	/* ---------------------------------------------------------- *
	 * Crossref: journal search + latest works
	 * ---------------------------------------------------------- */

	async searchJournals(query) {
		let url = "https://api.crossref.org/journals?query="
			+ encodeURIComponent(query)
			+ "&rows=10&mailto=" + this.CROSSREF_MAILTO;
		let data = await this._getJSON(url);
		let items = (data.message && data.message.items) || [];
		return items
			.filter(j => j.ISSN && j.ISSN.length)
			.map(j => ({
				issn: j.ISSN[0],
				title: j.title || j.ISSN[0],
				publisher: j.publisher || ""
			}));
	},

	async getJournalByISSN(issn) {
		let url = "https://api.crossref.org/journals/" + encodeURIComponent(issn)
			+ "?mailto=" + this.CROSSREF_MAILTO;
		let data = await this._getJSON(url);
		let j = data.message;
		return { issn, title: j.title || issn, publisher: j.publisher || "" };
	},

	_stripJATS(text) {
		if (!text) {
			return "";
		}
		return text
			.replace(/<[^>]+>/g, " ")
			.replace(/&lt;/g, "<").replace(/&gt;/g, ">")
			.replace(/&amp;/g, "&").replace(/&#?\w+;/g, " ")
			.replace(/\s+/g, " ")
			.trim()
			.replace(/^Abstract\s*/i, "");
	},

	_formatAuthors(authorList) {
		if (!authorList || !authorList.length) {
			return "";
		}
		let names = authorList.map((a) => {
			if (a.family) {
				return (a.given ? a.given + " " : "") + a.family;
			}
			return a.name || "";
		}).filter(Boolean);
		if (names.length > 8) {
			return names.slice(0, 8).join(", ") + " et al.";
		}
		return names.join(", ");
	},

	_dateFromParts(work) {
		let dp = (work["published-online"] || work["published-print"]
			|| work.published || work.issued || {})["date-parts"];
		if (!dp || !dp[0]) {
			return "";
		}
		return dp[0].map(n => String(n).padStart(2, "0")).join("-");
	},

	async fetchJournalFeed(issn, rows) {
		let url = "https://api.crossref.org/journals/" + encodeURIComponent(issn)
			+ "/works?sort=published&order=desc&rows=" + rows
			+ "&filter=type:journal-article"
			+ "&select=DOI,title,author,abstract,issued,published,published-online,published-print,container-title,volume,issue,page,URL"
			+ "&mailto=" + this.CROSSREF_MAILTO;
		let data = await this._getJSON(url);
		let items = (data.message && data.message.items) || [];
		return items
			.filter(w => w.title && w.title.length)
			.map(w => ({
				doi: w.DOI,
				title: this._stripJATS(w.title[0]),
				authors: this._formatAuthors(w.author),
				journal: (w["container-title"] && w["container-title"][0]) || "",
				issn: issn,
				date: this._dateFromParts(w),
				volume: w.volume || "",
				issue: w.issue || "",
				pages: w.page || "",
				abstract: this._stripJATS(w.abstract),
				url: w.URL || ("https://doi.org/" + w.DOI),
				pmcid: null,
				isOpenAccess: false,
				figures: null
			}));
	},

	/* ---------------------------------------------------------- *
	 * Europe PMC: abstracts, OA flags, full-text figures
	 * ---------------------------------------------------------- */

	async enrichWithEuropePMC(articles) {
		let withDOI = articles.filter(a => a.doi);
		// Batch lookup, 10 DOIs per request to keep the query short
		for (let i = 0; i < withDOI.length; i += 10) {
			let batch = withDOI.slice(i, i + 10);
			let query = batch.map(a => 'DOI:"' + a.doi + '"').join(" OR ");
			let url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query="
				+ encodeURIComponent(query)
				+ "&resultType=core&format=json&pageSize=" + batch.length;
			try {
				let data = await this._getJSON(url);
				let results = (data.resultList && data.resultList.result) || [];
				for (let r of results) {
					let article = batch.find(
						a => r.doi && a.doi.toLowerCase() === r.doi.toLowerCase()
					);
					if (!article) {
						continue;
					}
					if (!article.abstract && r.abstractText) {
						article.abstract = this._stripJATS(r.abstractText);
					}
					article.pmcid = r.pmcid || null;
					article.isOpenAccess = r.isOpenAccess === "Y";
					if (!article.authors && r.authorString) {
						article.authors = r.authorString;
					}
				}
			}
			catch (e) {
				Zotero.debug("JournalLens: Europe PMC enrichment failed: " + e);
			}
		}
		return articles;
	},

	/**
	 * Fetch the full-text JATS XML for an OA article and return its figures.
	 * Returns [{ label, caption, urls: [candidate image URLs] }, ...]
	 * XML is parsed by the caller (window context) — here we just fetch.
	 */
	async fetchFullTextXML(pmcid) {
		let url = "https://www.ebi.ac.uk/europepmc/webservices/rest/"
			+ encodeURIComponent(pmcid) + "/fullTextXML";
		return this._getText(url);
	},

	figureImageURLs(pmcid, graphicHref) {
		// Common hosting patterns for PMC figure images; the renderer tries
		// them in order via <img> error fallback.
		let name = graphicHref.replace(/\.(jpg|jpeg|png|gif|tif|tiff)$/i, "");
		return [
			"https://europepmc.org/articles/" + pmcid + "/bin/" + name + ".jpg",
			"https://www.ncbi.nlm.nih.gov/pmc/articles/" + pmcid + "/bin/" + name + ".jpg"
		];
	},

	/* ---------------------------------------------------------- *
	 * Feed assembly with caching
	 * ---------------------------------------------------------- */

	/**
	 * Collapse duplicate entries that point at the same paper. Some journals
	 * (e.g. eLife reviewed preprints) publish several versioned DOIs with an
	 * identical title; Crossref returns one record per version. Keep the first
	 * occurrence, which — because the feed is sorted newest-first — is the most
	 * recent version.
	 */
	dedupeArticles(articles) {
		let seen = new Set();
		let out = [];
		for (let article of articles) {
			let key = (article.title || "").toLowerCase().replace(/\s+/g, " ").trim()
				|| article.doi;
			if (key && seen.has(key)) {
				continue;
			}
			if (key) {
				seen.add(key);
			}
			out.push(article);
		}
		return out;
	},

	async getFeed(issn, { force = false } = {}) {
		let cacheMinutes = parseInt(this.getPref("cacheMinutes")) || 60;
		let cached = this._cache.get(issn);
		if (!force && cached && (Date.now() - cached.time) < cacheMinutes * 60000) {
			return cached.articles;
		}
		let rows = parseInt(this.getPref("articlesPerJournal")) || 20;
		let articles = this.dedupeArticles(await this.fetchJournalFeed(issn, rows));
		await this.enrichWithEuropePMC(articles);
		this._cache.set(issn, { time: Date.now(), articles });
		return articles;
	},

	/* ---------------------------------------------------------- *
	 * Import into Zotero
	 * ---------------------------------------------------------- */

	async addToZoteroByDOI(doi) {
		let translate = new Zotero.Translate.Search();
		translate.setIdentifier({ DOI: doi });
		let translators = await translate.getTranslators();
		if (!translators.length) {
			throw new Error("No translator found for DOI " + doi);
		}
		translate.setTranslator(translators);
		let items = await translate.translate({
			libraryID: Zotero.Libraries.userLibraryID,
			saveAttachments: true
		});
		return items;
	}
};
