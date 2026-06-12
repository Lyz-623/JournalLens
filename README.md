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
- **Latest-article feed** — a clean, card-based reading window inside Zotero showing each journal's most recent papers, merged and sorted by publication date.
- **More than titles** — every card shows:
  - 📄 the full **abstract** (expandable),
  - 🖼️ a **figure thumbnail** taken from the actual paper,
  - 🔬 a strip of the paper's **main figures with their captions** — click any figure to view it full-size with the complete caption (available for open-access articles indexed in Europe PMC).
- **One-click import** — add any article to your Zotero library by DOI, with full metadata.
- **Open Access badges** — instantly see which papers are freely readable.
- **Bilingual UI** — English and 简体中文, follows your Zotero language.
- **Light & dark mode** — matches your system theme.
- **Free forever** — no account, no tracking. If it saves you time, you can [buy me a coffee ♥](DONATE.md).

## 📦 Installation

1. Download the latest `journallens-x.x.x.xpi` from the [Releases page](https://github.com/yunze623/JournalLens/releases).
2. In Zotero, go to **Tools → Plugins**.
3. Click the gear icon ⚙ → **Install Plugin From File…** and choose the downloaded `.xpi`.

> Requires Zotero 7 or later (tested on Zotero 9). Firefox users: right-click the download link and "Save Link As…" so the browser doesn't try to install the file itself.

## 🚀 Usage

1. Open **Tools → JournalLens — Journal Feed**.
2. In the left sidebar, type a journal name (e.g. *Nature Methods*) or an ISSN into the **Follow a journal** box and pick a result.
3. Browse the feed:
   - Click a **title** or **Open page** to open the article on the publisher's site.
   - Click **Show more** to read the full abstract.
   - Click a **figure** to view it full-size with its caption.
   - Click **Add to Zotero** to save the article (with metadata) to your library.
4. Click **Refresh** to fetch the newest articles; results are cached for an hour by default.

Settings (articles per journal, cache duration, figure loading) live in **Zotero Settings → JournalLens**.

### How it works

| Data | Source |
|------|--------|
| Latest articles per journal | [Crossref REST API](https://api.crossref.org) (all disciplines) |
| Abstracts & Open-Access status | [Europe PMC REST API](https://europepmc.org/RestfulWebService) |
| Full-text figures & captions | Europe PMC open-access full text (JATS XML) |

Figures and captions are shown for **open-access articles indexed in Europe PMC** (most biomedical and many life-science journals). For paywalled articles JournalLens shows title, authors, date and abstract where available.

---

## ✨ 功能介绍

- **关注期刊** — 按期刊名或 ISSN 搜索(基于 Crossref,覆盖几乎所有学科的学术期刊),建立自己的关注列表。
- **最新文章流** — 在 Zotero 内打开卡片式阅读窗口,按发表日期聚合展示各期刊的最新论文。
- **不只是标题** — 每张卡片包含:
  - 📄 完整**摘要**(可展开);
  - 🖼️ 来自论文本身的**图片缩略图**;
  - 🔬 论文**正文主要 Figure 及图注**,点击任意图片可放大查看完整图注(开放获取文章,数据来自 Europe PMC)。
- **一键导入** — 通过 DOI 将文章(含完整元数据)直接存入 Zotero 文献库。
- **OA 标识** — 一眼识别可免费阅读的论文。
- **中英双语界面** — 跟随 Zotero 语言设置自动切换。
- **深色模式** — 跟随系统主题。
- **永久免费** — 无需账号、无任何跟踪。如果它帮你节省了时间,欢迎[打赏支持 ♥](DONATE.md)。

## 📦 安装方法

1. 在 [Releases 页面](https://github.com/yunze623/JournalLens/releases)下载最新的 `journallens-x.x.x.xpi`。
2. 打开 Zotero,进入 **工具 → 插件**。
3. 点击右上角齿轮 ⚙ → **从文件安装插件…**,选择下载的 `.xpi` 文件。

> 需要 Zotero 7 及以上版本(已在 Zotero 9 上测试)。

## 🚀 使用方法

1. 打开 **工具 → JournalLens — 期刊速览**。
2. 在左侧"添加期刊"框中输入期刊名(如 *Nature Methods*)或 ISSN,点击搜索结果即可关注。
3. 浏览文章流:
   - 点击**标题**或**打开原文**跳转到出版社页面;
   - 点击**展开**阅读完整摘要;
   - 点击**图片**放大查看 Figure 和完整图注;
   - 点击**添加到 Zotero** 一键保存文献。
4. 点击**刷新**获取最新文章,默认缓存 1 小时。

设置项(每刊文章数、缓存时长、是否加载图片)位于 **Zotero 设置 → JournalLens**。

> 📌 正文图片和图注来自 Europe PMC 收录的**开放获取**文章(覆盖大部分生物医学及生命科学期刊);付费墙文章会显示标题、作者、日期和摘要(若可获得)。

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
