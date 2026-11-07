# Moonlit Reader — Zotero AI 论文阅读助手

在 Zotero 的 PDF 阅读器里直接获得 **逐句对照翻译**、**AI 论文总结** 和 **AI 重点标注**。
界面参考 Moonlight 的阅读体验：右侧栏承载 AI 结果，原文与译文并排显示，两侧语句互相高亮联动。

```
┌───────────────────────────────────────────────┬──────────────────────┐
│  Zotero 阅读器工具栏   [≡] [−] [+] …   🌙     │  月读 · Moonlit  AI  │
├───────────────────────────────────────────────┤ ┌──────────────────┐ │
│                                               │ │ 总结 │ 翻译 │ 重点 │ │
│   PDF 论文原文（cur 列被压缩以腾出空间）        │ ├──────────────────┤ │
│   Lorem ipsum dolor sit amet, consectetur      │ │ 逐句译文          │ │
│   adipiscing elit …                            │ │ 原文小字对照      │ │
│                                               │ │ …                │ │
└───────────────────────────────────────────────┴──────────────────────┘
```

## 功能

| 功能 | 说明 |
| --- | --- |
| **全文对照翻译** | 逐句翻译整篇论文，右侧栏按阅读顺序排列 |
| **双向同步** | 悬停某句译文 → PDF 立刻描出**该句**（外层浅色框标出整段上下文）并滚动到可读位置；在 PDF 上悬停 → 右侧栏高亮并跟随滚动；滚动译文栏 → 原文自动跟着走。按顺序单调匹配，杜绝"句子串到上一段" |
| **论文总结** | 结构化中文总结（一句话总结 / 研究问题 / 核心方法 / 主要贡献 / 关键结果 / 局限与展望 / 关键术语），长文自动分段归纳再汇总，支持流式输出 |
| **AI 重点标注** | 自动挑出论文中最关键的原句，按「论断 / 方法 / 结果 / 局限 / 背景」分类配色，**直接写入 Zotero 原生高亮注释**（可在 Zotero 自带标注侧栏查看、检索、同步），一键清除 |
| **划词翻译** | 选中任意文本，弹窗中多出「AI 翻译」「AI 解释」两个按钮 |
| **保存为笔记** | 把总结 + 关键点写成一篇真正的 Zotero 笔记（附文献信息与来源标注），可检索、可同步 |
| **进度提示** | 侧栏顶部常驻进度条：解析 PDF、逐句翻译、分段归纳、重点标注都显示当前步骤与 `已完成/总数`，工具栏图标同步呼吸 |
| **用量统计** | 侧栏底部实时显示本篇论文累计 token：`输入 x · 输出 y`，按翻译 / 总结 / 重点 / 划词分类记账；服务商不回传 usage 时自动估算并标注「估算」 |

- 支持任意 **OpenAI 兼容服务**：DeepSeek、OpenAI、Kimi/Moonshot、智谱 GLM、通义千问、SiliconFlow、Ollama（本地）、自定义端点。
- **只有一个入口**：阅读助手弹窗里的三个开关（翻译 / 总结 / 重点）即全部启动方式，打开即开始，关闭即停止并保留已有结果；界面上没有其他「生成/重新生成」按钮。
- **默认全部关闭**（含 AI 重点标注），打开论文时不会自动消耗额度。
- 网络层走 Zotero 的**特权 XHR 栈**（而不是插件沙箱里的 `fetch`），代理、企业网络下更稳，出错时提示里直接给出请求 URL。
- 结果按论文缓存到本地，重新打开论文无需再次消耗 token。
- 深色/浅色主题自适应，中文优先界面（英文系统显示英文）。

## 安装

1. 下载 `dist/moonlit-reader-1.3.0.xpi`（或自行构建，见下文）。
2. Zotero → 工具 → 插件 → 右上角齿轮 → **Install Plugin From File…** → 选择 `.xpi`。
3. 重启 Zotero。

> 兼容 Zotero 7 / 8 / 9 / 10（`strict_min_version: 7.0`）。

> `manifest.json` 里的 `update_url` / `homepage_url` 是占位地址（未启用自动更新），
> 但 Zotero 的清单校验要求它们存在；若你 fork 本插件，请改成自己的地址。

**安装报错排查**：如果 Zotero 提示「无法安装插件…它可能无法与该版本的 Zotero 兼容」，
说明 XPI 的 `manifest.json` 没通过 Zotero 的清单校验。Zotero 的补丁版解析器强制要求
`applications.zotero.update_url`，1.0.1 之前的版本漏了该字段（会得到 `ERROR_CORRUPT_FILE`）。
请使用 **1.0.1 或更新版本**（当前 1.3.0）；自检脚本里的 `devCheckDir` 探针会直接把打包产物交给
AddonManager 校验，输出 `state=3 error=OK isCompatible=true` 才算可安装。

## 配置

Zotero → 设置（偏好设置）→ **Moonlit Reader**：

| 项目 | 说明 |
| --- | --- |
| 服务商 | 选择预设后会带出默认 Base URL 与模型 |
| API Key | 本机保存，仅用于直连所选服务商 |
| Base URL / 模型 | 留空使用预设；自定义服务直接填完整地址 |
| 温度 / 最大 tokens / 并发数 | 翻译建议并发 3、温度 0.3 |
| 测试连接 | 立刻验证 Key 与网络 |

没有 API Key 也可以先用「演示模式（无需 API）」体验完整交互（译文会带 `【演示译文】` 前缀）。

## 使用

1. 打开任意 PDF 论文。
2. 点击阅读器工具栏右侧的 **🌙 图标**，弹出控制面板。
3. 打开需要的开关（三个开关就是全部入口，没有别的按钮）：
   - **全文对照翻译** → 右侧栏开始逐句翻译（可随时停止、复制、跳到原文）
   - **论文总结** → 生成结构化总结
   - **AI 重点标注**（默认关闭）→ 生成重点并写入 Zotero 注释
4. 右侧栏左边缘有拖拽手柄（鼠标移上去会出现琥珀色竖条与点阵，也可以双击复位、
   聚焦后按 `←/→` 微调）：拖动即改变宽度，松手后记住；再次点击图标可关闭面板。
5. 侧栏顶部会显示当前任务与进度，底部实时显示本篇论文的 token 用量。

快捷键与细节：

- 译文卡片悬停 → PDF 对应语句描框；PDF 悬停 → 右侧栏对应段落高亮并自动滚动。
- 每张译文卡片右上角有「跳到原文」「复制」两个小按钮。
- 快捷键：`⌘/Ctrl+Shift+M` 开合右栏，`Esc` 关闭控制面板。
- **关掉再打开不会卡在"已暂停"**：只有被真正打断的运行才标"已暂停"；若请求撞上一次正在收尾的运行，会被排队并在其结束后自动续跑（之前会被静默丢弃，界面一直显示"运行中"却什么都不发生）。
- **滚动不抽搐**：hover 跟随有"舒适区"（目标在视口中段就不动页面）、160–260ms 冷却、程序化滚动期间忽略反向同步；译文栏跳转改为合并 + 定位到栏内 30% 高度，两个方向不再互相触发。
- **hover 命中更宽容**：行间空白、词间距、缩进处都能解析到所属段落（先按句块、再按段包围盒、最后就近 36pt），落在表格/公式/图注等不翻译区域时不再闪灭已有高亮。
- **开关状态按论文独立**：每篇论文的三项开关存在它自己的缓存记录里，换论文不再继承上一篇的"开启"状态（此前会出现"开关是开的、但这篇什么都没跑"，必须关一次再开才生效）。从未用过的论文默认三项全关。
- **按论文清除**：翻译标签页与总结标签页各有一个垃圾桶按钮，**连点两次确认**后只清除**本篇**的译文或总结（不清另一项、也不清 token 计量）。设置里的"清空本地缓存"改为通过插件执行（偏好面板沙箱里无法加载 `IOUtils.sys.mjs`，之前的报错就是这个）。
- **成批 + 带上下文的翻译**：连续段落会打包进同一次请求（默认上限 2200 字符 / 6 段），每次请求附带论文标题、当前章节标题、**前一段与后一段原文**（仅作参考、不要求翻译），并要求模型按条目 id 一一返回 JSON。实测同一篇 103 个翻译单元从 **103 次请求降到 18 次**；术语与指代在两个方向上都保持一致，token 消耗明显下降。返回不完整时自动二分重试（2 段 → 1 段），保证不会写进半截译文。
- **优先翻译当前阅读位置**：批次按"离当前页的距离"排序，先把你正在看的那一页填上，而不是从第 1 页顺序啃到尾。
- **标点优先的分段规则**：句子没写完（不以句末标点结尾）就继续并入下一个正文块——跨缩进、跨栏、甚至跨过排序在中间的图内标签。图注会把自己的换行、"operation." 这类尾行、以及图注续行都吃回来（R1 论文 Figure 1 图注现在是完整的一段 551 字符，而不是两段残句 + 一段正文）。
- **数学公式**：新增 `content/scripts/latex.js`，把译文与总结里的 LaTeX 渲染成 Unicode 与真正的上标/下标（`c_t^{Q}` → cₜ^Q，`\mathbb{R}^{d_c'}` → ℝ^dᶜ′, `\sum_{i=1}^{n}` → ∑ᵢ₌₁ⁿ），先转义再替换，模型输出无法注入标记；以公式符号开头但用于解释符号含义的段落（`where … denotes …`）判定为正文并翻译，不再被当成公式丢弃。
- **跨分页/分栏的句子合并**：段落被分页或分栏切断时（非常常见的译文断裂来源）会自动接回一整句；被接回的后半段在它自己那一页仍可 hover 到同一张卡片。标题换行会合并；`2.1. Image-to-Image Translation` 这类小节标题不再被粘进上一段；图注的续行会并回图注。
- **按段落翻译 + 版面结构识别**：默认以"段"为单位翻译。抽取时先给每个文本块判定角色——标题、作者、摘要、章节标题、正文、图注、表注、表格数据、公式、目录、页眉页脚、脚注、参考文献——只翻译正文类内容；表格只翻表标题，目录/公式/表格数据/页眉一律不翻，避免译文错位。跨行断裂的同一段会自动合并（连字符、缩进、行距、是否句末等线索）。
- **三个功能并行、各自进度**：翻译/总结/划重点可以同时跑，右栏顶部为每个任务单独一行（名称 + 进度条 + 计数），互不覆盖；点击行可切到对应面板。
- **关掉再打开保留进度**：关闭某个开关只会暂停，不会清空已完成的译文/总结/要点；重新打开从断点继续（已完成部分不再消耗 token）。暂停的行显示真实进度，不会停留在"等待模型响应"。
- **网络传输 = 1.0.1 同款 fetch**：请求重新走插件沙箱里的 `fetch`（`response.body` 流式读取），不再依赖特权 `XMLHttpRequest` 的 `onprogress` 分包。个别环境若 `fetch` 不存在会自动回退到 XHR，设置里也能手动切换（`网络传输`）。启动日志会打印 `transport` / `hasFetch` / `hasTextDecoder`。
- **开关即入口**：把三个开关任意一个打开就会**立刻开始**对应工作（翻译全文 / 生成总结 / 划重点），不需要再点第二个按钮；重开论文时开关仍为开的状态会自动续跑（命中缓存则不重复消耗 token）。
- **升级不再丢配置**：Zotero 在升级/降级时会对旧版本调用 `uninstall`（reason 7/8），早先的实现会顺手清空所有 `extensions.zotero.moonlit.*` 偏好——于是每次更新后 key、服务商、模型全部还原成默认值，新版本"看起来坏了"：不发请求、没有进度、没有提示。现在只有真正卸载（reason 6）才清理。
- **请求限速**：网关通常限制每分钟请求数（实测这条 key 是 50 RPM），超限返回 429。插件按"每分钟请求上限"（默认 45）控制节奏，收到 429 会按服务器给的时间等待后重试（流/非流式都适用），并在横幅上显示"触发频率限制，N 秒后自动重试"。
- **配置会自愈**：插件把 `provider/model/Base URL/API Key` 另存一份在 `<数据目录>/moonlit/config.json`（权限 0600）。若某次启动发现这些偏好丢了（Zotero 会用内存重写 prefs.js，别的插件或崩溃都可能造成），会自动还原，并在日志里写 `restored settings from backup`。
- **先看设置里的"实际请求地址"**：它显示插件真正会调用的 URL。如果那里是 `api.openai.com` 而你想用自己的网关，说明 Base URL 被清空了（切换服务商下拉框会清空该输入框），重新填一次即可。
- **失败不再"什么都不显示"**：右栏顶部会保留一条红色失败横幅，写明原因、**请求地址**和排查提示，直到你点 × 关闭或重新运行。
- **连不上/一直 0% 怎么办**：大多数是代理或网关把"流式响应"拦住了。插件会在 15 秒收不到任何数据时自动改用非流式请求（设置里可改 `流式无响应超时`），进度条会显示"等待模型响应…"或"连接不稳定，改用非流式请求…"。若仍失败，打开设置里的 `详细日志` 后重试一次，把 `<数据目录>/moonlit.log` 发出来。
- 推理型模型（deepseek-r1、o 系列、Qwen-thinking 等）会先输出思考内容，若 `最大输出 tokens` 太小就会出现"模型没有返回内容"；插件会自动翻倍重试一次，仍失败请把该值调大。
- 两侧同步由 `extensions.zotero.moonlit.followPdf`（默认开启）控制；手动滚动 PDF 后 1.2 秒内不会自动抢滚动条，避免打断阅读。
- 总结面板右上角的「保存为笔记」会把总结与关键点写入 Zotero 笔记（标签 `Moonlit AI`）。
- 「显示原文」开关控制译文下方是否显示英文原句。

## 数据与隐私

- 缓存位置：`<Zotero 数据目录>/moonlit/<附件 Key>.json`，调试日志在同目录 `moonlit.log`。
- API Key 保存在 Zotero 配置（`extensions.zotero.moonlit.apiKey`），不会发送给除所选服务商以外的任何地方。
- 论文文本仅发送给用户自己配置的 AI 服务商。
- 设置页底部「清空本地缓存」可一键删除。

## 开发

> 开发期用 `node test/dev-install.mjs <profile>` 把插件装进一次性 profile：它会重写
> `extensions.json` 并打开 sideload 开关（`extensions.autoDisableScopes=0`）。
> 该 profile 必须已被 Zotero 初始化过一次；全新 profile 首次仍建议用 Zotero 的
> 「Install Plugin From File…」装一次。

```bash
node build.mjs --unpacked      # 打包 dist/moonlit-reader-<ver>.xpi 并解包
node test/layout.test.mjs      # 几何/引文/句子/排版单元测试（27 项）
node test/harness/run.mjs verify  # 浏览器 UI 数值化审计（46 项断言 + 截图）
DEEPSEEK_API_KEY=sk-... node test/real-api.mjs   # 真实服务商联网测试（10 项）
node test/dev-install.mjs <profileDir>            # 安装到便携测试 profile
```

结构：

```
manifest.json            插件描述（Zotero bootstrap 插件）
bootstrap.js             startup/shutdown，按顺序加载 content/scripts
prefs.js                 默认首选项
content/scripts/
  i18n.js  util.js       i18n 字典、Prefs/Log/工具函数
  layout.js              PDF 文本项 → 行 → 段落（双栏、连字、噪音过滤）
  sentences.js  quotes.js 分句；引文/片段 → PDF 坐标矩形
  ai.js  mock.js  cache.js  OpenAI 兼容客户端（含 SSE 流式）、演示服务、磁盘缓存
  pdfdoc.js              连接 pdf.js：提取全文、坐标映射、命中测试、滚动定位
  overlay.js             跨高亮图层（PDF 侧）
  annotations.js         写入/清除 Zotero 原生高亮注释
  notes.js               把总结与关键点写成 Zotero 笔记
  styles.js icons.js dom.js toast.js  设计系统与基础组件
  translate.js summary.js highlight.js  三个功能视图
  dock.js reader-ui.js   右侧栏抽屉、工具栏按钮与控制面板
  preferences.js selftest.js main.js    设置页、端到端自检、入口
```

自检（开发者）：设置 `extensions.zotero.moonlit.autoSelfTest=true`，并把
`extensions.zotero.moonlit.selfTestPDF` 指向一个 PDF 路径，启动后会自动完成
「导入 PDF → 打开阅读器 → 翻译 → 跨高亮 → 汇总 → 标注 → 清除」全流程校验，
结果写入 `moonlit.log`（含 `[Moonlit][SELFTEST-RESULT] OK n/n`）。

## 验证情况

本插件按「数值化断言」而非肉眼截图验收，三层测试全绿：

| 测试 | 命令 | 结果 |
| --- | --- | --- |
| 几何/引文/分句/排版单元测试（含逐句矩形有序性） | `node test/layout.test.mjs` | 30/30 |
| 源码静态审计（i18n 覆盖、沙箱禁用 API、动效规范、模块加载顺序、默认开关、导出绑定、偏好面板沙箱隔离、跨模块裸调用） | `node test/static.test.mjs` | 22/22 |
| token 记账单元测试（估算、累加、分类、持久化往返） | `node test/usage.test.mjs` | 8/8 |
| 浏览器 UI 审计（真实论文坐标 + 无头 Chromium，3 种宽度 × 明暗主题；含"开关即触发"、并行任务行、暂停保留、竞态续跑、行间 hover、同步不抽搐断言） | `node test/harness/run.mjs verify` | 113/113 |
| 真实服务商联网（DeepSeek，走 XHR 通道） | `node test/real-api.mjs` | 10/10 |
| **真实 Zotero 10.0.7 端到端自检** | 见下文自检 | 53/53（演示与真实 API 各跑一遍） |

端到端自检覆盖：导入 PDF → 打开阅读器 → 工具栏按钮/控制面板 → 全文提取 → 逐句翻译 →
悬停联动描框 → 原文侧命中测试 → 结构化总结 → AI 重点 → 写入/清除 Zotero 原生注释
（位置与排序串合法）→ 保存为笔记 → 划词翻译 → Esc 快捷键 → 设置面板渲染 → 磁盘缓存 →
**拖动侧栏改变宽度（含持久化）** → **只有一个入口（三个开关，无多余生成按钮）** →
**token 计量条** → **进度条出现/消失** → **重点标注默认关闭** →
**悬停译文高亮并滚动原文** → **滚动译文栏带动原文**。

最近一次真实 Zotero 运行的关键读数（可见于 `moonlit.log`）：

```
PASS dragging the handle resizes the dock — 590 → 670
PASS dock keeps the dragged width — 590
PASS dragged width is persisted — pref 590
PASS popover exposes the three switches — 3 switches
PASS popover has no extra action buttons — 0 buttons
PASS token meter reports usage for this paper — 19762 tokens
PASS token meter lists calls and categories — 输入 15k · 输出 4.6k
PASS progress banner appears while a job runs — AI 正在工作 4/10
PASS hovering a translation highlights the original — 10 rects
PASS original scrolls to follow the hovered translation — scrollTop=901 page=1
PASS scrolling the translation column drags the original — pdf=901
PASS preference pane exposes the stall timeout and verbose log — stall=true debug=true
```

自检结果另存为 `<数据目录>/moonlit/selftest.json`（`{"ok":true,"passed":52,"total":52}`），
脱离终端启动 Zotero 时也能拿到报告。

UI 预览（由自动化审计工装真实渲染，非示意图）：

| 对照翻译 | 悬停联动 |
| --- | --- |
| ![翻译](docs/shots/translate.png) | ![悬停](docs/shots/translate-hover.png) |

| 论文总结 | 重点标注 | 控制面板 |
| --- | --- | --- |
| ![总结](docs/shots/summary.png) | ![重点](docs/shots/highlight.png) | ![面板](docs/shots/popover.png) |

## 已知限制

- 扫描版（图片型）PDF 没有文本层，暂不支持（需要 OCR）。
- 极长的论文会按 60k 字符截断用于总结/标注；翻译则分段全部覆盖。
- 译文质量取决于所选模型；建议 DeepSeek-V3 / GPT-4o-mini 及以上。

## 许可

MIT
