/* global Zotero */
"use strict";

(() => {
	const BRANCH = "extensions.journallens.";

	const STRINGS = {
		en: {
			description: "Follow journals, browse recent papers, translate abstracts and load article figures.",
			language: "Interface language",
			auto: "Follow Zotero",
			days: "Days to fetch",
			articles: "Max articles per journal",
			translate: "Translation service",
			filterGroup: "Content filter",
			filter: "Only show research content",
			figuresGroup: "Figures",
			figures: "Load body and extended figures",
			homepage: "GitHub",
			donate: "Donate"
		},
		zh: {
			description: "关注期刊、浏览近期论文、翻译摘要并加载论文图片。",
			language: "界面语言",
			auto: "跟随 Zotero",
			days: "抓取最近天数",
			articles: "每刊最多文章数",
			translate: "翻译服务",
			filterGroup: "内容过滤",
			filter: "仅显示研究类内容",
			figuresGroup: "论文图片",
			figures: "加载正文图和 Extended Figure",
			homepage: "GitHub",
			donate: "打赏支持"
		}
	};

	function pref(key, fallback) {
		let value = Zotero.Prefs.get(BRANCH + key, true);
		return value === undefined || value === null ? fallback : value;
	}

	function setPref(key, value) {
		Zotero.Prefs.set(BRANCH + key, value, true);
	}

	function el(id) {
		return document.getElementById(id);
	}

	function getLang() {
		let mode = pref("uiLanguage", "auto");
		if (mode === "zh" || mode === "en") {
			return mode;
		}
		return String(Zotero.locale || "en").toLowerCase().startsWith("zh") ? "zh" : "en";
	}

	function applyLabels() {
		let s = STRINGS[getLang()] || STRINGS.en;
		el("pref-description").textContent = s.description;
		el("label-language").textContent = s.language;
		el("pref-language").options[0].textContent = s.auto;
		el("label-days").textContent = s.days;
		el("label-articles").textContent = s.articles;
		el("label-translate").textContent = s.translate;
		el("label-filter").textContent = s.filterGroup;
		el("text-filter").textContent = s.filter;
		el("label-figures").textContent = s.figuresGroup;
		el("text-figures").textContent = s.figures;
		el("pref-homepage").textContent = s.homepage;
		el("pref-donate").textContent = s.donate;
	}

	function bindValue(id, key, fallback, parse = value => value) {
		let input = el(id);
		input.value = pref(key, fallback);
		input.addEventListener("change", () => setPref(key, parse(input.value)));
	}

	function bindChecked(id, key, fallback) {
		let input = el(id);
		input.checked = !!pref(key, fallback);
		input.addEventListener("change", () => setPref(key, input.checked));
	}

	function init() {
		bindValue("pref-language", "uiLanguage", "auto");
		bindValue("pref-days", "daysToFetch", 7, value => Math.max(1, Math.min(180, parseInt(value) || 7)));
		bindValue("pref-articles", "articlesPerJournal", 200, value => Math.max(10, Math.min(500, parseInt(value) || 200)));
		bindValue("pref-translate", "translateProvider", "google");
		bindChecked("pref-filter", "filterArticleTypes", true);
		bindChecked("pref-figures", "loadFigures", true);
		el("pref-language").addEventListener("change", applyLabels);
		el("pref-homepage").addEventListener("click", () => Zotero.launchURL("https://github.com/Lyz-623/JournalLens"));
		el("pref-donate").addEventListener("click", () => Zotero.launchURL("https://github.com/Lyz-623/JournalLens/blob/main/DONATE.md"));
		applyLabels();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	}
	else {
		init();
	}
})();
