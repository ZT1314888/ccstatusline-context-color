#!/usr/bin/env node
// ccstatusline custom-command widget: context usage with threshold colors.
// Reads the statusline JSON payload on stdin, prints "<tokens> (<pct>%)"
// colored green/yellow/red. ccstatusline only keeps the ANSI codes when the
// widget has preserveColors enabled.

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[91m';
const RESET = '\x1b[0m';

// Match ccusage's statusline defaults: green under 50%, yellow under 80%.
const LOW = 50;
const MEDIUM = 80;

function num(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function readStdin() {
    try {
        return require('fs').readFileSync(0, 'utf8');
    } catch {
        return '';
    }
}

// current_usage is either a token total or a per-bucket breakdown. Claude Code
// sends the long `*_input_tokens` names; the short forms are ccstatusline's
// own normalized shape, so accept both.
//
// Output is deliberately excluded, matching ccstatusline's built-in widget
// (`contextLengthTokens = input + creation + read`). Output is this turn's
// reply, which only enters the context on the next request — counting it makes
// the number jump around with reply length instead of growing monotonically.
function contextTokens(usage) {
    if (typeof usage === 'number')
        return num(usage);
    if (!usage || typeof usage !== 'object')
        return 0;
    const input = usage.input_tokens ?? usage.input;
    const creation = usage.cache_creation_input_tokens ?? usage.creation;
    const read = usage.cache_read_input_tokens ?? usage.read;
    return num(input) + num(creation) + num(read);
}

function main() {
    const raw = readStdin();
    if (!raw.trim())
        return;

    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        return;
    }

    const cw = data && data.context_window;
    if (!cw)
        return;

    const used = contextTokens(cw.current_usage);
    const size = num(cw.context_window_size);
    if (!used || !size)
        return;

    // Derive the percentage from the same token count shown, so the two never
    // disagree. Claude Code's used_percentage uses the same formula.
    const pct = Math.min(100, Math.round((used / size) * 100));
    const color = pct >= MEDIUM ? RED : pct >= LOW ? YELLOW : GREEN;

    process.stdout.write(`${color}${used.toLocaleString('en-US')} (${pct}%)${RESET}`);
}

main();
