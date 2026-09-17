#!/usr/bin/env node
// One-shot installer for the ccstatusline "context-color" widget.
//
//   curl -fsSL <BASE>/install.js | node
//
// Wires ccstatusline up as Claude Code's status line, drops context-color.js
// into the Claude config dir, and adds the widget to the ccstatusline layout.
// Files are backed up before being touched, and a second run is a no-op.
//
// CONTEXT_COLOR_BASE_URL overrides the download base (forks, local testing).

const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = (process.env.CONTEXT_COLOR_BASE_URL
    || 'https://raw.githubusercontent.com/ZT1314888/ccstatusline-context-color/main').replace(/\/+$/, '');

const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const WIDGET = path.join(CLAUDE_DIR, 'context-color.js');
const CLAUDE_SETTINGS = path.join(CLAUDE_DIR, 'settings.json');
// ccstatusline hardcodes this path and ignores CLAUDE_CONFIG_DIR.
const CC_SETTINGS = path.join(os.homedir(), '.config', 'ccstatusline', 'settings.json');

const STATUS_LINE = {
    type: 'command',
    command: 'npx -y ccstatusline@latest',
    padding: 0,
};

// The layout this project ships: "Sonnet 5 | 265,696 (27%) | master (+0, -0)".
const LAYOUT = [
    { id: '1', type: 'model', color: 'yellow' },
    { id: '2', type: 'separator', character: '|' },
    widget('3'),
    { id: '4', type: 'separator', character: '|' },
    { id: '5', type: 'git-branch', color: 'brightGreen' },
    { id: '6', type: 'separator', character: ' ' },
    { id: '7', type: 'git-changes', color: 'yellow' },
];

// Everything except ccstatusline's own `installation` bookkeeping, which is
// per-machine state it fills in on its next run.
const CONFIG = {
    version: 4,
    lines: [LAYOUT, [], []],
    flexMode: 'full-minus-40',
    compactThreshold: 60,
    colorLevel: 3,
    defaultPaddingSide: 'both',
    inheritSeparatorColors: false,
    globalBold: true,
    gitCacheTtlSeconds: 5,
    minimalistMode: true,
};

function widget(id) {
    return {
        id,
        type: 'custom-command',
        // "~" is not expanded on every platform, so use the absolute path,
        // with forward slashes.
        commandPath: `node "${toSlashes(WIDGET)}"`,
        preserveColors: true, // without this ccstatusline strips the ANSI colors
        timeout: 2000,        // the widget reads stdin, leave it some room
    };
}

function toSlashes(p) {
    return p.split(path.sep).join('/');
}

function readJson(file) {
    try {
        // Editors on Windows sometimes leave a UTF-8 BOM behind.
        return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    } catch {
        return null;
    }
}

function writeJson(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

// Keep the pre-install state around, and never overwrite that first backup.
function backup(file) {
    const bak = `${file}.bak`;
    if (!fs.existsSync(file) || fs.existsSync(bak))
        return null;
    fs.copyFileSync(file, bak);
    return `${path.basename(bak)}`;
}

function isOurs(item) {
    return item && item.type === 'custom-command'
        && typeof item.commandPath === 'string' && item.commandPath.includes('context-color.js');
}

async function download() {
    const res = await fetch(`${BASE}/context-color.js`);
    if (!res.ok)
        throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.startsWith('#!/usr/bin/env node'))
        throw new Error('下载到的内容不是脚本，URL 可能被代理或 CDN 改写了');
    return text;
}

function installWidget(source) {
    if (fs.existsSync(WIDGET) && fs.readFileSync(WIDGET, 'utf8') === source)
        return '已是最新，未改动';
    const bak = backup(WIDGET);
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
    fs.writeFileSync(WIDGET, source);
    return bak ? `原文件已备份为 ${bak}` : null;
}

function installStatusLine() {
    const existed = fs.existsSync(CLAUDE_SETTINGS);
    const settings = existed ? readJson(CLAUDE_SETTINGS) : {};
    if (existed && !settings)
        throw new Error(`${CLAUDE_SETTINGS} 不是合法 JSON，已跳过，你的配置未被改动`);

    if (JSON.stringify(settings.statusLine) === JSON.stringify(STATUS_LINE))
        return null;

    const previous = settings.statusLine && settings.statusLine.command;
    const bak = backup(CLAUDE_SETTINGS);
    settings.statusLine = STATUS_LINE;
    writeJson(CLAUDE_SETTINGS, settings);
    return previous
        ? `原状态栏命令 ${JSON.stringify(previous)} 已${bak ? `备份为 ${bak} 并` : ''}替换`
        : null;
}

function installLayout() {
    const existing = readJson(CC_SETTINGS);

    if (existing && Array.isArray(existing.lines)) {
        if (!Array.isArray(existing.lines[0]))
            existing.lines[0] = [];
        const line = existing.lines[0];

        const ours = line.find(isOurs);
        if (ours) {
            const updated = widget(ours.id);
            if (JSON.stringify(ours) === JSON.stringify(updated))
                return null;
            const bak = backup(CC_SETTINGS);
            Object.assign(ours, updated);
            writeJson(CC_SETTINGS, existing);
            return `widget 已存在，只刷新了脚本路径${bak ? `，备份为 ${bak}` : ''}`;
        }

        // Someone else's layout: slot the widget in after the model and leave
        // the rest of their widgets alone.
        const at = line.findIndex((item) => item && item.type === 'model');
        const insertAt = at === -1 ? line.length : at + 1;
        let next = line.reduce((max, item) => Math.max(max, parseInt(item && item.id, 10) || 0), 0) + 1;
        const insert = [];
        if (!(line[insertAt] && line[insertAt].type === 'separator'))
            insert.push({ id: String(next++), type: 'separator', character: '|' });
        insert.push(widget(String(next++)));
        line.splice(insertAt, 0, ...insert);

        const bak = backup(CC_SETTINGS);
        writeJson(CC_SETTINGS, existing);
        return `已插入 widget，你原有的布局保持不变${bak ? `，备份为 ${bak}` : ''}`;
    }

    const bak = backup(CC_SETTINGS);
    writeJson(CC_SETTINGS, CONFIG);
    return bak ? `已写入本项目的布局，原文件备份为 ${bak}` : '已写入本项目的布局（新建）';
}

function report(ok, label, detail) {
    console.log(`  ${ok ? '✓' : '✗'} ${label}`);
    if (detail)
        console.log(`      ${detail}`);
}

async function main() {
    console.log('\n  context-color · ccstatusline 上下文占用 widget\n');

    let source;
    try {
        source = await download();
        report(true, `下载 context-color.js（${source.length} 字节）`);
    } catch (e) {
        report(false, '下载 context-color.js', e.message);
        console.log('');
        process.exitCode = 1;
        return;
    }

    let failed = 0;
    const steps = [
        [`安装脚本到 ${WIDGET}`, () => installWidget(source)],
        ['配置 Claude Code 状态栏', installStatusLine],
        ['配置 ccstatusline 布局', installLayout],
    ];

    for (const [label, run] of steps) {
        try {
            report(true, label, run());
        } catch (e) {
            report(false, label, e.message);
            failed++;
        }
    }

    console.log('');
    if (failed) {
        process.exitCode = 1;
        console.log('  有步骤未成功，请对照上面的提示处理后再试。\n');
    } else {
        console.log('  重启 Claude Code 即可看到状态栏。\n');
    }
}

main().catch((e) => {
    console.error(`\n  ✗ ${e.message}\n`);
    process.exitCode = 1;
});
