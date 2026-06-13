<div align="center">

<img src="docs/banner.svg" alt="JournalLens" width="100%"/>

# JournalLens

[English](#english) | [中文](#中文)

</div>

---

# English

**JournalLens is a Zotero plugin for following journals, scanning recent papers, reading abstracts, viewing validated article figures, translating paper information, and saving papers to Zotero in one click.**

[Latest release](https://github.com/Lyz-623/JournalLens/releases/latest) | [Changelog](CHANGELOG.md) | [Support](DONATE.md)

## Preview

Running in Zotero:

<div align="center">
<img src="docs/journallens-screenshot.png" alt="JournalLens running in Zotero" width="94%"/>
</div>

Workflow:

<div align="center">
<img src="docs/workflow.svg" alt="JournalLens workflow" width="94%"/>
</div>

## What It Does

JournalLens is designed for researchers who already live in Zotero but still need to check journal websites, copy abstracts into translators, inspect figures, and manually import interesting papers. It brings the daily journal-scanning workflow into one Zotero window.

## Highlights

| Feature | Details |
|---|---|
| Journal following | Search by journal name or ISSN through Crossref, then keep a followed-journal list in Zotero. |
| Recent-paper feed | Fetch papers from the last 7 days by default. The range can be changed and saved in settings from 1 to 180 days. |
| Daily feed cache | Reuse the same day's fetched papers after Zotero restarts. The Refresh button always fetches again. |
| Abstract recovery | Use Crossref, Europe PMC, and publisher-page metadata fallbacks when abstracts are missing. |
| Body figures | Show only validated `Fig. N` and `Extended Fig. N` images. Preview images, TOC graphics, and blank thumbnails are filtered out. |
| Feed search | Search loaded titles and abstracts with highlighted matches. |
| Translation | Translate individual titles and abstracts, or translate all loaded papers in one click. |
| One-click import | Add a paper to Zotero by DOI with full metadata. |
| Zotero settings | Configure language, fetch window, translation provider, research-content filtering, and figure loading. |

## Install

1. Download `journallens-0.3.8.xpi` from [Releases](https://github.com/Lyz-623/JournalLens/releases/latest).
2. Open Zotero and go to **Tools -> Plugins**.
3. Click the gear icon and choose **Install Plugin From File...**.
4. Select the downloaded `.xpi`, then restart Zotero if prompted.

Requirements: Zotero 7 or later. If your browser opens the `.xpi` file directly, right-click the release asset and choose **Save link as...**.

## Usage

1. Open JournalLens from the Zotero toolbar button or **Tools -> JournalLens**.
2. Add journals from the search box at the top-left.
3. Choose **All journals** or a specific journal in the sidebar.
4. Scan titles, authors, dates, abstracts, and available figures.
5. Use the title/abstract search box to filter the currently loaded feed.
6. Click **Translate all** to translate all loaded titles and abstracts.
7. Click a figure to open the zoomable viewer, then switch images with previous/next controls.
8. Click **Add to Zotero** to save a paper.
9. Open **Zotero Settings -> JournalLens** to change defaults.

## Figure Loading

JournalLens tries several sources for article figures:

- Europe PMC open-access full-text XML
- Crossref full-text links
- DOI and publisher article pages
- Unpaywall open-access article pages
- article-body or Extended Figure containers exposed in publisher HTML

Figures are displayed only when JournalLens can identify a real `Fig. N` or `Extended Fig. N` label and load a usable image. The plugin keeps source figure numbering, prefers high-resolution image candidates, removes duplicates, and skips blank or low-quality thumbnail results.

Figure loading is best-effort. Open-access articles and public HTML pages usually work best. If a publisher blocks automated access, loads figures dynamically with scripts, or keeps figures only in paid PDFs, JournalLens may only show text information.

## Settings

| Setting | Default |
|---|---:|
| Interface language | Follow Zotero |
| Days to fetch | 7 |
| Max articles per journal | 200 |
| Daily feed cache | On |
| Translation service | Google |
| Research-content filter | On |
| Load figures | On |

## Build

```powershell
git clone https://github.com/Lyz-623/JournalLens.git
cd JournalLens
powershell -ExecutionPolicy Bypass -File build.ps1
```

The packaged plugin will be created at `build/journallens-<version>.xpi`.

## Version Notes

- `0.3.8`: Persistent daily feed cache so reopening Zotero reuses the same day's fetched papers, while Refresh forces a new fetch.
- `0.3.7`: One-click bulk translation for all loaded article titles and abstracts, with progress and one-click return to originals.
- `0.3.6`: Validated real `Fig. N` and `Extended Fig. N` labels, high-resolution figure candidates, blank/duplicate filtering, and a 7-day default fetch window with saved settings.
- `0.3.5`: Publisher-page abstract fallback, Crossref works fallback, body/extended figures only, and `Fig. N` label normalization.
- `0.3.4`: Stale figure-cache cleanup, stronger duplicate removal, caption width wrapping, and centered previous/next figure controls.
- `0.3.3`: In-feed title/abstract search, highlighted matches, deduplicated figures, and a zoomable figure lightbox with previous/next navigation.
- `0.3.2`: UI polish, fixed language switching, fixed settings pane, lens + J toolbar icon, and stronger figure parsing.
- `0.3.1`: Fixed translation cache and added publisher/DOI/Unpaywall visual fallbacks.
- `0.3.0`: Switched to past-month feeds and refreshed donation images.
- `0.2.0`: Added bilingual UI, translation, content filtering, thumbnails, and donation panel.
- `0.1.0`: Initial journal feed, abstracts, OA figures, and Zotero import.

See [CHANGELOG.md](CHANGELOG.md) for details.

## Support

JournalLens is free and open source. If it saves you time, a small tip or a GitHub star helps keep updates coming.

| PayPal | WeChat Pay | Alipay |
|:---:|:---:|:---:|
| <img src="content/donate/paypal.jpg" width="180" alt="PayPal QR"/> | <img src="content/donate/wechat.jpg" width="180" alt="WeChat Pay QR"/> | <img src="content/donate/alipay.jpg" width="180" alt="Alipay QR"/> |

More details: [DONATE.md](DONATE.md)

---

# 中文

**JournalLens 是一个 Zotero 期刊追踪插件，可以在 Zotero 里关注期刊、浏览近期论文、阅读摘要、查看经过校验的正文 Figure、翻译论文信息，并一键保存到文献库。**

[最新版本](https://github.com/Lyz-623/JournalLens/releases/latest) | [更新日志](CHANGELOG.md) | [支持项目](DONATE.md)

## 功能预览

Zotero 运行截图：

<div align="center">
<img src="docs/journallens-screenshot.png" alt="JournalLens 在 Zotero 中运行" width="94%"/>
</div>

工作流程：

<div align="center">
<img src="docs/workflow.svg" alt="JournalLens 工作流程" width="94%"/>
</div>

## 解决什么问题

JournalLens 面向每天需要追踪期刊更新的研究者。你不必频繁打开不同期刊主页，也不必来回复制摘要到翻译器、手动查看 Figure 或再去导入 Zotero。插件把“找新论文、看摘要、看正文主要 Figure、保存文献”放在同一个 Zotero 窗口里。

## 主要功能

| 功能 | 说明 |
|---|---|
| 关注期刊 | 通过 Crossref 按期刊名称或 ISSN 搜索，并在 Zotero 中保存关注列表。 |
| 近期论文流 | 默认抓取近 7 天论文，抓取范围可在设置中保存为 1 到 180 天。 |
| 每日缓存 | 当天抓取过的论文会缓存下来，重启 Zotero 后直接复用；点击刷新按钮会强制重新抓取。 |
| 摘要补全 | 当 Crossref 缺少摘要时，会尝试从 Europe PMC 和出版商页面元数据中补全。 |
| 正文 Figure | 只展示经过校验的 `Fig. N` 和 `Extended Fig. N` 图片，过滤封面图、TOC 图、预览图和空白缩略图。 |
| 文章内搜索 | 在已加载的标题和摘要中搜索，并高亮匹配内容。 |
| 翻译 | 可单独翻译标题和摘要，也可以一键翻译当前加载的全部论文。 |
| 一键导入 | 通过 DOI 将论文及其元数据保存到 Zotero。 |
| Zotero 设置 | 可配置界面语言、抓取范围、翻译服务、研究内容过滤和 Figure 加载。 |

## 安装

1. 从 [Releases](https://github.com/Lyz-623/JournalLens/releases/latest) 下载 `journallens-0.3.8.xpi`。
2. 打开 Zotero，进入 **工具 -> 插件**。
3. 点击齿轮图标，选择 **从文件安装插件...**。
4. 选择下载好的 `.xpi` 文件，并在提示时重启 Zotero。

要求：Zotero 7 或更高版本。如果浏览器直接打开了 `.xpi` 文件，请右键 Release 里的安装包链接，选择“另存为”。

## 使用方式

1. 通过 Zotero 工具栏按钮或 **工具 -> JournalLens** 打开插件。
2. 在左上角搜索框中添加期刊。
3. 在侧栏选择 **全部期刊** 或某一本期刊。
4. 浏览标题、作者、日期、摘要和可用 Figure。
5. 使用标题/摘要搜索框筛选当前加载的论文流。
6. 点击 **翻译全部** 一键翻译当前加载的标题和摘要。
7. 点击 Figure 打开放大查看器，并用上一张/下一张按钮切换图片。
8. 点击 **添加到 Zotero** 保存论文。
9. 打开 **Zotero 设置 -> JournalLens** 修改默认设置。

## 图片说明

JournalLens 会尝试从多个来源获取论文 Figure：

- Europe PMC 开放获取全文 XML
- Crossref 全文链接
- DOI 和出版商文章页面
- Unpaywall 开放获取文章页面
- 出版商 HTML 中的正文 Figure 或 Extended Figure 容器

只有当 JournalLens 能识别真实的 `Fig. N` 或 `Extended Fig. N` 标签，并且图片可以正常加载时，才会展示该 Figure。插件会保留来源中的 Figure 编号，优先选择高清图片候选，去除重复结果，并跳过空白或低质量缩略图。

图片抓取是尽力而为。开放获取文章和公开 HTML 页面通常效果最好。如果出版商屏蔽自动访问、通过脚本动态加载图片，或正文 Figure 只存在于付费 PDF 中，插件可能只能显示文字信息。

## 设置项

| 设置 | 默认值 |
|---|---:|
| 界面语言 | 跟随 Zotero |
| 抓取最近天数 | 7 |
| 每刊最多文章数 | 200 |
| 每日论文缓存 | 开启 |
| 翻译服务 | Google |
| 研究内容过滤 | 开启 |
| 加载 Figure | 开启 |

## 开发构建

```powershell
git clone https://github.com/Lyz-623/JournalLens.git
cd JournalLens
powershell -ExecutionPolicy Bypass -File build.ps1
```

构建后的插件包会生成在 `build/journallens-<version>.xpi`。

## 版本记录

- `0.3.8`：新增持久化每日论文流缓存，同一天重开 Zotero 会复用已抓取论文；点击刷新会强制重新抓取。
- `0.3.7`：新增一键翻译全部标题和摘要，包含进度提示和一键切回原文。
- `0.3.6`：校验真实 `Fig. N` 和 `Extended Fig. N` 标签，优先高清 Figure，过滤空白/重复图片，并将默认抓取范围改为近 7 天。
- `0.3.5`：增加出版商页面摘要兜底、Crossref works 备用入口、正文/Extended Figure 过滤和 `Fig. N` 标签标准化。
- `0.3.4`：清理旧 Figure 缓存，加强去重，修复灯箱图注宽度和上一张/下一张按钮位置。
- `0.3.3`：新增文章流内搜索、高亮匹配、Figure 去重和可缩放灯箱。
- `0.3.2`：优化界面，修复语言切换和设置页，更新工具栏图标并增强 Figure 解析。
- `0.3.1`：修复翻译缓存，并增加出版商、DOI 和 Unpaywall 视觉内容兜底。
- `0.3.0`：改为抓取近一个月论文，并更新打赏图片。
- `0.2.0`：新增双语界面、翻译、内容过滤、缩略图和打赏面板。
- `0.1.0`：初始期刊论文流、摘要、开放获取 Figure 和 Zotero 导入。

更多细节见 [CHANGELOG.md](CHANGELOG.md)。

## 支持项目

JournalLens 免费开源。如果它帮你节省了时间，欢迎 Star 或打赏支持，这会让项目更容易持续更新。

| PayPal | 微信支付 | 支付宝 |
|:---:|:---:|:---:|
| <img src="content/donate/paypal.jpg" width="180" alt="PayPal 二维码"/> | <img src="content/donate/wechat.jpg" width="180" alt="微信支付二维码"/> | <img src="content/donate/alipay.jpg" width="180" alt="支付宝二维码"/> |

更多说明：[DONATE.md](DONATE.md)
