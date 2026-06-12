# Changelog / 更新日志

All notable changes to JournalLens are documented here.
本文件记录 JournalLens 的所有重要变更。

The format is based on [Keep a Changelog](https://keepachangelog.com/) and this
project adheres to [Semantic Versioning](https://semver.org/).

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

[0.2.0]: https://github.com/yunze623/JournalLens/releases/tag/v0.2.0
[0.1.0]: https://github.com/yunze623/JournalLens/releases/tag/v0.1.0
