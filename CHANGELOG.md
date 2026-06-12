# Changelog / 更新日志

All notable changes to JournalLens are documented here.
本文件记录 JournalLens 的所有重要变更。

The format is based on [Keep a Changelog](https://keepachangelog.com/) and this
project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.3.2] — 2026-06-13

UI, settings and visual-enrichment patch.

### Fixed / 修复
- Replaced the feed-window language dropdown with stable segmented buttons.
  修复中英文切换无法选择、下拉选项重叠的问题。
- Rebuilt the Zotero Settings → JournalLens pane as a valid XHTML settings page
  with working preference bindings. 修复设置页打开后没有任何选项的问题。
- Figure loading now proactively enriches the first visible cards instead of
  relying only on scroll intersection events. 修复部分环境下图片抓取不触发的问题。

### Changed / 变更
- Moved the journal search box to the top of the sidebar, so it stays fixed when
  followed journals grow. 将添加期刊搜索框固定在侧边栏顶部。
- Refined fonts, spacing, colors, focus states and responsive layout while
  keeping the interface simple. 优化字体、间距、颜色与可用性。
- Updated the toolbar icon to a lens + J mark. 主工具栏图标更换为透镜 + J。
- Expanded publisher-page figure parsing with `picture/srcset`, lazy/high-res
  image attributes, JSON-LD, `image_src`, div-based figure containers and
  Crossref full-text links. 增强出版商页面图片与预览图解析。
- Simplified the README while keeping visual feature examples. 精简 README 并保留图文说明。

---

## [0.3.1] — 2026-06-13

Language and figure-extraction patch.

### Fixed / 修复
- Fixed feed-window language switching so the dropdown can follow Zotero again
  and dynamic labels refresh consistently. 修复中英文界面切换和“跟随 Zotero”模式。
- Fixed per-card translation caching; translations are now cached per target
  language instead of reusing one stale result. 修复单篇中英互译缓存错用的问题。

### Changed / 变更
- Figure loading now tries Europe PMC XML first, then falls back to publisher
  pages, DOI landing pages and Unpaywall OA landing pages for graphical
  abstracts, social preview images and high-confidence figure images. 增加出版商页面和 OA 页面图片兜底。
- Cards can now attempt visual enrichment even when an article has no PMCID.
  没有 PMCID 的文章也会尝试抓取预览图。

---

## [0.3.0] — 2026-06-13

Recent-feed update.

### Added / 新增
- **Past-month feed** — each followed journal now fetches papers published in
  the last 30 days by default, using Crossref publication-date filters. 默认抓取每本期刊近 30 天发表的论文。
- **Refreshed payment QR images** — PayPal, WeChat Pay and Alipay images are
  bundled from the local JPG files supplied for this release. 更新内置打赏二维码。

### Changed / 变更
- Default per-journal fetch cap increased from 50 to 200 so high-output journals
  return a fuller month of papers. 每刊默认抓取上限从 50 提高到 200。
- Preferences now expose "Days to fetch" instead of "Issues to fetch". 设置项改为按天数抓取。
- README and visual documentation now describe the past-month workflow. 更新 README 图文说明。

---

## [0.2.0] — 2026-06-13

Major feature release.

### Added / 新增
- **EN ⇄ 中文 translation** for any article's title and abstract, with a per-card
  toggle (Google translate, automatic MyMemory fallback). 文章标题与摘要的中英互译。
- **Full bilingual interface** — switch the entire UI between English and 中文 from
  a dropdown in the top bar, independent of the Zotero locale. 整个界面中英文一键切换。
- **Research-content filtering** — news, editorials, comments, perspectives,
  corrections, errata, etc. are hidden using Europe PMC publication types; keeps
  articles, reviews, letters, correspondence and protocols. 自动过滤非研究类内容。
- **Latest-issues mode** — only the *N* most recent issues per journal are shown
  (default 2; online-first articles count as the newest issue). 仅显示最新 N 期。
- **Graphical-abstract / TOC thumbnails** — the card thumbnail now prefers the
  paper's graphical abstract / TOC image, falling back to Figure 1. 优先使用图文摘要/TOC。
- **In-app donation panel** — PayPal / WeChat / Alipay QR codes shown directly in
  the window. 窗口内置 PayPal / 微信 / 支付宝 打赏二维码。
- **Toolbar quick-open button** — a 🔭 button in Zotero's main toolbar next to the
  search box. 主工具栏快速打开按钮。
- New preferences: interface language, issues to fetch, max articles per journal,
  translation service, research-content filter. 新增多项偏好设置。

### Changed / 变更
- The feed now reads "latest issues" rather than a flat article count.
- Settings pane reorganised and fully localised (EN / 中文).

---

## [0.1.0] — 2026-06-12

Initial release.

### Added / 新增
- Follow journals by name or ISSN (Crossref). 按名称或 ISSN 关注期刊。
- Card-based feed of the latest articles, merged and sorted by date. 卡片式最新文章流。
- Abstracts, open-access badges, and full-text figures with captions for
  open-access articles (Europe PMC). 摘要、OA 标识、正文图片与图注。
- Figure lightbox. 图片放大查看。
- One-click "Add to Zotero" by DOI with full metadata. 一键按 DOI 添加到 Zotero。
- Bilingual (en-US / zh-CN) Fluent localisation, light/dark theme. 中英双语、深色模式。
- Preferences pane, XPI build script, auto-update manifest. 偏好设置、打包脚本、自动更新清单。

[0.3.2]: https://github.com/Lyz-623/JournalLens/releases/tag/v0.3.2
[0.3.1]: https://github.com/Lyz-623/JournalLens/releases/tag/v0.3.1
[0.3.0]: https://github.com/Lyz-623/JournalLens/releases/tag/v0.3.0
[0.2.0]: https://github.com/Lyz-623/JournalLens/releases/tag/v0.2.0
[0.1.0]: https://github.com/Lyz-623/JournalLens/releases/tag/v0.1.0
