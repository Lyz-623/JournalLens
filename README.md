<div align="center">

<img src="icons/icon96.png" alt="JournalLens" width="80"/>

# JournalLens

**Follow your favorite journals inside Zotero — see the latest articles with abstracts, real paper figures and captions, and add them to your library in one click.**

在 Zotero 中关注你喜爱的期刊 — 浏览最新文章的摘要、论文正文图片和图注,一键加入文献库。

[![Zotero](https://img.shields.io/badge/Zotero-7%20%7C%208%20%7C%209-blue)](https://www.zotero.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/yunze623/JournalLens)](https://github.com/yunze623/JournalLens/releases)

[English](#-features) | [中文](#-功能介绍)

</div>

---

## ✨ Features

- **Follow journals** — search by journal name or ISSN (powered by Crossref, covers virtually every academic journal in any discipline) and build your own watch list.
- **Latest-issues feed** — a clean, card-based reading window inside Zotero showing the **most recent issues** of each journal (2 by default), merged and sorted by publication date.
- **Research only** — automatically filters out news, editorials, perspectives, corrections and other non-research items, so you see actual articles, reviews, letters, correspondence and protocols.
- **More than titles** — every card shows:
  - 📄 the full **abstract** (expandable),
  - 🖼️ a **thumbnail** from the actual paper — the graphical abstract / TOC image if available, otherwise Figure 1,
  - 🔬 a strip of the paper's **main figures with their captions** — click any figure to view it full-size with the complete caption, so you can tell at a glance what the paper did (open-access articles indexed in Europe PMC).
- **EN ⇄ 中文 translation** — translate any article's title and abstract between English and Chinese with one click.
- **Full bilingual interface** — switch the whole UI between English and 中文 from the toolbar at any time.
- **Quick open** — a 🔭 button in Zotero's main toolbar (next to the search box), plus the Tools menu entry.
- **One-click import** — add any article to your Zotero library by DOI, with full metadata.
- **Open Access badges** — instantly see which papers are freely readable.
- **In-app donation** — PayPal / WeChat / Alipay QR codes built right into the window.
- **Light & dark mode** — matches your system theme.
- **Free forever** — no account, no tracking. If it saves you time, you can [buy me a coffee ♥](DONATE.md).

## 📦 Installation

1. Download the latest `journallens-x.x.x.xpi` from the [Releases page](https://github.com/yunze623/JournalLens/releases).
2. In Zotero, go to **Tools → Plugins**.
3. Click the gear icon ⚙ → **Install Plugin From File…** and choose the downloaded `.xpi`.

> Requires Zotero 7 or later (tested on Zotero 9). Firefox users: right-click the download link and "Save Link As…" so the browser doesn't try to install the file itself.

## 🚀 Usage

1. Open JournalLens via the **🔭 toolbar button** (next to the search box) or **Tools → JournalLens — Journal Feed**.
2. In the left sidebar, type a journal name (e.g. *Nature Methods*) or an ISSN into the **Follow a journal** box and pick a result.
3. Browse the feed:
   - Click a **title** or **Open page** to open the article on the publisher's site.
   - Click **Show more** to read the full abstract.
   - Click a **figure** to view it full-size with its caption.
   - Click **EN / 中** to translate the title and abstract; click **Original** to switch back.
   - Click **Add to Zotero** to save the article (with metadata) to your library.
4. Use the **language dropdown** in the top bar to switch the whole interface between 中文 and English.
5. Click **Refresh** to fetch the newest articles; results are cached for an hour by default.

Settings (interface language, issues to fetch, max articles, cache duration, translation service, type filtering, figure loading) live in **Zotero Settings → JournalLens**.

### How it works

| Data | Source |
|------|--------|
| Latest articles per journal | [Crossref REST API](https://api.crossref.org) (all disciplines) |
| Abstracts, publication type & Open-Access status | [Europe PMC REST API](https://europepmc.org/RestfulWebService) |
| Graphical-abstract / figures & captions | Europe PMC open-access full text (JATS XML) |
| Title / abstract translation | Google translate (keyless) with a MyMemory fallback |

- **Latest issues only**: by default JournalLens keeps the 2 most recent issues per journal (online-first articles count as the newest issue). Adjustable in settings.
- **Type filtering**: items typed as news / editorial / comment / perspective / correction etc. in Europe PMC are hidden. Disable it in settings if you want everything.
- **Figures & thumbnails**: shown for **open-access articles indexed in Europe PMC** (most biomedical and many life-science journals). The thumbnail prefers the graphical abstract / TOC image, falling back to Figure 1. For paywalled articles JournalLens shows title, authors, date and abstract where available (with the journal initials as the thumbnail).
- **Translation in China**: if Google is unreachable, switch the translation service to **MyMemory** in settings.

---

## ✨ 功能介绍

- **关注期刊** — 按期刊名或 ISSN 搜索(基于 Crossref,覆盖几乎所有学科的学术期刊),建立自己的关注列表。
- **最新期数速览** — 在 Zotero 内打开卡片式阅读窗口,只展示各期刊**最新的几期**(默认 2 期),按发表日期聚合排序。
- **只看研究内容** — 自动过滤新闻稿、社论、Perspective、更正等非研究类内容,只保留 Article、Review、Letter、Correspondence、Protocol 等真正的论文。
- **不只是标题** — 每张卡片包含:
  - 📄 完整**摘要**(可展开);
  - 🖼️ 来自论文本身的**缩略图** — 优先使用图文摘要 / TOC 图,没有则用 Figure 1;
  - 🔬 论文**正文主要 Figure 及图注**,点击任意图片可放大查看完整图注,快速判断这篇文章做了什么(开放获取文章,数据来自 Europe PMC)。
- **中英互译** — 一键将文章标题和摘要在中英文之间翻译。
- **全界面中英切换** — 随时从顶栏将整个界面在中文 / English 间切换。
- **快速打开** — Zotero 主工具栏(搜索框旁)有 🔭 按钮,也可从工具菜单进入。
- **一键导入** — 通过 DOI 将文章(含完整元数据)直接存入 Zotero 文献库。
- **OA 标识** — 一眼识别可免费阅读的论文。
- **内置打赏** — 窗口内直接显示 PayPal / 微信 / 支付宝 收款二维码。
- **深色模式** — 跟随系统主题。
- **永久免费** — 无需账号、无任何跟踪。如果它帮你节省了时间,欢迎[打赏支持 ♥](DONATE.md)。

## 📦 安装方法

1. 在 [Releases 页面](https://github.com/yunze623/JournalLens/releases)下载最新的 `journallens-x.x.x.xpi`。
2. 打开 Zotero,进入 **工具 → 插件**。
3. 点击右上角齿轮 ⚙ → **从文件安装插件…**,选择下载的 `.xpi` 文件。

> 需要 Zotero 7 及以上版本(已在 Zotero 9 上测试)。

## 🚀 使用方法

1. 通过主工具栏的 **🔭 按钮**(搜索框旁)或 **工具 → JournalLens — 期刊速览** 打开。
2. 在左侧"添加期刊"框中输入期刊名(如 *Nature Methods*)或 ISSN,点击搜索结果即可关注。
3. 浏览文章流:
   - 点击**标题**或**打开原文**跳转到出版社页面;
   - 点击**展开**阅读完整摘要;
   - 点击**图片**放大查看 Figure 和完整图注;
   - 点击 **EN / 中** 翻译标题和摘要,点击**原文**切换回原文;
   - 点击**添加到 Zotero** 一键保存文献。
4. 用顶栏的**语言下拉框**将整个界面在中文 / English 间切换。
5. 点击**刷新**获取最新文章,默认缓存 1 小时。

设置项(界面语言、抓取期数、每刊最多文章数、缓存时长、翻译服务、类型过滤、是否加载图片)位于 **Zotero 设置 → JournalLens**。

> 📌 缩略图、正文图片和图注来自 Europe PMC 收录的**开放获取**文章(覆盖大部分生物医学及生命科学期刊),优先取图文摘要/TOC,其次取 Figure 1;付费墙文章会显示标题、作者、日期和摘要(若可获得),缩略图用期刊缩写占位。
> 📌 翻译默认使用 Google,若在中国大陆无法访问,可在设置中切换到 **MyMemory**。

---

## ❤️ Support / 打赏

JournalLens is free and open source. If it makes your literature workflow happier, consider supporting development:

JournalLens 完全免费开源。如果它让你的文献工作更轻松,欢迎请作者喝杯咖啡:

**[→ Donate / 打赏方式](DONATE.md)**

## 🛠 Development

```bash
git clone https://github.com/yunze623/JournalLens.git
cd JournalLens
# Build the .xpi
powershell -ExecutionPolicy Bypass -File build.ps1
```

To run from source during development, see the [Zotero plugin development guide](https://www.zotero.org/support/dev/client_coding/plugin_development): create a file named `journallens@yunze623.github.io` in your Zotero profile's `extensions` directory containing the absolute path to this folder, then start Zotero with `-purgecaches`.

## 📄 License

[MIT](LICENSE) © yunze
