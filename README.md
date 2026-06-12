<div align="center">

<img src="docs/banner.svg" alt="JournalLens" width="100%"/>

# JournalLens

**A Zotero plugin for following journals, scanning papers from the past month, viewing abstracts and figures, switching EN/中文, and saving papers to Zotero in one click.**

**JournalLens 是一个 Zotero 插件：在 Zotero 内关注期刊、浏览近一个月论文、查看摘要与图片、中英文切换，并一键保存到文献库。**

[Latest release](https://github.com/Lyz-623/JournalLens/releases/latest) · [Changelog](CHANGELOG.md) · [Support](DONATE.md)

</div>

---

## Preview / 功能预览

<div align="center">
<img src="docs/window.svg" alt="JournalLens main window" width="92%"/>
</div>

<div align="center">
<img src="docs/workflow.svg" alt="JournalLens workflow" width="92%"/>
</div>

## Features / 主要功能

- Follow journals by name or ISSN through Crossref.
  通过期刊名或 ISSN 关注期刊。
- Show papers published in the last 30 days by default, sorted across followed journals.
  默认抓取近 30 天发表的论文，并按日期聚合排序。
- Display title, authors, journal, date, abstract, OA badge, preview image and figure strip when available.
  展示标题、作者、期刊、日期、摘要、OA 标识、预览图和可用正文图片。
- Translate titles and abstracts between English and Chinese.
  支持标题与摘要中英互译。
- Filter out obvious non-research content such as news, corrections and editorials.
  可过滤新闻、勘误、社论等非研究内容。
- Add a paper to Zotero by DOI with one click.
  一键按 DOI 添加到 Zotero 文献库。
- Configure language, fetch window, cache, translation provider and figure loading in Zotero Settings.
  可在 Zotero 设置中调整语言、抓取天数、缓存、翻译服务与图片加载。

## Install / 安装

1. Download `journallens-0.3.5.xpi` from [Releases](https://github.com/Lyz-623/JournalLens/releases/latest).
2. Open Zotero → **Tools → Plugins**.
3. Click the gear icon → **Install Plugin From File…** and choose the `.xpi`.

需要 Zotero 7 或更高版本。浏览器如果直接打开 `.xpi`，请右键链接并选择“另存为”。

## Usage / 使用

1. Open JournalLens from the Zotero toolbar button or **Tools → JournalLens**.
2. Use the search box at the top-left to add journals.
3. Browse recent papers, expand abstracts, click figures for a larger view, translate with the EN/中文 control, or open the publisher page.
4. Click **Add to Zotero** to save a paper.
5. Open **Zotero Settings → JournalLens** to change defaults.

## Figure Loading / 图片说明

JournalLens tries several sources for figures and previews:

- Europe PMC open-access full-text XML
- Crossref full-text links
- DOI and publisher article pages
- Unpaywall open-access article pages
- article-body or extended figure containers exposed in publisher HTML

Figure extraction is best-effort. Some publishers block automated HTML access, hide figures behind scripts, or expose only paywalled PDFs, so not every article can show figures.

图片抓取是尽力而为：开放获取文章和公开 HTML 页面效果最好；如果出版商屏蔽自动访问、图片由脚本动态加载，或正文只在付费 PDF 中，插件可能只能显示文字信息。

## Settings / 设置项

| Setting | Default |
|---|---:|
| Interface language / 界面语言 | Follow Zotero |
| Days to fetch / 抓取最近天数 | 30 |
| Max articles per journal / 每刊最多文章数 | 200 |
| Cache duration / 缓存时长 | 60 min |
| Translation service / 翻译服务 | Google |
| Research-content filter / 研究内容过滤 | On |
| Load figures / 加载图片 | On |

## Build / 开发构建

```powershell
git clone https://github.com/Lyz-623/JournalLens.git
cd JournalLens
powershell -ExecutionPolicy Bypass -File build.ps1
```

The packaged plugin will be created at `build/journallens-<version>.xpi`.

## Version Notes / 版本记录

- `0.3.5`: publisher-page abstract fallback, Crossref works fallback, body/extended figures only, `Fig. N` label normalization.
- `0.3.4`: clears stale figure cache, stronger duplicate removal, caption width wrapping, centered previous/next figure controls.
- `0.3.3`: in-feed title/abstract search, highlighted matches, deduplicated figures, zoomable figure lightbox with previous/next navigation.
- `0.3.2`: UI polish, fixed language switching, fixed settings pane, lens + J toolbar icon, stronger figure parsing.
- `0.3.1`: fixed translation cache and added publisher/DOI/Unpaywall visual fallbacks.
- `0.3.0`: switched to past-month feeds and refreshed donation images.
- `0.2.0`: added bilingual UI, translation, content filtering, thumbnails and donation panel.
- `0.1.0`: initial journal feed, abstracts, OA figures and Zotero import.

See [CHANGELOG.md](CHANGELOG.md) for details.

## Support / 支持

JournalLens is free and open source. If it saves time, you can support development through [DONATE.md](DONATE.md) or the in-plugin Donate panel.
