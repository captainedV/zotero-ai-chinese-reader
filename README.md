# Zotero AI 中文阅读助手（插件代号 **moonlit**）

> 用中文读英文论文：在 Zotero 的 PDF 阅读器右栏里就得到 **逐段对照翻译**、**结构化总结** 和 **AI 重点标注**。
> 原文与译文并排、双向高亮联动；只要一个 API Key，数据直连你自己的服务商。

[English summary ↓](#english) · [更新记录](CHANGELOG.md) · [开源许可 MIT](LICENSE)

```
┌───────────────────────────────────────────────┬──────────────────────┐
│  Zotero 阅读器工具栏   [≡] [−] [+] …   🌙     │  AI 中文阅读助手      │
├───────────────────────────────────────────────┤ ┌──────────────────┐ │
│                                               │ │ 总结 │ 翻译 │ 重点 │ │
│   PDF 原始论文                                 │ ├──────────────────┤ │
│   Lorem ipsum dolor sit amet, consectetur      │ │ 逐段中文译文      │ │
│   adipiscing elit …                            │ │ 原文小字对照      │ │
│                                               │ │ 进度 / 用量        │ │
└───────────────────────────────────────────────┴──────────────────────┘
```

## 功能特点

| 功能 | 说明 |
| --- | --- |
| **全文对照翻译** | 默认**按段落**翻译整篇论文（可选逐句），右栏按阅读顺序排列；原文小字对照可开关 |
| **双向高亮联动** | 悬停译文 → PDF 描出对应原文并滚动到可读位置；在 PDF 上悬停 → 右栏高亮对应卡片并跟随滚动；行间空白、缩进处也能命中 |
| **结构化总结** | 一句话总结 / 研究问题 / 核心方法 / 主要贡献 / 关键结果 / 局限与展望 / 关键术语；长文先分段做摘要笔记再汇总，流式输出 |
| **AI 重点标注** | 自动挑出最关键的原文句子，按「论断 / 方法 / 结果 / 局限 / 背景」分类配色，**直接写入 Zotero 原生高亮注释**（Zotero 自己的侧栏可见、可检索、可同步） |
| **划词翻译 / 解释** | 选中任意文本，弹窗里多出「AI 翻译」「AI 解释」两个按钮 |
| **保存为笔记** | 把总结与重点写成一篇真正的 Zotero 笔记（含文献信息与来源标注） |
| **每篇论文独立状态** | 三个开关的状态存在该论文自己的记录里，换论文不继承；可分别清除本篇译文 / 总结 |
| **三任务并行、各自进度** | 翻译 / 总结 / 重点可同时运行，右栏顶部每个任务一行（名称 + 进度条 + 计数），互不覆盖 |
| **token 计量** | 右栏底部实时显示本篇累计用量：`输入 x · 输出 y`，按翻译 / 总结 / 重点 / 划词分类；服务商不回传 usage 时自动估算并标注 |
| 主题与语言 | 深色/浅色自适应；中文界面优先，英文系统显示英文 |

**影响阅读体验的工程细节**：

- **版面结构识别**：抽出文本后先判定每一块的角色——标题、作者、摘要、章节标题、正文、图注、表注、表格数据、公式、目录、页眉页脚、脚注、参考文献——**只翻译正文类内容**。表格只翻表标题，目录/公式/表格数据/页眉不翻，避免译文错位。
- **段落不被切碎**：句子没写完（不以句末标点结尾）就继续并入下一个正文块——跨缩进、跨栏、跨页，甚至跨过夹在中间的图内标签；图注会收回自己的换行与续行。实测三篇论文中"段末被截断"的段落数从 15→2、27→5、11→1（对比见 [docs/segmentation](docs/segmentation/)）。
- **成批 + 带上下文**：连续段落打包进同一次请求（默认 2200 字符 / 6 段），附带论文标题、当前章节标题、前后段原文作为参考，并要求按条目 id 返回 JSON；返回不完整自动二分重试。实测同一篇 103 个翻译单元从 **103 次请求降到 18 次**，术语与指代在两个方向都保持一致。
- **优先当前阅读位置**：批次按离当前页的距离排序，先填你正在看的那一页。
- **数学公式可读**：LaTeX 转成 Unicode 与真正的上下标（`c_t^{Q}` → cₜ^Q，`\mathbb{R}^{d_c'}` → ℝ^dᶜ′，`\sum_{i=1}^{n}` → ∑ᵢ₌₁ⁿ）；先转义再替换，模型输出无法注入标记。以公式符号开头但用于解释符号含义的段落判定为正文并翻译。
- **失败会自己说明**：出错时右栏保留一条红色横幅，写明原因、**实际请求地址**和排查建议；流被代理拦住 15 秒无数据会自动改用非流式；触发 429 会按服务器给的时间等待重试。

## 安装

**推荐：从 Release 下载**

1. 到 [Releases](../../releases/latest) 下载最新的 `moonlit-reader-x.y.z.xpi`。
2. Zotero → 工具（Tools）→ 插件（Add-ons）→ 右上角齿轮 → **Install Plugin From File…** → 选择该 `.xpi`。
3. 重启 Zotero。

- 支持 **Zotero 7 / 8 / 9 / 10**（`strict_min_version: 7.0`），macOS / Windows / Linux。
- 插件 ID 固定为 `moonlit-reader@dsh.local`（`moonlit` 为代号），升级不会丢配置。
- 若提示「无法安装插件…可能无法与该版本的 Zotero 兼容」，请确认下载的是 **1.4.0 或更新版本**（更早的内部构建缺少 `applications.zotero.update_url`，会被 Zotero 判为 `ERROR_CORRUPT_FILE`）。

## 配置

Zotero → 设置 → **AI 中文阅读助手**：

| 项目 | 说明 |
| --- | --- |
| 服务商 | 选预设会带出默认 Base URL 与模型（DeepSeek / OpenAI / Kimi / 智谱 GLM / 通义千问 / SiliconFlow / Ollama / 自定义） |
| API Key | 只保存在本机 Zotero 配置里，仅直连你所选服务商 |
| Base URL / 模型 | 留空用预设；自定义网关直接填完整地址（例如 `https://your-gateway/v1`） |
| 实际请求地址 | 面板里实时显示插件真正会调用的 URL，填错一眼可见 |
| 高级 | 温度（建议 0.3）、最大输出 tokens、并发数（建议 3）、每次请求原文上限、上下文长度、每分钟请求上限、流式输出、传输方式（fetch / 自动回退 XHR） |

**没有 API Key 也能先体验**：设置里选「演示模式（无需 API）」，译文会带 `【演示译文】` 前缀。

## 使用

1. 打开任意 PDF 论文 → 点击工具栏右侧 **🌙** → 弹出控制面板。
2. 三个开关就是全部入口（没有别的"生成"按钮）：

   | 开关 | 打开后 |
   | --- | --- |
   | 全文对照翻译 | 右栏开始翻译，可随时暂停、复制、跳到原文 |
   | 论文总结 | 生成结构化总结，可复制 / 保存为笔记 |
   | AI 重点标注（默认关闭） | 生成重点并写入 Zotero 注释 |

3. 每个开关下方显示它此刻的**真实状态**：`未开启` / `开始` / `正在处理 · 3/9` / `已暂停 · 3/9` / `已完成` / `出错了`。🌙 图标也用忙碌、暂停、出错三种外观同步表示。
4. **关闭开关 = 暂停**：已完成的译文/总结/重点都保留，重新打开从断点继续（已完成部分不再消耗 token）。无法启动时（没配 Key、扫描版 PDF）开关会自动弹回关闭并说明原因。
5. 右栏左边缘可拖拽改宽度（双击复位，聚焦后 `←/→` 微调）；底部显示本篇 token 用量；`⌘/Ctrl+Shift+M` 开合右栏，`Esc` 关闭面板。

**按论文清除**：翻译标签页与总结标签页各有一个垃圾桶按钮，连点两次确认后只清除**本篇**的该项结果。设置里的「清空本地缓存」会清掉所有论文的缓存（保留 Key 备份）。

## 隐私

- 论文文本**只**发送给你自己配置的 AI 服务商；插件没有遥测、没有中转服务器。
- API Key 保存在本机 Zotero 配置（`extensions.zotero.moonlit.apiKey`），另存一份权限 `0600` 的备份用于配置自愈。
- 结果缓存：`<Zotero 数据目录>/moonlit/<附件 Key>.json`；日志：同目录 `moonlit.log`（默认只记关键事件，打开「详细日志」后更详细）。
- 想彻底清空：设置 → 清空本地缓存。卸载插件会清理偏好；**升级**不会（见 CHANGELOG）。

## 兼容性与已知限制

- 扫描版（纯图片）PDF 没有文本层，暂不支持（需要 OCR）。
- 双栏/三栏论文已按栏排序；极端版式（竖排、表格套图、复杂公式排版）仍可能局部错序。
- 极长论文用于总结/标注时按约 60k 字符截断；翻译覆盖全文。
- 译文质量取决于所选模型；建议 DeepSeek-V3 / GPT-4o-mini 及以上。
- 只支持 OpenAI 兼容的 `/chat/completions` 接口（流式或非流式）。

## 常见问题

**一直"等待模型响应…"或 0%？**
多半是代理/网关截断了流式响应。插件 15 秒收不到数据会自动改用非流式（设置里可调「流式无响应超时」），也可以直接把「流式输出」关掉。

**提示 429「每分钟请求超限」？**
网关限流。插件默认按 45 次/分钟节流，并对 429 按服务器给的时间等待重试；可把「每分钟请求上限」调低到网关允许值。

**"模型没有返回内容"？**
推理型模型（deepseek-r1、o 系列、Qwen-thinking）先输出思考内容，`最大输出 tokens` 太小就会没答案。插件会自动翻倍重试一次，仍失败请调大该值。

**提示里的请求地址不是我的网关？**
说明 Base URL 为空。打开设置看「实际请求地址」，把网关地址重新填一次（切换服务商下拉会清空该输入框）。

**想看日志？**
设置里打开「详细日志」，重试一次，把 `<Zotero 数据目录>/moonlit/moonlit.log` 尾部贴到 Issue。

## 开发

```bash
git clone https://github.com/captainedV/zotero-ai-chinese-reader.git
cd zotero-ai-chinese-reader
npm install                  # 仅浏览器审计需要 playwright-core
node build.mjs               # 产出 dist/moonlit-reader-<version>.xpi
node test/dev-install.mjs <一次性 profile 路径>   # 装进测试 profile
```

测试（离线，不需要 API Key）：

| 测试 | 命令 | 结果 |
| --- | --- | --- |
| 版面 / 内容角色 / 跨页合并 / 引用定位 | `node test/layout.test.mjs` | 46/46 |
| 数学公式渲染（上下标、希腊字母、防注入） | `node test/latex.test.mjs` | 10/10 |
| 成批翻译提示词与回报解析 | `node test/prompts-batch.test.mjs` | 6/6 |
| 开关状态 ↔ UI 对齐（11 种状态组合） | `node test/feature-state.test.mjs` | 11/11 |
| 传输韧性 / 429 限速 / token 计量 | `node test/resilience.test.mjs` · `ratelimit` · `usage` | 7 / 5 / 8 |
| 配置备份与升级保留偏好 | `node test/config-backup.test.mjs` · `bootstrap-prefs` | 5 / 5 |
| 源码静态审计（沙箱隔离、i18n、跨模块裸调用等） | `node test/static.test.mjs` | 22/22 |
| 浏览器 UI 审计（无头 Chromium，3 种宽度 × 明暗主题） | `node test/harness/run.mjs verify` | 147/147 |
| 端到端自检（真实 Zotero + 真实 API） | 设置 `extensions.zotero.moonlit.autoSelfTest=true` | 80/80 |

浏览器审计使用占位 PDF 坐标；`node test/segment-dump.mjs <pdf> --pages 8 --out out.md`
可以把任意论文的分段结果导出成 Markdown 做对比。

### 项目结构

```
bootstrap.js                 # 插件入口（脚本加载顺序、升级时保留偏好）
manifest.json                # Zotero 清单（id / 版本 / 更新地址）
prefs.js                     # 默认偏好
content/scripts/
  layout.js                  # 版面分析：行/栏/段落 + 内容角色判定 + 跨页跨栏合并
  pdfdoc.js                  # pdf.js 抽取、几何映射、hover 命中、滚动定位
  sentences.js               # 分句
  latex.js                   # LaTeX → Unicode / 上下标 渲染
  prompts.js                 # 提示词（成批翻译、总结、标注）
  ai.js                      # 传输（fetch，自动回退 XHR）、重试阶梯、限速、用量
  cache.js / usage.js        # 按论文缓存、token 记账
  translate.js / summary.js / highlight.js   # 三个功能视图
  dock.js / reader-ui.js     # 右栏、工具栏按钮、开关状态机
  preferences.js             # 设置面板（独立沙箱，不依赖插件全局）
  selftest.js                # 内置端到端自检
test/                        # 单元测试 + 浏览器审计 + 测试工具
docs/segmentation/           # 分段前后对比（真实论文）
```

## 参与贡献

- 提 Issue 请附：Zotero 版本、服务商/模型、`moonlit.log` 尾部、论文类型（单栏/双栏/扫描版）。
- 欢迎 PR；改动请带上对应测试（离线测试必须全绿），并保持 `node test/static.test.mjs` 通过。

## 许可

[MIT](LICENSE)。插件代号 `moonlit`；插件 ID `moonlit-reader@dsh.local` 保持不变以保证更新连续。

---

<a id="english"></a>
## English

**Zotero AI Chinese Reader** (codename `moonlit`) lets you read English papers in Chinese inside
Zotero's PDF reader: paragraph-level side-by-side translation, a structured summary, and AI
key-point highlights written as native Zotero annotations — all in the right-hand dock, with
two-way hover/scroll linking between the PDF and the translation.

- Bring your own OpenAI-compatible endpoint (DeepSeek, OpenAI, Kimi, GLM, Qwen, SiliconFlow,
  Ollama, or any gateway). No telemetry, no proxy: paper text goes only to the provider you
  configure.
- Layout-aware segmentation (title/abstract/headings/body/captions translated; tables, formulas,
  TOC and running heads skipped), paragraphs re-joined across page and column breaks, LaTeX
  rendered as real sub/superscripts, consecutive paragraphs batched with title/section/neighbour
  context.
- The three switches in the reader toolbar are the only entry points; every feature shows its own
  progress row, keeps its state per paper, and pauses (not resets) when switched off.

Install from [Releases](../../releases/latest) → Zotero → Tools → Add-ons → ⚙ → *Install Plugin
From File…*. Zotero 7+ on macOS, Windows and Linux. MIT licensed.
