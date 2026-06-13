/* global Zotero, Services, Components */
"use strict";

/**
 * JournalLens core service.
 * Loaded once from bootstrap.js into the bootstrap scope.
 *
 * Data sources:
 *  - Crossref REST API: latest works per journal (by ISSN), all disciplines.
 *  - Europe PMC REST API: abstracts, publication types (for filtering),
 *    open-access flags and, for OA articles, full-text figures with captions.
 *  - Publisher / OA landing pages: missing abstracts and in-article figures
 *    when structured full-text XML is unavailable.
 *  - Translation: Google (keyless gtx endpoint) with a MyMemory fallback.
 */
var JournalLens = {
	id: null,
	version: null,
	rootURI: null,

	PREF_BRANCH: "extensions.journallens.",
	CACHE_SCHEMA: "figures-v6-validated-real-labels",
	DEFAULT_DAYS_SCHEMA: "days-v2-week-default",
	CROSSREF_MAILTO: "yunze623@gmail.com",
	HOMEPAGE_URL: "https://github.com/Lyz-623/JournalLens",
	DONATE_URL: "https://github.com/Lyz-623/JournalLens/blob/main/DONATE.md",

	_feedWindow: null,
	_cache: new Map(),

	/* ---------------------------------------------------------- *
	 * Bilingual UI strings (EN / 中文)
	 * ---------------------------------------------------------- */
	STRINGS: {
		en: {
			"menuitem": "JournalLens — Journal Feed",
			"toolbar-tip": "JournalLens — browse recent journal articles",
			"refresh": "Refresh",
			"donate": "♥ Donate",
			"followed": "Followed journals",
			"add-journal": "Follow a journal",
			"search-ph": "Journal name or ISSN…",
			"article-search-ph": "Search title or abstract…",
			"all-journals": "All journals",
			"searching": "Searching…",
			"no-results": "No journals found",
			"loading": "Loading recent articles…",
			"loading-failed": "Some journals could not be loaded. Check your network connection.",
			"no-journals": "No journals followed yet — add one on the left.",
			"no-articles": "No articles found.",
			"no-matches": "No matching articles.",
			"add": "Add to Zotero",
			"added": "✓ Added",
			"add-failed": "Could not add this article to Zotero",
			"open-page": "Open page",
			"show-more": "Show more",
			"show-less": "Show less",
			"figures-loading": "Loading figures…",
			"translate": "中 / EN",
			"original": "Original",
			"translating": "Translating…",
			"translate-all": "Translate all",
			"original-all": "Show all originals",
			"translating-all": "Translating {done}/{total}…",
			"translate-all-failed": "{count} article(s) could not be translated. Please try again later.",
			"translate-failed": "Translation failed. Please try again later.",
			"oa": "OA",
			"lang-label": "Language",
			"lang-auto": "Follow Zotero",
			"lang-en": "English",
			"lang-zh": "中文",
			"translate-to-en": "Translate to EN",
			"translate-to-zh": "Translate to 中文",
			"close": "Close",
			"donate-title": "Support JournalLens ♥",
			"donate-intro": "JournalLens is free and open source. If it saves you time, a small tip keeps the updates coming!",
			"donate-paypal": "PayPal",
			"donate-wechat": "WeChat Pay",
			"donate-alipay": "Alipay",
			"donate-thanks": "Thank you! 🙏",
			"donate-github": "Open donation page on GitHub"
		},
		zh: {
			"menuitem": "JournalLens — 期刊速览",
			"toolbar-tip": "JournalLens — 浏览期刊近期文章",
			"refresh": "刷新",
			"donate": "♥ 打赏支持",
			"followed": "关注的期刊",
			"add-journal": "添加期刊",
			"search-ph": "期刊名称或 ISSN…",
			"article-search-ph": "搜索标题或摘要…",
			"all-journals": "全部期刊",
			"searching": "搜索中…",
			"no-results": "未找到相关期刊",
			"loading": "正在加载近期文章…",
			"loading-failed": "部分期刊加载失败,请检查网络连接。",
			"no-journals": "还没有关注任何期刊,请在左侧添加。",
			"no-articles": "未找到文章。",
			"no-matches": "未找到匹配文章。",
			"add": "添加到 Zotero",
			"added": "✓ 已添加",
			"add-failed": "无法将该文章添加到 Zotero",
			"open-page": "打开原文",
			"show-more": "展开",
			"show-less": "收起",
			"figures-loading": "正在加载图片…",
			"translate": "EN / 中",
			"original": "原文",
			"translating": "翻译中…",
			"translate-all": "翻译全部",
			"original-all": "显示全部原文",
			"translating-all": "正在翻译 {done}/{total}…",
			"translate-all-failed": "{count} 篇文章翻译失败,请稍后重试。",
			"translate-failed": "翻译失败,请稍后重试。",
			"oa": "OA",
			"lang-label": "语言",
			"lang-auto": "跟随 Zotero",
			"lang-en": "English",
			"lang-zh": "中文",
			"translate-to-en": "翻译为英文",
			"translate-to-zh": "翻译为中文",
			"close": "关闭",
			"donate-title": "打赏支持 JournalLens ♥",
			"donate-intro": "JournalLens 完全免费开源。如果它帮你节省了时间,欢迎打赏支持,你的支持是持续更新的最大动力!",
			"donate-paypal": "PayPal",
			"donate-wechat": "微信支付",
			"donate-alipay": "支付宝",
			"donate-thanks": "谢谢! 🙏",
			"donate-github": "在 GitHub 上查看打赏页面"
		}
	},

	/* Publication types (Europe PMC pubType / PubMed) that are NOT real research
	 * content and should be filtered out. Matched as case-insensitive substrings. */
	PUBTYPE_BLOCK: [
		"news", "editorial", "comment", "correction", "erratum", "corrigendum",
		"retraction", "expression of concern", "obituary", "biography",
		"book review", "product review", "meeting report", "congress",
		"perspective", "historical article", "interview", "newspaper article",
		"published erratum", "patient education handout", "address"
	],

	/* Obvious non-article titles when no publication type is available. */
	TITLE_BLOCK_RE: /^(editorial|correction|author correction|publisher correction|erratum|corrigendum|retraction(?: note)?|expression of concern|news (?:&|and) views|in this issue|research highlights?|from the editors?|this month in|news in brief|books? (?:in brief|received))\b/i,

	init({ id, version, rootURI }) {
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		if (this.getPref("cacheSchema") !== this.CACHE_SCHEMA) {
			this._cache.clear();
			this.setPref("cacheSchema", this.CACHE_SCHEMA);
		}
		if (this.getPref("defaultDaysSchema") !== this.DEFAULT_DAYS_SCHEMA) {
			let currentDays = parseInt(this.getPref("daysToFetch")) || 30;
			if (currentDays === 30) {
				this.setPref("daysToFetch", 7);
			}
			this.setPref("defaultDaysSchema", this.DEFAULT_DAYS_SCHEMA);
		}
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
	 * i18n
	 * ---------------------------------------------------------- */

	getUILang() {
		let pref = this.getUILanguageMode();
		if (pref === "en" || pref === "zh") {
			return pref;
		}
		let locale = (Zotero.locale || "en").toLowerCase();
		return locale.startsWith("zh") ? "zh" : "en";
	},

	getUILanguageMode() {
		let pref = this.getPref("uiLanguage") || "auto";
		return ["auto", "en", "zh"].includes(pref) ? pref : "auto";
	},

	getString(id) {
		let lang = this.getUILang();
		return (this.STRINGS[lang] && this.STRINGS[lang][id])
			|| this.STRINGS.en[id] || id;
	},

	setUILanguage(lang) {
		this.setPref("uiLanguage", lang);
		for (let win of Zotero.getMainWindows()) {
			this._relabelWindow(win);
		}
	},

	_relabelWindow(win) {
		let mi = win.document.getElementById("journallens-menuitem");
		if (mi) {
			mi.setAttribute("label", this.getString("menuitem"));
		}
		let tb = win.document.getElementById("journallens-toolbarbutton");
		if (tb) {
			tb.setAttribute("tooltiptext", this.getString("toolbar-tip"));
		}
	},

	/* ---------------------------------------------------------- *
	 * Main-window UI: Tools menu entry + toolbar quick-open button
	 * ---------------------------------------------------------- */

	addToWindow(win) {
		let doc = win.document;

		// Tools menu item
		if (!doc.getElementById("journallens-menuitem")) {
			let menuitem = doc.createXULElement("menuitem");
			menuitem.id = "journallens-menuitem";
			menuitem.setAttribute("label", this.getString("menuitem"));
			menuitem.addEventListener("command", () => this.openFeedWindow(win));
			let toolsPopup = doc.getElementById("menu_ToolsPopup");
			if (toolsPopup) {
				toolsPopup.appendChild(menuitem);
			}
		}

		// Toolbar quick-open button (next to the search box)
		if (!doc.getElementById("journallens-toolbarbutton")) {
			let toolbar = doc.getElementById("zotero-items-toolbar");
			if (toolbar) {
				let btn = doc.createXULElement("toolbarbutton");
				btn.id = "journallens-toolbarbutton";
				btn.classList.add("zotero-tb-button");
				btn.setAttribute("tooltiptext", this.getString("toolbar-tip"));
				btn.style.listStyleImage = 'url("' + this.rootURI + 'icons/toolbar.svg")';
				btn.addEventListener("command", () => this.openFeedWindow(win));
				let search = doc.getElementById("zotero-tb-search")
					|| doc.getElementById("zotero-tb-search-textbox");
				if (search && search.parentElement === toolbar) {
					toolbar.insertBefore(btn, search);
				}
				else {
					toolbar.appendChild(btn);
				}
			}
		}
	},

	removeFromWindow(win) {
		for (let id of ["journallens-menuitem", "journallens-toolbarbutton"]) {
			let el = win.document.getElementById(id);
			if (el) {
				el.remove();
			}
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
			"chrome,resizable,centerscreen,dialog=no,width=1180,height=780",
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

	clearCache() {
		this._cache.clear();
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

	async _getText(url, options = {}) {
		let xhr = await Zotero.HTTP.request("GET", url, {
			headers: options.headers || {},
			timeout: options.timeout || 30000
		});
		return xhr.responseText;
	},

	async _getHTML(url) {
		let xhr = await Zotero.HTTP.request("GET", url, {
			headers: {
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
			},
			timeout: 15000
		});
		return {
			text: xhr.responseText,
			url: xhr.responseURL || url
		};
	},

	_resolveURL(base, value) {
		if (!value || /^data:/i.test(value)) {
			return "";
		}
		try {
			return new URL(value.replace(/&amp;/g, "&"), base).href;
		}
		catch (e) {
			return "";
		}
	},

	_uniqueURLs(urls) {
		let seen = new Set();
		let out = [];
		for (let url of urls) {
			if (!url || seen.has(url)) {
				continue;
			}
			seen.add(url);
			out.push(url);
		}
		return out;
	},

	/* ---------------------------------------------------------- *
	 * Crossref: journal search + recent works
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

	_dateDaysAgo(days) {
		let d = new Date();
		d.setDate(d.getDate() - days);
		return [
			d.getFullYear(),
			String(d.getMonth() + 1).padStart(2, "0"),
			String(d.getDate()).padStart(2, "0")
		].join("-");
	},

	_articleDateValue(article) {
		if (!article.date) {
			return 0;
		}
		let parts = article.date.split("-");
		let normalized = [
			parts[0],
			parts[1] || "01",
			parts[2] || "01"
		].join("-");
		return Date.parse(normalized) || 0;
	},

	async fetchJournalFeed(issn, rows, days) {
		let filters = ["type:journal-article"];
		if (days && days > 0) {
			filters.push("from-pub-date:" + this._dateDaysAgo(days));
		}
		let select = "DOI,title,author,abstract,issued,published,published-online,published-print,container-title,volume,issue,page,URL,link,ISSN";
		let journalURL = "https://api.crossref.org/journals/" + encodeURIComponent(issn)
			+ "/works?sort=published&order=desc&rows=" + rows
			+ "&filter=" + encodeURIComponent(filters.join(","))
			+ "&select=" + select
			+ "&mailto=" + this.CROSSREF_MAILTO;
		let data;
		try {
			data = await this._getJSON(journalURL);
		}
		catch (e) {
			Zotero.debug("JournalLens: Crossref journal endpoint failed for "
				+ issn + ": " + e);
		}
		let items = (data && data.message && data.message.items) || [];
		if (!items.length) {
			let genericURL = "https://api.crossref.org/works?sort=published&order=desc&rows=" + rows
				+ "&filter=" + encodeURIComponent(filters.concat(["issn:" + issn]).join(","))
				+ "&select=" + select
				+ "&mailto=" + this.CROSSREF_MAILTO;
			let fallbackData = await this._getJSON(genericURL);
			items = (fallbackData.message && fallbackData.message.items) || [];
		}
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
				abstractSource: w.abstract ? "crossref" : "",
				url: w.URL || (w.DOI ? "https://doi.org/" + w.DOI : ""),
				fullTextLinks: (w.link || [])
					.map(l => l && l.URL)
					.filter(Boolean),
				pmcid: null,
				pubTypes: [],
				isOpenAccess: false,
				figures: null,
				graphicalAbstract: null
			}));
	},

	/* ---------------------------------------------------------- *
	 * Europe PMC: abstracts, publication types, OA flags, PMCIDs
	 * ---------------------------------------------------------- */

	async enrichWithEuropePMC(articles) {
		let withDOI = articles.filter(a => a.doi);
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
						article.abstractSource = "europepmc";
					}
					article.pmcid = r.pmcid || null;
					article.isOpenAccess = r.isOpenAccess === "Y";
					if (!article.authors && r.authorString) {
						article.authors = r.authorString;
					}
					if (r.pubTypeList && r.pubTypeList.pubType) {
						article.pubTypes = [].concat(r.pubTypeList.pubType)
							.map(t => String(t).toLowerCase());
					}
				}
			}
			catch (e) {
				Zotero.debug("JournalLens: Europe PMC enrichment failed: " + e);
			}
		}
		return articles;
	},

	_decodeEntities(text) {
		return (text || "")
			.replace(/&nbsp;/g, " ")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&amp;/g, "&")
			.replace(/&quot;/g, '"')
			.replace(/&#39;|&apos;/g, "'")
			.replace(/&#(\d+);/g, (m, n) => String.fromCharCode(parseInt(n)))
			.replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16)));
	},

	_normalizeAbstract(text) {
		let value = this._decodeEntities(String(text || ""))
			.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " ")
			.trim()
			.replace(/^Abstract\s*[:.]?\s*/i, "");
		if (value.length < 40) {
			return "";
		}
		if (/^(home|search|privacy|cookie|javascript|sign in|subscribe)\b/i.test(value)) {
			return "";
		}
		return value;
	},

	_tagAttrs(tag) {
		let attrs = {};
		let re = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
		let m;
		while ((m = re.exec(tag))) {
			attrs[m[1].toLowerCase()] = m[3] || m[4] || m[5] || "";
		}
		return attrs;
	},

	_metaAbstractFromHTML(html) {
		let candidates = [
			"citation_abstract", "dc.description", "dcterms.description",
			"description", "og:description", "twitter:description"
		];
		let re = /<meta\b[^>]*>/gi;
		let m;
		while ((m = re.exec(html || ""))) {
			let attrs = this._tagAttrs(m[0]);
			let key = (attrs.name || attrs.property || "").toLowerCase();
			if (candidates.includes(key)) {
				let abstract = this._normalizeAbstract(attrs.content);
				if (abstract) {
					return abstract;
				}
			}
		}
		return "";
	},

	_jsonLDAbstractFromHTML(html) {
		let re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
		let m;
		while ((m = re.exec(html || ""))) {
			try {
				let data = JSON.parse(this._decodeEntities(m[1]).trim());
				let nodes = Array.isArray(data) ? data.slice() : [data];
				for (let i = 0; i < nodes.length; i++) {
					let node = nodes[i];
					if (!node || typeof node !== "object") {
						continue;
					}
					if (Array.isArray(node["@graph"])) {
						nodes.push(...node["@graph"]);
					}
					for (let key of ["abstract", "description"]) {
						let value = node[key];
						if (Array.isArray(value)) {
							value = value.map(v => typeof v === "string" ? v : v && v.text)
								.filter(Boolean).join(" ");
						}
						else if (value && typeof value === "object") {
							value = value.text || value.value || "";
						}
						let abstract = this._normalizeAbstract(value);
						if (abstract) {
							return abstract;
						}
					}
				}
			}
			catch (e) {
				// Ignore malformed publisher JSON-LD.
			}
		}
		return "";
	},

	abstractFromHTML(html) {
		return this._metaAbstractFromHTML(html) || this._jsonLDAbstractFromHTML(html);
	},

	async enrichMissingAbstracts(articles) {
		let missing = articles.filter(a => !a.abstract && (a.url || a.doi)).slice(0, 80);
		for (let article of missing) {
			let pages = await this.getVisualSourcePages(article, { includeUnpaywall: false });
			for (let url of pages) {
				try {
					let page = await this.fetchArticleHTML(url);
					let abstract = this.abstractFromHTML(page.text);
					if (abstract) {
						article.abstract = abstract;
						article.abstractSource = "publisher";
						break;
					}
				}
				catch (e) {
					Zotero.debug("JournalLens: abstract fallback failed for "
						+ url + ": " + e);
				}
			}
		}
		return articles;
	},

	async fetchUnpaywall(doi) {
		if (!doi) {
			return null;
		}
		let url = "https://api.unpaywall.org/v2/" + encodeURIComponent(doi)
			+ "?email=" + encodeURIComponent(this.CROSSREF_MAILTO);
		try {
			return await this._getJSON(url);
		}
		catch (e) {
			Zotero.debug("JournalLens: Unpaywall lookup failed for " + doi + ": " + e);
			return null;
		}
	},

	async getVisualSourcePages(article, options = {}) {
		let urls = [];
		if (article.url) {
			urls.push(article.url);
		}
		if (article.doi) {
			urls.push("https://doi.org/" + article.doi);
		}
		for (let url of article.fullTextLinks || []) {
			urls.push(url);
		}

		let includeUnpaywall = options.includeUnpaywall !== false;
		if (includeUnpaywall && article.doi && article._unpaywall === undefined) {
			article._unpaywall = await this.fetchUnpaywall(article.doi);
		}
		let oa = includeUnpaywall ? article._unpaywall : null;
		if (oa) {
			if (oa.best_oa_location) {
				urls.push(oa.best_oa_location.url_for_landing_page);
				urls.push(oa.best_oa_location.url);
			}
			for (let loc of oa.oa_locations || []) {
				urls.push(loc.url_for_landing_page);
				urls.push(loc.url);
			}
			if (oa.is_oa) {
				article.isOpenAccess = true;
			}
		}
		return this._uniqueURLs(urls)
			.filter(url => !/\.(pdf|zip|docx?|pptx?)([?#].*)?$/i.test(url))
			.slice(0, 5);
	},

	async fetchArticleHTML(url) {
		return this._getHTML(url);
	},

	/* ---------------------------------------------------------- *
	 * Filtering
	 * ---------------------------------------------------------- */

	isBlockedType(article) {
		if (article.pubTypes && article.pubTypes.length) {
			let joined = article.pubTypes.join("; ");
			if (this.PUBTYPE_BLOCK.some(b => joined.includes(b))) {
				return true;
			}
		}
		if (this.TITLE_BLOCK_RE.test(article.title || "")) {
			return true;
		}
		return false;
	},

	filterArticleTypes(articles) {
		return articles.filter(a => !this.isBlockedType(a));
	},

	/**
	 * Keep articles published in the configured recent-day window. Crossref
	 * already applies from-pub-date server-side; this client-side pass protects
	 * against incomplete publisher metadata and cached older responses.
	 */
	filterRecentDays(articles, days) {
		if (!days || days < 1) {
			return articles;
		}
		let cutoff = Date.parse(this._dateDaysAgo(days));
		return articles.filter(a => this._articleDateValue(a) >= cutoff);
	},

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
		if (force) {
			this._cache.delete(issn);
		}
		let cacheMinutes = parseInt(this.getPref("cacheMinutes")) || 60;
		let cached = this._cache.get(issn);
		if (!force && cached && (Date.now() - cached.time) < cacheMinutes * 60000) {
			return cached.articles;
		}
		let rows = parseInt(this.getPref("articlesPerJournal")) || 200;
		let days = parseInt(this.getPref("daysToFetch")) || 7;

		let articles = this.dedupeArticles(await this.fetchJournalFeed(issn, rows, days));
		await this.enrichWithEuropePMC(articles);
		await this.enrichMissingAbstracts(articles);
		if (this.getPref("filterArticleTypes")) {
			articles = this.filterArticleTypes(articles);
		}
		articles = this.filterRecentDays(articles, days);

		this._cache.set(issn, { time: Date.now(), articles });
		return articles;
	},

	/* ---------------------------------------------------------- *
	 * Full-text figures (lazy, OA articles preferred)
	 * ---------------------------------------------------------- */

	async fetchFullTextXML(pmcid) {
		let url = "https://www.ebi.ac.uk/europepmc/webservices/rest/"
			+ encodeURIComponent(pmcid) + "/fullTextXML";
		return this._getText(url);
	},

	figureImageURLs(pmcid, graphicHref) {
		let clean = String(graphicHref || "").replace(/^.*\//, "");
		let stem = clean.replace(/\.(jpg|jpeg|png|gif|webp|tif|tiff)$/i, "");
		let variants = [clean, stem + ".jpg", stem + ".png", stem + ".jpeg", stem + ".gif"];
		let urls = [];
		for (let name of variants) {
			if (!name) {
				continue;
			}
			urls.push("https://europepmc.org/articles/" + pmcid + "/bin/" + name);
			urls.push("https://www.ncbi.nlm.nih.gov/pmc/articles/" + pmcid + "/bin/" + name);
		}
		return this._uniqueURLs(urls);
	},

	/* ---------------------------------------------------------- *
	 * Translation (Google gtx with MyMemory fallback)
	 * ---------------------------------------------------------- */

	detectLang(text) {
		return /[一-鿿]/.test(text || "") ? "zh" : "en";
	},

	getTranslationTarget(text) {
		let src = this.detectLang(text);
		let ui = this.getUILang();
		if (src !== ui) {
			return ui;
		}
		return src === "zh" ? "en" : "zh";
	},

	async translateText(text, target) {
		if (!text || !text.trim()) {
			return text;
		}
		let src = this.detectLang(text);
		if (src === target) {
			return text;
		}
		let provider = this.getPref("translateProvider") || "google";
		let order = provider === "mymemory"
			? ["mymemory", "google"]
			: ["google", "mymemory"];
		let lastErr;
		for (let p of order) {
			try {
				return await this["_translate_" + p](text, target, src);
			}
			catch (e) {
				lastErr = e;
				Zotero.debug("JournalLens: translate via " + p + " failed: " + e);
			}
		}
		throw lastErr || new Error("translation failed");
	},

	async _translate_google(text, target, src) {
		let tl = target === "zh" ? "zh-CN" : "en";
		let sl = src === "zh" ? "zh-CN" : "en";
		let url = "https://translate.googleapis.com/translate_a/single"
			+ "?client=gtx&sl=" + sl + "&tl=" + tl + "&dt=t";
		let xhr = await Zotero.HTTP.request("POST", url, {
			body: "q=" + encodeURIComponent(text),
			headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
			timeout: 30000
		});
		let data = JSON.parse(xhr.responseText);
		if (!data || !data[0]) {
			throw new Error("unexpected response");
		}
		return data[0].map(seg => (seg && seg[0]) || "").join("");
	},

	_chunkText(text, max) {
		let parts = [];
		let s = text;
		while (s.length > max) {
			let cut = s.lastIndexOf(". ", max);
			if (cut < Math.floor(max / 3)) {
				cut = max - 1;
			}
			parts.push(s.slice(0, cut + 1));
			s = s.slice(cut + 1);
		}
		if (s) {
			parts.push(s);
		}
		return parts;
	},

	async _translate_mymemory(text, target, src) {
		let tl = target === "zh" ? "zh-CN" : "en";
		let sl = src === "zh" ? "zh-CN" : "en";
		let out = [];
		for (let chunk of this._chunkText(text, 450)) {
			let url = "https://api.mymemory.translated.net/get?q="
				+ encodeURIComponent(chunk)
				+ "&langpair=" + sl + "|" + tl;
			let data = await this._getJSON(url);
			if (!data.responseData || data.responseData.translatedText == null) {
				throw new Error("unexpected response");
			}
			out.push(data.responseData.translatedText);
		}
		return out.join("");
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
