# ccstatusline-context-color

在 [ccstatusline](https://github.com/sirmalloc/ccstatusline) 之上扩展的 Claude Code 状态栏配置。
核心是一个零依赖的 Node 脚本，让状态栏显示**上下文 token 占用 + 百分比**，并按阈值自动变色。

```
Sonnet 5 | 265,696 (27%) | master (+0, -0)
```

中间那段 `265,696 (27%)` 就是这个脚本的输出：

- **`265,696`** —— 当前上下文实际占用的 token 数
- **`27%`** —— 占上下文窗口的比例
- **颜色** —— 绿（<50%）／黄（50–79%）／红（≥80%）自动切换

---

## 安装

### 方式一：一行命令（推荐）

装好 ccstatusline、把脚本放进 Claude 配置目录、并把 widget 拼进状态栏布局，三步一次做完。

**macOS / Linux / Git Bash**

```bash
curl -fsSL https://raw.githubusercontent.com/ZT1314888/ccstatusline-context-color/main/install.js | node
```

**Windows PowerShell**

```powershell
curl.exe -fsSL https://raw.githubusercontent.com/ZT1314888/ccstatusline-context-color/main/install.js -o "$env:TEMP\cc-install.js"; node "$env:TEMP\cc-install.js"
```

> **Windows 上不要写成 `irm ... | node` 或 `curl ... | node`。**
> Windows PowerShell 5.1 在把源码管进 `node` 之前会先按 `$OutputEncoding`（默认 ASCII）做一次文本转码：
> 用 `irm` 时中文全变成 `?`，用 `curl` 时 gb2312 往返转码甚至会把字符串的收尾引号吞掉，
> 直接导致 `SyntaxError`、安装器根本跑不起来。
> `curl.exe -o` 落盘是二进制写入，源码逐字节送达，这一步不能省。

**raw 不通时换镜像。** `raw.githubusercontent.com` 在部分网络下会被直接屏蔽，
把上面命令里的这段基址

```
https://raw.githubusercontent.com/ZT1314888/ccstatusline-context-color/main
```

整体替换成 jsDelivr 镜像（已实测可用）即可：

```bash
curl -fsSL https://cdn.jsdelivr.net/gh/ZT1314888/ccstatusline-context-color@main/install.js | node
```

> 注意：这一步替换只影响**拉取 install.js 本身**。install.js 内部下载 widget 时会自己
> 依次尝试 raw 与 jsDelivr，不需要你再管。

装完重启 Claude Code 即可。安装器只做三件事，且每一步都可回退：

| 动作 | 目标文件 | 说明 |
| --- | --- | --- |
| 安装脚本 | `<Claude 配置目录>/context-color.js` | 从本仓库下载 |
| 接入状态栏 | `<Claude 配置目录>/settings.json` | 写入 `statusLine`，**其余设置原样保留** |
| 写入布局 | `~/.config/ccstatusline/settings.json` | 见下方「已有配置会怎样」 |

**已有配置会怎样**

- 没装过 ccstatusline → 写入本项目的完整布局，你会得到和上面预览一模一样的外观。
- 已有自己的布局 → **不覆盖**，只把 widget 插到 model 后面，其余 widget 一个不动。
- 任何被改动的文件都会先备份成同目录下的 `.bak`（只备份首次安装前的那一份，重复运行不会覆盖它）。

安装器是幂等的，重复运行是彻底的 no-op：不会重复插入 widget，也不会改动任何字节。

**走了代理的同学注意**：node 的原生 `fetch` **不读** `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY`，
所以会出现「`curl` 能下、安装器却下不动」的怪现象。Node 24 及以上可以打开 `NODE_USE_ENV_PROXY=1`
让它走代理——注意这个变量要加在 `node` 一侧，加在 `curl` 上不起作用：

```bash
curl -fsSL https://raw.githubusercontent.com/ZT1314888/ccstatusline-context-color/main/install.js | NODE_USE_ENV_PROXY=1 node
```

**完全离线**：把 `context-color.js` 和 `install.js` 先下载到本地，再
`CONTEXT_COLOR_BASE_URL=<本地目录的 file:// 或 http:// 地址> node install.js`。

### 方式二：手动配置

不想跑安装器就照下面三步手动做，效果完全一致。参考 [§手动配置](#手动配置)。

---

## 为什么需要它

ccstatusline 自带的 context widget 无法同时满足下面三点，这正是本方案存在的理由：

| 需求 | 内置 widget | 本脚本 |
| --- | --- | --- |
| 显示完整数字 `265,696` | ✗ 只能 `265.7k`（`formatTokens()` 对 ≥1000 无条件缩写） | ✓ |
| token 数与百分比同框 | ✗ 必须拆成两个 widget | ✓ |
| 阈值配色（绿/黄/红） | ✗ ccstatusline 没有任何条件着色功能 | ✓ |

---

## 项目结构

```
ccstatusline-context-color/
├── context-color.js   # widget 本体，被 ccstatusline 调用
├── install.js         # 一键安装器
├── README.md
└── LICENSE            # Apache-2.0
```

---

## 前置要求

| 项 | 要求 |
| --- | --- |
| Node.js | ≥ 18（安装器和脚本都只用标准库，无第三方依赖） |
| Claude Code | 任意近期版本 |
| ccstatusline | 2.2.29 验证通过（通过 `npx` 拉取，无需预装） |

---

## 手动配置

不想跑安装器就照下面四步手动来，效果和一行命令完全一致。

> **只把 `statusLine` 加进 `settings.json` 是不够的。**
> 那只让状态栏跑起来，渲染的是 ccstatusline 自己的**默认布局**（模型名、目录之类），
> 不包含本项目的 token 计数与阈值配色。想要预览里那个 `265,696 (27%)`，下面三样缺一不可：
>
> | # | 做什么 | 作用 |
> | --- | --- | --- |
> | 1 | `settings.json` 里加 `statusLine` 指向 ccstatusline | 让状态栏跑起来 |
> | 2 | 把 `context-color.js` 放进 Claude 配置目录 | 提供那段带颜色的数字 |
> | 3 | ccstatusline 配置里加一条 `custom-command` widget 指向它 | 把它拼进布局 |
>
> 漏掉第 2 或第 3 步，状态栏都只是 ccstatusline 的默认样子。

### 1. 把 ccstatusline 设为状态栏

编辑 Claude Code 的用户级配置 `<Claude 配置目录>/settings.json`
（Windows：`C:\Users\<用户名>\.claude\settings.json`），加入：

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y ccstatusline@latest",
    "padding": 0
  }
}
```

> `npx -y` 会在首次调用时自动下载 ccstatusline，之后走缓存。这里不锁定版本，以便跟随上游更新。
> 若设置了 `CLAUDE_CONFIG_DIR`，Claude Code 的配置目录跟随该变量；ccstatusline 则固定读 `~/.config/ccstatusline/`，两者互不影响。

### 2. 安装 context-color.js

把 `context-color.js` 放到 Claude 配置目录下。

```bash
curl -fsSL https://raw.githubusercontent.com/ZT1314888/ccstatusline-context-color/main/context-color.js \
  -o ~/.claude/context-color.js
```

raw 被屏蔽时，把域名部分换成 jsDelivr 即可：

```bash
curl -fsSL https://cdn.jsdelivr.net/gh/ZT1314888/ccstatusline-context-color@main/context-color.js \
  -o ~/.claude/context-color.js
```

> 该脚本**不会**被自动执行，只有 ccstatusline 在渲染状态栏时才会调用它，所以不需要 `chmod +x`。

### 3. 配置 widget 布局

编辑 ccstatusline 的配置文件 `~/.config/ccstatusline/settings.json`
（Windows：`C:\Users\<用户名>\.config\ccstatusline\settings.json`）。

如果该文件不存在，先跑一次 `npx -y ccstatusline@latest` 让它生成默认配置。

把 `lines` 的第一行改成下面这样（关键是那个 `custom-command` widget）：

```json
{
  "version": 4,
  "lines": [
    [
      { "id": "1", "type": "model", "color": "yellow" },
      { "id": "2", "type": "separator", "character": "|" },
      {
        "id": "3",
        "type": "custom-command",
        "commandPath": "node \"C:/Users/你的用户名/.claude/context-color.js\"",
        "preserveColors": true,
        "timeout": 2000
      },
      { "id": "4", "type": "separator", "character": "|" },
      { "id": "5", "type": "git-branch", "color": "brightGreen" },
      { "id": "6", "type": "separator", "character": " " },
      { "id": "7", "type": "git-changes", "color": "yellow" }
    ],
    [],
    []
  ],
  "flexMode": "full-minus-40",
  "compactThreshold": 60,
  "colorLevel": 3,
  "defaultPaddingSide": "both",
  "inheritSeparatorColors": false,
  "globalBold": true,
  "gitCacheTtlSeconds": 5,
  "minimalistMode": true
}
```

三个**必须**注意的字段：

- **`preserveColors: true`** —— 没有它，ccstatusline 会剥掉脚本输出的 ANSI 转义序列，颜色全部失效。
- **`timeout`** —— 脚本要读 stdin，给个 2000ms 的余量。
- **`colorLevel: 3`** —— 24 位真彩色档位，缺了颜色会降级。

**路径要写绝对路径**：`commandPath` 里的 `~` 不一定被展开，Windows 上尤其不可靠。
用正斜杠写绝对路径最稳（安装器就是这么做的）：

```
"commandPath": "node \"C:/Users/你的用户名/.claude/context-color.js\""
```

### 4. 验证

重启 Claude Code，状态栏中间应出现形如 `265,696 (27%)` 的片段。

单独测脚本（不经过 ccstatusline），模拟一份 payload：

```bash
echo '{"context_window":{"context_window_size":1000000,"current_usage":{"input_tokens":224,"cache_read_input_tokens":265472,"cache_creation_input_tokens":0}}}' \
  | node ~/.claude/context-color.js
```

预期输出：`265,696 (27%)`，带绿色 ANSI 转义。

---

## 工作原理

### statusline payload

Claude Code 每次刷新状态栏时，会把一份 JSON 从 **stdin** 传给 `statusLine.command`。与本脚本相关的字段：

```jsonc
{
  "context_window": {
    "context_window_size": 1000000,        // 上下文窗口总大小
    "current_usage": {                     // 最近一次 API 调用的用量
      "input_tokens": 224,
      "cache_creation_input_tokens": 0,
      "cache_read_input_tokens": 265472,
      "output_tokens": 171
    },
    "used_percentage": 27,                 // Claude Code 自己算的百分比
    "remaining_percentage": 73
  }
}
```

### 计数公式

```
used = input_tokens + cache_creation_input_tokens + cache_read_input_tokens
```

这三项相加就是**这一次请求实际发出去的完整 prompt 长度**。API 的语义是：

- `input_tokens` —— 未命中缓存、需全价处理的部分
- `cache_creation_input_tokens` —— 本次写入缓存的部分
- `cache_read_input_tokens` —— 命中缓存、复用的部分

三者互不重叠，加起来即 prompt 全量。

### 为什么排除 output_tokens

`output_tokens` 是**本轮回复**的长度，它要到**下一次**请求才会进入上下文。如果算进去，数字会随回复长短上下跳动，而不是单调增长——状态栏会显得很吵。

这一点和 ccstatusline 内置的 `context-length` widget 做法一致，两者用的都是 `input + creation + read`。

### 百分比的分母

脚本用它**自己显示的 token 数**除以 `context_window_size`，保证数字和百分比永远自洽：

```js
const pct = Math.min(100, Math.round((used / size) * 100));
```

分母是**完整窗口**（1M 模型即 `1000000`），不是打了折的「可用额度」。

> **勘误**：早期版本的脚本里，这一行上方写着 "Claude Code's own used_percentage covers a different total"。
> 这个说法**不成立**。Claude Code 二进制内部的实现是：
>
> ```js
> function QFt(e, n) {
>   let r = e.input_tokens + e.cache_creation_input_tokens + e.cache_read_input_tokens,
>       s = Math.round(r / n * 100),
>       d = Math.min(100, Math.max(0, s));
>   return { used: d, remaining: 100 - d };
> }
> ```
>
> 与脚本**逐字节等价**——同样排除 output、同样用满窗口当分母、同样 clamp 到 `[0,100]`。
> 也就是说脚本算出的 `27%` 与 payload 里的 `used_percentage` 字段恒等，后者其实可以直接读来用。
> 本仓库的脚本已按此修正注释。

容易混淆的是 ccstatusline 内置的 **`context-percentage-usable`** widget，它用的分母是 `context_window_size × 0.8`（源码常量 `USABLE_CONTEXT_RATIO = 0.8`），同一个 265,696 会显示 33.2%。那是 ccstatusline 自己的启发式，不是 Claude Code 的口径。

### 阈值配色

```js
const LOW = 50;      // ≥50% 转黄
const MEDIUM = 80;   // ≥80% 转红
```

配色沿用 ccusage 的 statusline 默认阈值。靠 `preserveColors: true` 让 ANSI 转义序列穿透 ccstatusline。

因为百分比是**先四舍五入再比阈值**，499,999 会显示成 `50%` 并转黄。这不是 bug——颜色始终跟着屏幕上显示的数字走，两者不会自相矛盾。

### 完整源码

见 [`context-color.js`](./context-color.js)。

---

## 开发指南

### 调整阈值

改 `context-color.js` 顶部的两个常量即可：

```js
const LOW = 50;      // 希望更早警示就调小，例如 40
const MEDIUM = 80;   // 希望更早报警就调小，例如 70
```

### 换配色 / 加样式

ANSI 前景色码，按需替换：

| 常量 | 码 | 效果 |
| --- | --- | --- |
| `GREEN` | `\x1b[32m` | 绿 |
| `YELLOW` | `\x1b[33m` | 黄 |
| `RED` | `\x1b[91m` | 亮红 |
| — | `\x1b[1m` | 加粗 |
| — | `\x1b[2m` | 暗色 |
| `RESET` | `\x1b[0m` | 重置（**必须**保留在输出末尾） |

### 写一个新的 custom-command widget

任何读 stdin、往 stdout 写文本的程序都可以当 widget。最小骨架：

```js
#!/usr/bin/env node
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
    const data = JSON.parse(raw);
    process.stdout.write(`\x1b[36m${data.model?.display_name ?? 'unknown'}\x1b[0m`);
});
```

然后在 ccstatusline 配置里加一条：

```json
{
  "id": "8",
  "type": "custom-command",
  "commandPath": "node \"C:/path/to/your-widget.js\"",
  "preserveColors": true,
  "timeout": 2000
}
```

要点：

- **读 stdin 有两种写法**：`fs.readFileSync(0, 'utf8')`（同步，本脚本用这种）或流式监听 `end` 事件。前者更短，后者对超大 payload 更稳。
- **必须有超时兜底**：payload 缺失、JSON 解析失败、字段不存在时应当**静默返回**（不输出任何东西），而不是抛错。抛错会让状态栏该段显示异常。本脚本里那几处 `return;` 就是干这个的。
- **`preserveColors: true` 是颜色生效的前提**，漏了就只有纯文本。

### 能力边界：哪些能用配置做，哪些不能

ccstatusline 的 widget 配置 schema（`WidgetItemSchema`）只提供这些字段：

```
id, type, color, backgroundColor, bold, dim, numberFormat, character,
rawValue, customText, customSymbol, commandPath, maxWidth,
preserveColors, timeout, merge, excludeFromAutoAlign, metadata
```

据此可以判断：

| 想做的事 | 纯配置能否做到 | 说明 |
| --- | --- | --- |
| 显示上下文 token 数 | ✓ | `type: "context-length"`，数值与脚本一致 |
| 显示上下文百分比 | ✓ | `type: "context-percentage"`（满窗口分母，与官方一致） |
| 千分位完整数字 `265,696` | ✗ | `formatTokens()` 对 ≥1000 强制缩写为 `k` |
| token 与百分比合并成一个 widget | ✗ | 只能并列两个 widget |
| 按数值条件着色 | ✗ | 无任何 `autoColor` / `threshold` 类功能，`color` 只能填静态值 |
| 显示分隔符、自定义文本/符号 | ✓ | `separator` / `custom-text` / `custom-symbol` |

**规律**：数值计算类需求多半能用内置 widget；**展示形式和条件逻辑**则必须落到 `custom-command` 脚本里。

---

## 升级与兼容性

本方案**没有修改 ccstatusline 的源码**，全部依赖官方公开能力：

- `custom-command` 是官方 widget 类型（`commandPath` / `preserveColors` / `timeout` 都是 stock 字段）
- `context-color.js` 是独立进程，通过 stdin/stdout 与 ccstatusline 通信

因此：

- `npx -y ccstatusline@latest` 可以放心跟随上游更新，**不存在需要 rebase 的 fork 分支**
- 唯一的耦合点是 **statusline payload 的字段名**（`context_window.current_usage.*`）。脚本已经同时兼容长名（`input_tokens`）和短名（`input`）两种形态；若上游改字段名，改 `contextTokens()` 一个函数即可

---

## 排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 该段完全不显示 | 脚本路径不对，或 Node 不在 PATH | 把 `commandPath` 改成绝对路径并显式调用 `node` |
| 显示了但没有颜色 | 漏了 `preserveColors: true` | 在 widget 配置里补上 |
| 状态栏变慢/卡顿 | 脚本没在异常路径上提前 return | 确认所有失败分支都是静默 `return`，不要抛错 |
| 百分比与 `/context` 对不上 | 与 `context-percentage-usable` 对比了 | 那个 widget 用 `×0.8` 的分母；本脚本与官方 `used_percentage` 一致 |
| 单独跑脚本没输出 | 没喂 stdin | 参考「手动安装 4. 验证」的 echo 管道测试 |
| 状态栏整个回到默认外观 | 配置不符合 ccstatusline 的 schema，它会**静默**回退到内存默认值且不覆盖文件 | 检查 `~/.config/ccstatusline/settings.json` 是否是合法 JSON、`lines` 是否为二维数组 |

---

## 参考

- ccstatusline：<https://github.com/sirmalloc/ccstatusline>
- Claude Code 状态栏文档：<https://docs.claude.com/en/docs/claude-code/statusline>
